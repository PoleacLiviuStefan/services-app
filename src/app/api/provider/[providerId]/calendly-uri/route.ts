// app/api/provider/[providerId]/calendly-uri/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId])
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm doar calendlyCalendarUri pentru acel provider
  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { calendlyCalendarUri: true },
  });

  // 3) Extragem calendlyCalendarUri (dacă record e null, atunci va fi null)
  const calendlyCalendarUri = record ? record.calendlyCalendarUri : null;

  // 4) Returnăm întotdeauna un obiect cu cheia calendlyCalendarUri
  return NextResponse.json({ calendlyCalendarUri });
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId])
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru calendlyCalendarUri
  const { calendlyCalendarUri }: { calendlyCalendarUri: string } = await req.json();

  // 3) Actualizăm câmpul calendlyCalendarUri în baza de date
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { calendlyCalendarUri },
  });

  // 4) Returnăm răspunsul cu obiectul actualizat
  return NextResponse.json({ updated });
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);
