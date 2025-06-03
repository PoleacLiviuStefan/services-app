// File: app/api/stripe/connect/account-link/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId"); // ID-ul contului Stripe (gen: "acct_ABC123")
  if (!accountId) {
    return NextResponse.json({ error: "Lipsește accountId" }, { status: 400 });
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: process.env.CONNECT_REDIRECT_URI as string,
      return_url: process.env.CONNECT_REDIRECT_URI as string,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Eroare la crearea Account Link" },
      { status: 500 }
    );
  }
}
