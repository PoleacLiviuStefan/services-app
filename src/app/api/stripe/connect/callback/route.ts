// File: app/api/stripe/connect/callback/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma"; // prespunem că prisma e setat

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: NextRequest) {
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

    // TODO: Obține user-ul logat sau un fel de userId din cookie/session
    // Presupunem că ai cumva userId în contextul request-ului (de obicei prin NextAuth).
    // Exemplu generic: extragem un userId stocat anterior
    // const userId = await getUserIdFromCookieOrSession(req);
    // Dar aici vom pune un placeholder:
    const userId = "<<USER_ID_STATIC_PENTRU_EXEMPLU>>";

    // Salvăm connectedAccountId în baza de date pe modelul Provider
    await prisma.provider.update({
      where: { userId: userId },
      data: { stripeAccountId: connectedAccountId },
    });

    return NextResponse.redirect(
      `/onboarding-success?accountId=${connectedAccountId}`
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.redirect(
      `${process.env.CONNECT_REDIRECT_URI}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
}
