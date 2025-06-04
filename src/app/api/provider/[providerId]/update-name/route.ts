// app/api/provider/[providerId]/update-name/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/update-name)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;

  // 1) Găsim provider-ul și selectăm doar userId + user.name
  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!record) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Dacă user.name poate fi null, trimitem empty string sau null
  return NextResponse.json({ name: record.user.name });
}

// Exportăm GET cu middleware care validează că e provider autentificat
export const GET = withProviderAuth(getHandler);

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/update-name)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;

  // 1) Parsăm JSON-ul din body pentru noul name
  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Validăm că name există și e string nenul
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: "name must be a non-empty string" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const newName = body.name.trim();

  // 3) Găsim provider-ul ca să obținem userId (și verificăm existența)
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });
  if (!provider) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4) Actualizăm câmpul user.name
  try {
    const updatedUser = await prisma.user.update({
      where: { id: provider.userId },
      data: { name: newName },
    });

    return NextResponse.json({ name: updatedUser.name });
  } catch (error) {
    console.error("Error updating user name:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Exportăm PUT cu middleware care validează că e provider autentificat
export const PUT = withProviderAuth(putHandler);
