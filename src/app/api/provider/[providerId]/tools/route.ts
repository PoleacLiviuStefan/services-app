// File: src/app/api/provider/[providerId]/tools/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Extragem providerId
  const { providerId } = await context.params;
  console.log("[DEBUG] providerId:", providerId);

  // 2) Citim JSON-ul din body
  let body: { tools?: string[] };
  try {
    body = await req.json();
  } catch (e) {
    console.error("[DEBUG] Invalid JSON:", e);
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  console.log("[DEBUG] body:", body);

  // 3) Verificăm că avem un array de tool names
  if (!Array.isArray(body.tools)) {
    console.error("[DEBUG] body.tools nu e array:", body.tools);
    return NextResponse.json(
      { error: "tools must be an array of tool names" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

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

  // 5) Folosim numele primite pentru a găsi tool‐urile în baza de date
  const existingTools = await prisma.tool.findMany({
    where: { name: { in: body.tools } },
    select: { id: true, name: true, description: true },
  });
  console.log("[DEBUG] existingTools from DB (matched by name):", existingTools);

  // 6) Creăm lista de conexiuni pe baza ID‐urilor găsite
  const validConnect = existingTools.map((t) => ({ id: t.id }));
  console.log("[DEBUG] validConnect (IDs to set):", validConnect);

  // 7) Facem update și includem lista actualizată
  try {
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        tools: { set: validConnect },
      },
      include: { tools: true },
    });

    console.log("[DEBUG] updated.tools:", updated.tools);
    return NextResponse.json(
      { tools: updated.tools },
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

export const PUT = putHandler;
