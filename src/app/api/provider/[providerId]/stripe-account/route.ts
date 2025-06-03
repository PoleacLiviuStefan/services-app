// /app/api/provider/[providerId]/stripe-account/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

// Schematizează payload-ul așteptat de la client
type UpdateStripePayload = {
  stripeAccountId: string | null;
};

async function putHandler(
  req: NextRequest,
  context: { params: { providerId: string } }
) {
  // Așteaptă context.params înainte de a citi providerId
  const { providerId } = await context.params;

  // Încearcă să parsezi JSON-ul din body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Payload JSON invalid." },
      { status: 400 }
    );
  }

  // Verifică că body conține cheia stripeAccountId (poate fi string sau null)
  if (
    typeof body !== "object" ||
    body === null ||
    !("stripeAccountId" in body) ||
    !(
      (typeof (body as UpdateStripePayload).stripeAccountId === "string") ||
      (body as UpdateStripePayload).stripeAccountId === null
    )
  ) {
    return NextResponse.json(
      { error: "Aștept `{ stripeAccountId: string | null }` ca payload." },
      { status: 400 }
    );
  }

  const { stripeAccountId } = body as UpdateStripePayload;

  try {
    // Actualizează doar câmpul stripeAccountId al provider-ului
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId },
    });

    return NextResponse.json({ provider: updated }, { status: 200 });
  } catch (err: unknown) {
    console.error("PUT /api/provider/[providerId]/stripe-account error:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea stripeAccountId." },
      { status: 500 }
    );
  }
}

export const PUT = withProviderAuth(putHandler);
