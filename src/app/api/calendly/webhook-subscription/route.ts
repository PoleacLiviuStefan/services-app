// app/api/calendly/webhook-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { providerId, callbackUrl, events } = await req.json();

  // 1. Încarcă calendarUri din Provider
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { calendlyCalendarUri: true }
  });
  if (!provider?.calendlyCalendarUri) {
    return NextResponse.json({ error: 'Provider fără calendar configurat.' }, { status: 400 });
  }

  // 2. Creează subscripția la Calendly
  const res = await fetch('https://api.calendly.com/webhook_subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${process.env.CALENDLY_PAT}`
    },
    body: JSON.stringify({
      url:   callbackUrl,
      events,
      scope: 'user',
      user:  provider.calendlyCalendarUri
    })
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  const { resource } = await res.json();

  // 3. Salvează în Provider câmpul calendlyWebhooks (JSON)
  //    sau orice câmp JSON ai definit pentru webhook-uri
  await prisma.provider.update({
    where: { id: providerId },
    data: {
      calendlyWebhooks: {
        push: {
          subscriptionId: resource.uri,
          calendarUri:    resource.user!,
          callbackUrl:    resource.callback_url,
          events:         resource.events,
          scope:          resource.scope,
          createdAt:      resource.created_at
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}
