// File: src/app/api/provider/[providerId]/calendly/event-types/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function refreshCalendlyAccessToken(providerId: string, refreshToken: string) {
  const url = "https://auth.calendly.com/oauth/token";
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID,
    client_secret: process.env.CALENDLY_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!resp.ok) throw new Error("Failed to refresh Calendly token");
  const data = await resp.json();
  // data: { access_token, refresh_token, expires_in }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.provider.update({
    where: { id: providerId },
    data: {
      calendlyAccessToken: data.access_token,
      calendlyRefreshToken: data.refresh_token,
      calendlyExpiresAt: expiresAt,
    },
  });
  return data.access_token;
}

export async function GET(
  request: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      isCalendlyConnected: true,
      calendlyUserUri: true,
      calendlyAccessToken: true,
      calendlyRefreshToken: true,
      calendlyExpiresAt: true,
      providerPackages: { select: { id: true, calendlyEventTypeUri: true } },
    },
  });

  if (!provider?.isCalendlyConnected || !provider.calendlyUserUri) {
    return NextResponse.json(
      { error: "Provider neconectat la Calendly." },
      { status: 400 }
    );
  }

  // check expiration
  let accessToken = provider.calendlyAccessToken;
  if (provider.calendlyExpiresAt && provider.calendlyExpiresAt <= new Date()) {
    try {
      accessToken = await refreshCalendlyAccessToken(providerId, provider.calendlyRefreshToken!);
    } catch (err) {
      console.error("Failed to refresh Calendly token:", err);
      return NextResponse.json({ error: "Failed to refresh Calendly token." }, { status: 502 });
    }
  }

  const fetchEventTypes = async (token: string) => {
    const url = `https://api.calendly.com/event_types?user=${encodeURIComponent(
      provider.calendlyUserUri!
    )}`;
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  };

  // try to fetch, refresh on 401
  let resp = await fetchEventTypes(accessToken!);
  if (resp.status === 401) {
    try {
      accessToken = await refreshCalendlyAccessToken(providerId, provider.calendlyRefreshToken!);
      resp = await fetchEventTypes(accessToken);
    } catch (err) {
      console.error("Failed to refresh after 401:", err);
      return NextResponse.json({ error: "Eroare la reîmprospătarea token-ului." }, { status: 502 });
    }
  }

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Calendly API error:", text);
    return NextResponse.json(
      { error: "Eroare la interogarea Calendly." },
      { status: 502 }
    );
  }

  const { collection } = await resp.json();
  const eventTypes = (collection as any[]).map((et) => ({ uri: et.uri, name: et.name }));

  const existingMappings: Record<string, string> = {};
  provider.providerPackages.forEach((pkg) => {
    if (pkg.calendlyEventTypeUri) {
      existingMappings[pkg.calendlyEventTypeUri] = pkg.id;
    }
  });

  return NextResponse.json({ eventTypes, existingMappings });
}
