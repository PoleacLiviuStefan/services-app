// app/api/provider/[providerId]/main-speciality/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 1) Parsăm JSON-ul din body
  const { mainSpecialityId }: { mainSpecialityId: string } = await req.json();

  // 2) Actualizăm provider-ul în baza de date
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { mainSpecialityId },
  });

  // 3) Returnăm obiectul actualizat
  return NextResponse.json({ updated });
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);

// ----------------------------
// HANDLER pentru GET
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 1) Căutăm în baza de date provider-ul, inclusiv relația mainSpeciality
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { mainSpeciality: true },
  });

  // 2) Dacă nu există provider, returnăm 404
  if (!provider) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3) Returnăm întotdeauna un obiect: { mainSpeciality: … }
  return NextResponse.json({ mainSpeciality: provider.mainSpeciality });
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);
