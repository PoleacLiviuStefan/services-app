// /app/api/provider/[providerId]/stripe-connect/callback/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

async function getHandler(
  req: NextRequest,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: 'Parametru "code" lipsă' },
      { status: 400 }
    );
  }

  try {
    // Facem schimbul code → stripe_user_id
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    const connectedAccountId = response.stripe_user_id;

    // Salvăm în baza de date
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId: connectedAccountId },
    });

    return NextResponse.json(
      { provider: updated },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Stripe OAuth callback error:", err);
    return NextResponse.json(
      { error: "Eroare la schimbul de cod Stripe OAuth" },
      { status: 500 }
    );
  }
}

export const GET = withProviderAuth(getHandler);
