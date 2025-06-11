// File: app/api/calendly/event-scheduled/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BodyDTO {
  providerId:        string;  // userId al provider-ului (venit în body de la Calendly webhook)
  scheduledEventUri: string;
}

export async function POST(req: NextRequest) {
  try {
    // ————————————————————————————————
    // 1. Autentificare & currentUserId
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unautorizat. Trebuie să fii autentificat." },
        { status: 401 }
      );
    }
    const currentUserId = session.user.id;

    // ————————————————————————————————
    // 2. Parse & validate request body
    let body: BodyDTO;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
    }
    const { providerId: userId, scheduledEventUri } = body;
    if (!userId || !scheduledEventUri) {
      return NextResponse.json(
        { error: "Parametri lipsă: providerId sau scheduledEventUri." },
        { status: 400 }
      );
    }

    // ————————————————————————————————
    // 3. Încarcă datele provider-ului
    const dbPr = await prisma.provider.findUnique({
      where: { userId },
      select: {
        id:                   true,
        calendlyAccessToken:  true,
        calendlyRefreshToken: true,
        calendlyExpiresAt:    true,
        mainSpecialityId:     true,
      },
    });
    if (!dbPr) {
      return NextResponse.json({ error: "Provider invalid." }, { status: 404 });
    }
    let {
      id: realProviderId,
      calendlyAccessToken: token,
      calendlyRefreshToken: refreshToken,
      calendlyExpiresAt:    expiresAt,
      mainSpecialityId,
    } = dbPr;

    // ————————————————————————————————
    // 4. Refresh token helper
    async function refreshOnce(): Promise<boolean> {
      if (!refreshToken) return false;
      if (expiresAt && new Date() < expiresAt) return false;
      const params = new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!,
        client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        refresh_token: refreshToken,
      });
      const r = await fetch("https://auth.calendly.com/oauth/token", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    params.toString(),
      });
      if (!r.ok) return false;
      const j = await r.json();
      token        = j.access_token;
      refreshToken = j.refresh_token;
      expiresAt    = new Date(Date.now() + j.expires_in * 1000);
      await prisma.provider.update({
        where: { id: realProviderId },
        data: {
          calendlyAccessToken:  token,
          calendlyRefreshToken: refreshToken,
          calendlyExpiresAt:    expiresAt,
        },
      });
      return true;
    }

    // ————————————————————————————————
    // 5. Fetch scheduled_event de la Calendly
    let res = await fetch(scheduledEventUri, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 && await refreshOnce()) {
      res = await fetch(scheduledEventUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const scheduledJson = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Eroare Calendly", details: scheduledJson },
        { status: res.status }
      );
    }

    // ————————————————————————————————
    // 6. Extrage date din payload
    const rsrc           = scheduledJson.resource;
    const scheduledAtStr = rsrc.created_at!;
    const startStr       = rsrc.start_time!;
    const endStr         = rsrc.end_time!;
    if (!scheduledAtStr || !startStr || !endStr) {
      return NextResponse.json(
        { error: "Payload incomplet de la Calendly." },
        { status: 500 }
      );
    }

    // 7. Parse Dates & calc duration
    const scheduledAt = new Date(scheduledAtStr);
    const startDate   = new Date(startStr);
    const endDate     = new Date(endStr);
    const duration    = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    // ————————————————————————————————
    // 8. Verifică specialityId
    const specialityId = mainSpecialityId!;
    if (!specialityId) {
      return NextResponse.json(
        { error: "Nu există specialityId pentru provider." },
        { status: 400 }
      );
    }

    // ————————————————————————————————
    // 9. Alege pachetul clientului (client = user-ul curent)
    const pkgs = await prisma.userProviderPackage.findMany({
      where: {
        userId:     currentUserId,
        providerId: realProviderId,
      },
      include: {
        providerPackage: { select: { price: true, totalSessions: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const userPkg = pkgs.find(
      (p) => p.usedSessions < p.providerPackage.totalSessions
    );
    if (!userPkg) {
      return NextResponse.json(
        { error: "Nu ai sesiuni disponibile în niciun pachet." },
        { status: 400 }
      );
    }
    const totalPrice =
      userPkg.providerPackage.price / userPkg.providerPackage.totalSessions;

    // ————————————————————————————————
    // 10. Crează întâlnirea Zoom
    const zoomRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/video/create-session`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users:       [realProviderId, currentUserId],
          providerId:  realProviderId,
          clientId:    currentUserId,
          specialityId,
          packageId:   userPkg.id,
        }),
      }
    );
    const zoomJson = await zoomRes.json();
    if (!zoomRes.ok) {
      return NextResponse.json(
        { error: "Zoom create-session failed", details: zoomJson },
        { status: zoomRes.status }
      );
    }
    const { sessionName, tokens } = zoomJson;

    // ————————————————————————————————
    // 11. Upsert ConsultingSession (folosind currentUserId ca clientId)
    const consultingSession = await prisma.consultingSession.upsert({
      where: { zoomSessionName: sessionName },
      update: {
        scheduledAt,
        startDate,
        endDate,
        duration,
        totalPrice:        Math.round(totalPrice * 100) / 100,
        calendlyEventUri:  scheduledEventUri,
      },
      create: {
        providerId:        realProviderId,
        clientId:          currentUserId,
        specialityId,
        packageId:         userPkg.id,
        duration,
        scheduledAt,
        startDate,
        endDate,
        totalPrice:        Math.round(totalPrice * 100) / 100,
        calendlyEventUri:  scheduledEventUri,
        zoomSessionName:   sessionName,
        zoomTokens:        tokens,
        isFinished:        false,
      },
    });

    // ————————————————————————————————
    // 12. Increment usedSessions
    await prisma.userProviderPackage.update({
      where: { id: userPkg.id },
      data: { usedSessions: { increment: 1 } },
    });

    // ————————————————————————————————
    // 13. Răspuns final
    return NextResponse.json(
      { ok: true, data: consultingSession },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Unexpected error în /api/calendly/event-scheduled:", err);
    return NextResponse.json(
      {
        error:   "Eroare internă neașteptată",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
