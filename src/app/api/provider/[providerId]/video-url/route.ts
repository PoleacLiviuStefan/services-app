// app/api/provider/[providerId]/video-url/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/video-url)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru videoUrl
  const { videoUrl }: { videoUrl: string } = await req.json();

  // 3) Actualizăm câmpul videoUrl în baza de date
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { videoUrl },
  });

  // 4) Returnăm răspunsul cu obiectul actualizat
  return NextResponse.json({ updated });
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/video-url)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm doar câmpul videoUrl pentru acel provider
  const result = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { videoUrl: true },
  });

  // 3) Extragem videoUrl (dacă result e null, atunci videoUrl va fi null)
  const videoUrl = result ? result.videoUrl : null;

  // 4) Returnăm întotdeauna un obiect cu cheia videoUrl
  return NextResponse.json({ videoUrl });
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);
