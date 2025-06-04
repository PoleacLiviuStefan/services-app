// File: src/app/api/provider/[providerId]/calendly-account/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: { providerId: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  // „await” pe params, apoi extragi proprietatea
  const { providerId } = await params;

  // 1. Citim body-ul JSON
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  // 2. Verificăm că payload nu e null și e un obiect care conține "calendlyCalendarUri"
  if (
    payload === null ||
    typeof payload !== "object" ||
    !Object.prototype.hasOwnProperty.call(payload, "calendlyCalendarUri")
  ) {
    return NextResponse.json(
      { error: "Aștept `{ calendlyCalendarUri: null }` sau string." },
      { status: 400 }
    );
  }

  // 3. Extragem noua valoare (poate fi string sau null)
  const { calendlyCalendarUri } = payload as { calendlyCalendarUri: string | null };

  // 4. Actualizăm în baza de date
  try {
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        calendlyCalendarUri: calendlyCalendarUri,
        isCalendlyConnected: calendlyCalendarUri === null ? false : true,
        // Dacă primim null, ștergem token-urile
        calendlyAccessToken:  calendlyCalendarUri === null ? null : undefined,
        calendlyRefreshToken: calendlyCalendarUri === null ? null : undefined,
        calendlyExpiresAt:    calendlyCalendarUri === null ? null : undefined,
      },
      select: {
        id: true,
        calendlyCalendarUri: true,
        isCalendlyConnected: true,
      },
    });

    return NextResponse.json({ ok: true, provider: updated });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Provider cu acest ID nu există." },
        { status: 404 }
      );
    }
    console.error("PUT /api/provider/[providerId]/calendly-account error:", err);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
