// File: app/api/stripe/connect/callback/route.ts

import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // ex: "stripe:<providerId>"
  
  // baza ta de URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!; // ex: "https://mysticgold.app"

  // dacă lipsește code sau state, trimitem pur și simplu înapoi la profil
  if (!code || !state || !state.startsWith("stripe:")) {
    return NextResponse.redirect(new URL("/profil", baseUrl));
  }

  // extragem ID-ul provider-ului din state
  const providerId = state.split(":")[1];

  try {
    // 1) schimbăm code pe token la Stripe
    const resp = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    const accountId = resp.stripe_user_id;

    // 2) actualizăm în DB
    await prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId: accountId },
    });

    // 3) redirect absolut înapoi la profil, cu un query param (opțional)
    const url = new URL("/profil", baseUrl);
    url.searchParams.set("stripeConnected", "1");       // poți folosi orice flag
    return NextResponse.redirect(url);

  } catch (err: any) {
    console.error("Stripe OAuth callback error:", err.message);
    // redirect cu eroare
    const url = new URL("/profil", baseUrl);
    url.searchParams.set("stripeError", encodeURIComponent(err.message));
    return NextResponse.redirect(url);
  }
}
