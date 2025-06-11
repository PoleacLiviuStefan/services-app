// File: app/api/stripe/connect/callback/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Asigură-te că ai definit authOptions

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "Userul nu a fost găsit" }, { status: 404 });
  }

  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description");

  if (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.redirect(
      `${process.env.CONNECT_REDIRECT_URI}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Lipsește codul de autorizare" },
      { status: 400 }
    );
  }

  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const connectedAccountId = response.stripe_user_id;

    const provider = await prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Providerul nu a fost găsit" }, { status: 404 });
    }

    await prisma.provider.update({
      where: { userId },
      data: { stripeAccountId: connectedAccountId },
    });

    return NextResponse.redirect(
      `/onboarding-success?accountId=${connectedAccountId}`
    );
  } catch (err: any) {
    console.error("Eroare la schimbul de token Stripe:", err);
    return NextResponse.redirect(
      `${process.env.CONNECT_REDIRECT_URI}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
}
