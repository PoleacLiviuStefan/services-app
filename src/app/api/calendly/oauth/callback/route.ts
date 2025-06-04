// File: app/api/calendly/oauth/callback/route.ts

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Folosim variabila de mediu NEXT_PUBLIC_BASE_URL definită astfel:
//   • În .env.local (dev):     NEXT_PUBLIC_BASE_URL=http://localhost:3000
//   • În producție (setată pe platformă): NEXT_PUBLIC_BASE_URL=https://mysticgold.app
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;
if (!BASE_URL) {
  throw new Error('Variabila de mediu NEXT_PUBLIC_BASE_URL nu este definită.');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code  = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // ar trebui să fie “calendly:<providerId>”

    // 1. Dacă Calendly a trimis un error
    if (error) {
      console.error('Calendly OAuth error (returned by provider):', error);
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=${encodeURIComponent(error)}`
      );
    }

    // 2. Lipsă parametri 'code' sau 'state'
    if (!code || !state) {
      console.error('Missing parameter: code sau state în URL.');
      return NextResponse.json(
        { error: 'Missing parameter: code or state' },
        { status: 400 }
      );
    }

    // 3. Extragem providerId din state (format: "calendly:<providerId>")
    const providerId = state.replace('calendly:', '');
    console.log('› providerId extras din state:', providerId);

    // 4. Verificăm în baza de date dacă provider-ul există
    const existing = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, calendlyCalendarUri: true },
    });
    console.log('› Găsit în DB (înainte de update):', existing);

    if (!existing) {
      console.error('Provider cu id-ul acesta nu există în DB:', providerId);
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=provider_not_found`
      );
    }

    // 5. Extragem code_verifier din cookie (setat anterior la inițierea autorizării)
    const codeVerifier = req.cookies.get('calendly_code_verifier')?.value;
    if (!codeVerifier) {
      console.error('Missing code_verifier în cookie.');
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=missing_code_verifier`
      );
    }

    // 6. Facem POST la Calendly pentru a schimba 'code' cu un 'access_token'
    const clientId     = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET!;
    const form = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri:  `${BASE_URL}/api/calendly/oauth/callback`,
      code_verifier: codeVerifier,
    });

    const tokenResp = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const bodyText = await tokenResp.text();
    if (!tokenResp.ok) {
      console.error('Calendly token error:', tokenResp.status, bodyText);
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=${encodeURIComponent(bodyText)}`
      );
    }

    const tokenData = JSON.parse(bodyText);
    console.log('› tokenData primit:', JSON.stringify(tokenData, null, 2));

    const accessToken = tokenData.access_token;
    const userUri     = tokenData.owner; // ex: "https://api.calendly.com/users/…"
    console.log('› owner (userUri) extras din tokenData:', userUri);

    if (!userUri) {
      console.error('owner lipsește din tokenData:', tokenData);
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=no_owner_in_token`
      );
    }

    // 7. Cerem /event_types?user=<userUri> pentru a obține scheduling_url
    const eventTypesResp = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const eventTypesJson = await eventTypesResp.json();
    console.log('› event_types response:', JSON.stringify(eventTypesJson, null, 2));

    if (
      !eventTypesResp.ok ||
      !Array.isArray(eventTypesJson.collection) ||
      eventTypesJson.collection.length === 0
    ) {
      console.error(
        'Calendly fetch event_types error:',
        eventTypesResp.status,
        JSON.stringify(eventTypesJson)
      );
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=no_event_types`
      );
    }

    // 8. Alegem primul event_type activ (sau primul din listă, dacă nu există niciunul activ)
    const firstActive =
      eventTypesJson.collection.find((et: any) => et.active) ||
      eventTypesJson.collection[0];

    if (!firstActive || !firstActive.scheduling_url) {
      console.error(
        'Nu s-a găsit scheduling_url valid:',
        eventTypesJson.collection
      );
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=no_scheduling_url`
      );
    }

    // 9. Extragem doar partea principală a scheduling_url (fără segmentul final, ex: “/30min”)
    const fullSchedulingUrl = firstActive.scheduling_url;
    // ex: "https://calendly.com/stefan-liviu286/30min"
    const urlObj = new URL(fullSchedulingUrl);
    // urlObj.origin === "https://calendly.com"
    // urlObj.pathname === "/stefan-liviu286/30min"
    const pathParts = urlObj.pathname.split('/');
    // => ["", "stefan-liviu286", "30min"]
    const basePath = pathParts[1]; // => "stefan-liviu286"
    const calendlyCalendarUri = `${urlObj.origin}/${basePath}`; 
    // => "https://calendly.com/stefan-liviu286"

    console.log('› fullSchedulingUrl:', fullSchedulingUrl);
    console.log('› calendlyCalendarUri (fără ultimul segment):', calendlyCalendarUri);

    // 10. Actualizăm în baza de date (Prisma) câmpurile necesare
    let updated: {
      id: string;
      calendlyCalendarUri: string;
      isCalendlyConnected: boolean;
    } | null = null;

    try {
      updated = await prisma.provider.update({
        where: { id: providerId },
        data: {
          calendlyAccessToken:  accessToken,
          calendlyRefreshToken: tokenData.refresh_token,
          calendlyExpiresAt:    new Date(Date.now() + tokenData.expires_in * 1000),
          calendlyCalendarUri,
          isCalendlyConnected:  true,
        },
        select: {
          id: true,
          calendlyCalendarUri: true,
          isCalendlyConnected: true,
        },
      });
      console.log('› După update, provider în DB:', updated);
    } catch (prismaErr: any) {
      console.error('❌ PrismaClient update error:', prismaErr);
      return NextResponse.redirect(
        `${BASE_URL}/profil?calendly_error=update_failed`
      );
    }

    // 11. Ștergem cookie-ul 'calendly_code_verifier' și redirectăm la profil cu succes
    const response = NextResponse.redirect(
      `${BASE_URL}/profil?calendly_connected=true`
    );
    response.cookies.delete('calendly_code_verifier', { path: '/' });
    return response;
  } catch (err: any) {
    console.error('Calendly callback unexpected error:', err);
    return NextResponse.redirect(
      `${BASE_URL}/profil?calendly_error=${encodeURIComponent(err.message)}`
    );
  }
}
