// app/api/provider/[providerId]/reading/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/reading)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Căutăm provider-ul și includem relația reading
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { reading: true },
  });

  // 3) Dacă provider nu există, returnăm 404
  if (!provider) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4) Returnăm obiectul reading (sau {} dacă nu există)
  return NextResponse.json(provider.reading ?? {});
}

// Exportăm metoda GET „împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/reading)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Citim și validăm JSON-ul din body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { readingId } = body;

  // 3) Dacă readingId este string gol, unsetăm relația
  if (readingId === "") {
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { readingId: null },
      include: { reading: true },
    });
    return NextResponse.json(updatedProvider.reading ?? {});
  }

  // 4) Dacă readingId nu e string, returnăm 400
  if (typeof readingId !== "string") {
    return NextResponse.json(
      { error: "readingId must be a string (or empty to clear)" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5) Confirmăm că Reading există în baza de date
  const readingExists = await prisma.reading.findUnique({
    where: { id: readingId },
    select: { id: true },
  });
  if (!readingExists) {
    return NextResponse.json(
      { error: `No Reading found with id=${readingId}` },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6) Facem update-ul relației și returnăm reading
  try {
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { readingId },
      include: { reading: true },
    });
    return NextResponse.json(updatedProvider.reading ?? {});
  } catch (err: any) {
    console.error(err.stack);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Exportăm metoda PUT „împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);
