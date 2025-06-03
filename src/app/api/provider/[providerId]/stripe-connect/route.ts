// /app/api/provider/[providerId]/stripe-account/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

async function putHandler(req: NextRequest, context: { params: { providerId: string } }) {
  const { providerId } = context.params;
  const body = await req.json();
  const { stripeAccountId }: { stripeAccountId: string | null } = body;

  // Permitem fie string valid, fie null (pentru disconnect)
  if (stripeAccountId !== null && typeof stripeAccountId !== "string") {
    return NextResponse.json(
      { error: '"stripeAccountId" trebuie să fie string sau null' },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId },
    });
    return NextResponse.json({ provider: updated }, { status: 200 });
  } catch (err: any) {
    console.error("Eroare la PUT /stripe-account:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea stripeAccountId" },
      { status: 500 }
    );
  }
}

export const PUT = withProviderAuth(putHandler);
