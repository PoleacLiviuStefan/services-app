// /app/api/provider/[providerId]/calendly-connect/callback/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

async function getHandler(
  req: NextRequest,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Lipsește code" }, { status: 400 });
  }

  try {
    // Schimbăm code → token la Calendly
    const tokenResp = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!,
        client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/profil`,
        code,
      }).toString(),
    });
    if (!tokenResp.ok) {
      console.error("Calendly token error:", await tokenResp.text());
      return NextResponse.json({ error: "Eroare la token Calendly" }, { status: 500 });
    }
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token; // ex: "abcd1234..."

    // Exemplu: putem apela Calendly API pentru a obține URL-ul calendarului:
    const userResp = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResp.ok) {
      console.error("Calendly user error:", await userResp.text());
      return NextResponse.json({ error: "Eroare la user Calendly" }, { status: 500 });
    }
    const userData = await userResp.json();
    // În răspuns există câmpul "scheduling_url" (URL-ul calen­darului)
    const calendarUri = userData.resource?.scheduling_url || null;

    // Salvăm în baza de date
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { calendlyCalendarUri: calendarUri },
    });

    return NextResponse.json({ provider: updated }, { status: 200 });
  } catch (err) {
    console.error("Calendly OAuth callback error:", err);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}

export const GET = withProviderAuth(getHandler);
