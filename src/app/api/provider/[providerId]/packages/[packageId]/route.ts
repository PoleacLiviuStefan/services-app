// File: app/api/provider/[providerId]/packages/[packageId]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BodyDTO {
  calendlyEventTypeUri: string;
}

export async function PUT(req: NextRequest, { params }: { params: { providerId: string; packageId: string } }) {
  try {
    // 1. Autentificare & autorizare
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { providerId, packageId } = params;

    // 2. Verificăm că session.user e chiar provider-ul
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true }
    });
    if (!provider || provider.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Citim body-ul JSON
    let body: BodyDTO;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { calendlyEventTypeUri } = body;
    if (typeof calendlyEventTypeUri !== "string" || !calendlyEventTypeUri.trim()) {
      return NextResponse.json({ error: "Invalid calendlyEventTypeUri" }, { status: 400 });
    }

    // 4. Verificăm că pachetul există și îi aparține provider-ului
    const pkg = await prisma.providerPackage.findUnique({
      where: { id: packageId },
      select: { providerId: true }
    });
    if (!pkg || pkg.providerId !== providerId) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // 5. Actualizăm calendlyEventTypeUri
    const updated = await prisma.providerPackage.update({
      where: { id: packageId },
      data: { calendlyEventTypeUri },
      select: {
        id: true,
        service: true,
        totalSessions: true,
        price: true,
        calendlyEventTypeUri: true,
        createdAt: true,
        expiresAt: true
      }
    });

    return NextResponse.json({ ok: true, package: updated }, { status: 200 });
  } catch (err: any) {
    console.error("Error in map package:", err);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
