// app/api/provider/[providerId]/specialities/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/specialities)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru array-ul de specialități
  const { specialities }: { specialities: string[] } = await req.json();

  // 3) Actualizăm relația many-to-many prin setarea noilor specialități
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: {
      specialities: {
        set: specialities.map((id) => ({ id })),
      },
    },
    include: { specialities: true },
  });

  // 4) Returnăm obiectul actualizat (inclusiv lista de specialități)
  return NextResponse.json({ specialities: updated.specialities });
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/specialities)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm provider-ul și includem relația specialities
  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { specialities: true },
  });

  // 3) Dacă nu există provider, returnăm 404
  if (!record) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4) Returnăm întotdeauna un array (poate fi gol)
  return NextResponse.json({ specialities: record.specialities });
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);
