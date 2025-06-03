// app/api/provider/[providerId]/tools/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/tools)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Citim și validăm JSON-ul din body
  let body: { tools?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!Array.isArray(body.tools)) {
    return NextResponse.json(
      { error: "tools must be an array of IDs" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3) Fetch doar tool-urile care există în baza de date
  const existing = await prisma.tool.findMany({
    where: { id: { in: body.tools } },
    select: { id: true },
  });
  const validConnect = existing.map((t) => ({ id: t.id }));

  try {
    // 4) Facem update cu doar ID-urile valide și includem lista actualizată de tools
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        tools: { set: validConnect },
      },
      include: { tools: true },
    });

    // 5) Returnăm array-ul de tool-uri actualizat
    return NextResponse.json(
      { tools: updated.tools },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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
