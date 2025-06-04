// File: app/api/calendly/user/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // importă NextAuth config
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Obținem sesiunea curentă
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nu ești autentificat." }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Găsim provider-ul asociat cu acest user (presupunem că un user e și provider)
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
      select: { calendlyAccessToken: true },
    });
    if (!provider || !provider.calendlyAccessToken) {
      return NextResponse.json({ error: "Provisionics Calendly token pentru acest provider." }, { status: 404 });
    }
    const token = provider.calendlyAccessToken;

    // 3. Apelăm Calendly API pentru /users/me
    const calendlyResp = await fetch("https://api.calendly.com/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
    });
    if (!calendlyResp.ok) {
      // Poate tokenul a expirat; atunci ai putea da refresh (folosind refresh_token),
      // dar în exemplul acesta vom returna o eroare.
      const text = await calendlyResp.text();
      console.error("Calendly API error:", text);
      return NextResponse.json({ error: "Eroare de la Calendly", details: text }, { status: calendlyResp.status });
    }

    const data = await calendlyResp.json();
    // 4. Returnăm direct obiectul primit de la Calendly (sau doar scheduling_url)
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in /api/calendly/user:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
