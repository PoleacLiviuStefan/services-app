export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1) Extragem providerId (= userId al provider-ului) din query
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    console.log('[Debug] providerId param:', providerId);
    if (!providerId) {
      return NextResponse.json(
        { error: "Lipsește parametrul providerId în query." },
        { status: 400 }
      );
    }

    // 2) Preluăm din DB tokenurile și calendlyUserUri
    const dbPr = await prisma.provider.findUnique({
      where: { userId: providerId },
      select: {
        calendlyAccessToken:  true,
        calendlyRefreshToken: true,
        calendlyUserUri:      true,
      },
    });
    console.log('[Debug] dbPr record:', dbPr);
    if (
      !dbPr ||
      !dbPr.calendlyAccessToken ||
      !dbPr.calendlyRefreshToken ||
      !dbPr.calendlyUserUri
    ) {
      return NextResponse.json(
        { error: "Provider invalid sau neconectat la Calendly." },
        { status: 404 }
      );
    }

    let {
      calendlyAccessToken: token,
      calendlyRefreshToken: refreshToken,
      calendlyUserUri: userUri,
    } = dbPr;

    // 3) Helper de refresh (va fi chemat doar pe 401)
    async function doRefresh(): Promise<boolean> {
      console.log('[Debug] Attempting token refresh');
      if (!refreshToken) return false;
      const params = new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!,
        client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        refresh_token: refreshToken,
      });
      const r = await fetch("https://auth.calendly.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      console.log('[Debug] Refresh response status:', r.status);
      if (!r.ok) return false;
      const j = await r.json();
      console.log('[Debug] Refresh response json:', j);
      token        = j.access_token;
      refreshToken = j.refresh_token;
      // Salvăm în DB tokenurile noi
      await prisma.provider.update({
        where: { userId: providerId },
        data: {
          calendlyAccessToken:  token,
          calendlyRefreshToken: refreshToken,
          calendlyExpiresAt:    new Date(Date.now() + j.expires_in * 1000),
        },
      });
      return true;
    }

    // 4) Cerem event_types, retry o singură dată dacă primim 401
    const fetchEventTypes = () =>
      fetch(
        `https://api.calendly.com/event_types?user=${encodeURIComponent(
          userUri
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

    console.log('[Debug] Fetching event_types with token');
    let evtRes = await fetchEventTypes();
    console.log('[Debug] Initial event_types status:', evtRes.status);
    if (evtRes.status === 401) {
      const refreshed = await doRefresh();
      console.log('[Debug] Token refreshed:', refreshed);
      if (refreshed) {
        evtRes = await fetchEventTypes();
        console.log('[Debug] Retry event_types status:', evtRes.status);
      }
    }
    const evtJson = await evtRes.json();
    console.log('[Debug] event_types response json:', evtJson);

    if (
      !evtRes.ok ||
      !Array.isArray(evtJson.collection) ||
      evtJson.collection.length === 0
    ) {
      console.error(
        "Calendly fetch event_types error:",
        evtRes.status,
        evtJson
      );
      return NextResponse.json(
        {
          error:
            evtRes.status === 401
              ? "Token invalid la Calendly, reconectează-te."
              : "Nu s-au găsit event_types active.",
          details: evtJson,
        },
        { status: evtRes.status === 401 ? 401 : 404 }
      );
    }

    // 5) Alegem primul active sau primul din listă
    const firstActive =
      evtJson.collection.find((et: any) => et.active) ||
      evtJson.collection[0];

    console.log('[Debug] firstActive:', firstActive);
    if (!firstActive.scheduling_url) {
      return NextResponse.json(
        { error: "Nu am găsit scheduling_url valid." },
        { status: 404 }
      );
    }

    // 6) Returnăm scheduling_url
    return NextResponse.json(
      { scheduling_url: firstActive.scheduling_url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(
      "Unexpected error în /api/calendly/user:",
      err?.message || err
    );
    return NextResponse.json(
      {
        error:   "Eroare internă neașteptată.",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
