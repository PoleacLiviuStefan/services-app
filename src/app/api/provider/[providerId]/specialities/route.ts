// File: src/app/api/provider/[providerId]/specialities/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Extragem providerId din URL
  const { providerId } = await context.params;
  console.log("[DEBUG] providerId:", providerId);

  // 2) Citim JSON-ul din body
  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[DEBUG] JSON invalid sau null:", e);
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  console.log("[DEBUG] body:", body);

  // 3) Verificăm că avem un array de nume de specialități
  if (
    body === null ||
    typeof body !== "object" ||
    !Array.isArray((body as any).specialities)
  ) {
    console.error("[DEBUG] body.specialities invalid:", (body as any).specialities);
    return NextResponse.json(
      { error: "specialities must be an array of names" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { specialities } = body as { specialities: string[] };
  console.log("[DEBUG] specialities array:", specialities);

  // 4) Verificăm că providerId există
  const providerExists = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!providerExists) {
    console.error("[DEBUG] Provider inexistent:", providerId);
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5) Folosim numele primite pentru a găsi specialitățile în baza de date
  const existing = await prisma.speciality.findMany({
    where: { name: { in: specialities } },
    select: { id: true, name: true, description: true },
  });
  console.log("[DEBUG] existing specialities from DB (matched by name):", existing);

  // 6) Construim lista de conexiuni pe baza ID-urilor găsite
  const validConnect = existing.map((s) => ({ id: s.id }));
  console.log("[DEBUG] validConnect IDs:", validConnect);

  // 7) Facem update și includem lista actualizată
  try {
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        specialities: { set: validConnect },
      },
      include: { specialities: true },
    });
    console.log("[DEBUG] updated.specialities:", updated.specialities);
    return NextResponse.json(
      { specialities: updated.specialities },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[DEBUG] Prisma update error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;
  console.log("[DEBUG] GET providerId:", providerId);

  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { specialities: true },
  });

  if (!record) {
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return NextResponse.json(
    { specialities: record.specialities },
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export const PUT = putHandler;
export const GET = getHandler;
