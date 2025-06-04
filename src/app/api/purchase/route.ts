// File: src/app/api/purchase/route.ts

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // 1. Citește JSON-ul
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.log("[/api/purchase] JSON invalid sau null");
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  console.log("[/api/purchase] Body primit:", body);

  // 2. Verifică că body nu e null și e un obiect
  if (body === null || typeof body !== "object") {
    console.log("[/api/purchase] Body nu e obiect sau e null");
    return NextResponse.json(
      { error: "Payload invalid. Aștept un obiect JSON." },
      { status: 400 }
    );
  }

  // 3. Extrage câmpurile necesare
  const { userId, providerId, packageId } = body as {
    userId?: string;
    providerId?: string;
    packageId?: string;
  };

  console.log(
    "[/api/purchase] userId:",
    userId,
    "providerId:",
    providerId,
    "packageId:",
    packageId
  );

  // Verifică că cele trei câmpuri există și au tipul corect
  if (
    typeof userId !== "string" ||
    typeof providerId !== "string" ||
    typeof packageId !== "string"
  ) {
    console.log("[/api/purchase] Validare eșuată: lipsesc userId, providerId sau packageId");
    return NextResponse.json(
      { error: "Lipsește camp obligatoriu sau tip incorect." },
      { status: 400 }
    );
  }

  // 4. Obține detaliile pachetului din baza de date
  let pkg;
  try {
    pkg = await prisma.providerPackage.findUnique({
      where: { id: packageId },
      select: { totalSessions: true, providerId: true },
    });
  } catch (err: any) {
    console.error("[/api/purchase] Eroare la citirea pachetului:", err);
    return NextResponse.json(
      { error: "Eroare internă la citirea pachetului.", details: err.message },
      { status: 500 }
    );
  }

  if (!pkg) {
    console.log("[/api/purchase] Pachetul nu a fost găsit:", packageId);
    return NextResponse.json(
      { error: "Pachetul specificat nu există." },
      { status: 404 }
    );
  }

  // 5. Verifică că pachetul aparține acelui provider
  if (pkg.providerId !== providerId) {
    console.log(
      "[/api/purchase] Pachetul nu aparține provider-ului:",
      packageId,
      providerId
    );
    return NextResponse.json(
      { error: "Pachetul nu aparține provider-ului specificat." },
      { status: 400 }
    );
  }

  const totalSessions = pkg.totalSessions;

  // 6. Creează UserProviderPackage în Prisma
  try {
    const newUserPkg = await prisma.userProviderPackage.create({
      data: {
        userId,
        providerId,
        packageId,
        totalSessions,
        usedSessions: 0,
      },
    });
    console.log("[/api/purchase] UserProviderPackage creat:", newUserPkg);
    return NextResponse.json({ ok: true, data: newUserPkg }, { status: 201 });
  } catch (err: any) {
    console.error("Eroare la /api/purchase:", err);
    return NextResponse.json(
      {
        error: "Eroare internă la crearea UserProviderPackage.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
