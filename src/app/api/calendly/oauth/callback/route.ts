// File: app/api/calendly/oauth/callback/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  try {
    const { searchParams } = new URL(req.url);
    const code  = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // “calendly:<providerId>”

    if (error) {
      console.error("Calendly OAuth error (returned by provider):", error);
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=${encodeURIComponent(error)}`
      );
    }
    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing parameter: code or state" },
        { status: 400 }
      );
    }
    const providerId = state.replace("calendly:", "");
    console.log("› providerId extras din state:", providerId);

    // Verificăm că există provider-ul în DB
    const existing = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, calendlyCalendarUri: true },
    });
    console.log("› Găsit în DB (înainte de update):", existing);
    if (!existing) {
      console.error("Provider cu id-ul acesta nu există în DB:", providerId);
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=provider_not_found`
      );
    }

    // Preluăm code_verifier din cookie
    const codeVerifier = req.cookies.get("calendly_code_verifier")?.value;
    if (!codeVerifier) {
      console.error("Missing code_verifier in cookie");
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=missing_code_verifier`
      );
    }

    // 1. Exchange code for token
    const clientId     = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET!;
    const form = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri:  `${origin}/api/calendly/oauth/callback`,
      code_verifier: codeVerifier,
    });

    const tokenResp = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const bodyText = await tokenResp.text();
    if (!tokenResp.ok) {
      console.error("Calendly token error:", tokenResp.status, bodyText);
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=${encodeURIComponent(bodyText)}`
      );
    }

    const tokenData = JSON.parse(bodyText);
    console.log("› tokenData primit:", JSON.stringify(tokenData, null, 2));

    const accessToken = tokenData.access_token;
    const userUri     = tokenData.owner;
    console.log("› owner (userUri) extras din tokenData:", userUri);

    if (!userUri) {
      console.error("owner lipsește din tokenData:", tokenData);
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=no_owner_in_token`
      );
    }

    // 2. Fetch event types ca să obținem scheduling_url
    const eventTypesResp = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const eventTypesJson = await eventTypesResp.json();
    console.log("› event_types response:", JSON.stringify(eventTypesJson, null, 2));

    if (
      !eventTypesResp.ok ||
      !Array.isArray(eventTypesJson.collection) ||
      eventTypesJson.collection.length === 0
    ) {
      console.error(
        "Calendly fetch event_types error:",
        eventTypesResp.status,
        JSON.stringify(eventTypesJson)
      );
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=no_event_types`
      );
    }

    // 3. Alegem primul event_type activ sau, dacă nu există, primul din listă
    const firstActive =
      eventTypesJson.collection.find((et: any) => et.active) ||
      eventTypesJson.collection[0];

    if (!firstActive || !firstActive.scheduling_url) {
      console.error("Nu s-a găsit scheduling_url valid:", eventTypesJson.collection);
      return NextResponse.redirect(
        `${origin}/profil?calendly_error=no_scheduling_url`
      );
    }

    // *** Aici scoatem exclusiv partea principală a link-ului, fără "/30min" ***
    const fullSchedulingUrl = firstActive.scheduling_url;
    // De ex: "https://calendly.com/stefan-liviu286/30min"
    const urlObj = new URL(fullSchedulingUrl);
    // urlObj.origin === "https://calendly.com"
    // urlObj.pathname === "/stefan-liviu286/30min"
    const pathParts = urlObj.pathname.split("/"); 
    // => ["", "stefan-liviu286", "30min"]
    const basePath = pathParts[1]; 
    // => "stefan-liviu286"
    const calendlyCalendarUri = `${urlObj.origin}/${basePath}`;
    // => "https://calendly.com/stefan-liviu286"

    console.log("› fullSchedulingUrl:", fullSchedulingUrl);
    console.log("› calendlyCalendarUri (fără ultimul segment):", calendlyCalendarUri);

    // 4. Salvăm în baza de date:
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        calendlyAccessToken:  accessToken,
        calendlyRefreshToken: tokenData.refresh_token,
        calendlyExpiresAt:    new Date(Date.now() + tokenData.expires_in * 1000),
        calendlyCalendarUri,           // link-ul public de tip "/username"
        isCalendlyConnected:  true,
      },
      select: {
        id: true,
        calendlyCalendarUri: true,
        isCalendlyConnected: true,
      },
    });
    console.log("› După update, provider în DB:", updated);

    // 5. Ștergem cookie-ul code_verifier și redirectăm la profil
    const response = NextResponse.redirect(
      `${origin}/profil?calendly_connected=true`
    );
    response.cookies.delete("calendly_code_verifier", { path: "/" });
    return response;
  } catch (err: any) {
    console.error("Calendly callback unexpected error:", err);
    return NextResponse.redirect(
      `${req.nextUrl.origin}/profil?calendly_error=${encodeURIComponent(err.message)}`
    );
  }
}
