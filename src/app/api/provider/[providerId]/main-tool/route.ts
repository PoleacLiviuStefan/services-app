// app/api/provider/[providerId]/main-tool/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/main-tool)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru mainToolId
  const { mainToolId }: { mainToolId: string } = await req.json();

  // 3) Actualizăm câmpul mainToolId în baza de date
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { mainToolId },
  });

  // 4) Returnăm răspunsul cu obiectul actualizat
  return NextResponse.json({ updated });
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/main-tool)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm în baza de date provider-ul, inclusiv relația mainTool
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { mainTool: true },
  });

  // 3) Dacă nu există provider, returnăm 404
  if (!provider) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4) Returnăm întotdeauna un obiect: { mainTool: … }
  return NextResponse.json({ mainTool: provider.mainTool });
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);
