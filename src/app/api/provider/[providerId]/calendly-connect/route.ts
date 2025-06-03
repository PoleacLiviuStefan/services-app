// /app/api/provider/[providerId]/calendly-account/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

type UpdateCalendlyPayload = {
  calendlyCalendarUri: string | null;
};

async function putHandler(
  req: NextRequest,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("calendlyCalendarUri" in body) ||
    !(
      typeof (body as UpdateCalendlyPayload).calendlyCalendarUri === "string" ||
      (body as UpdateCalendlyPayload).calendlyCalendarUri === null
    )
  ) {
    return NextResponse.json(
      { error: "Aștept `{ calendlyCalendarUri: string | null }`." },
      { status: 400 }
    );
  }

  const { calendlyCalendarUri } = body as UpdateCalendlyPayload;

  try {
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { calendlyCalendarUri },
    });
    return NextResponse.json({ provider: updated }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/provider/[providerId]/calendly-account error:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea Calendly." },
      { status: 500 }
    );
  }
}

export const PUT = withProviderAuth(putHandler);
