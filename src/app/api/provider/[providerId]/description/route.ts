// app/api/provider/[providerId]/description/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/description)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm provider-ul și selectăm doar câmpul description
  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { description: true },
  });

  // 3) Dacă nu există provider, returnăm 404
  if (!record) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4) Returnăm obiectul cu cheia description (poate fi null sau string)
  return NextResponse.json({ description: record.description });
}

// Exportăm metoda GET “împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/description)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru description
  let body: { description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3) Validăm că description există și este string
  if (typeof body.description !== "string") {
    return NextResponse.json(
      { error: "description must be a string" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4) Actualizăm câmpul description în baza de date
  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: { description: body.description },
  });

  // 5) Returnăm răspunsul cu obiectul actualizat (cel puțin câmpul description)
  return NextResponse.json({ description: updated.description });
}

// Exportăm metoda PUT “împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);
