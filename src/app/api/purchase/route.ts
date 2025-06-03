// File: app/api/purchase/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajustează calea dacă folosești alta structură

export async function POST(request: Request) {
  try {
    // 1. Citim body-ul și verificăm dacă nu e null
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Payload lipsă sau incompatibil (trebuie obiect JSON)" },
        { status: 400 }
      );
    }

    const { userId, providerId, packageId } = body as {
      userId?: string;
      providerId?: string;
      packageId?: string;
    };

    // 2. Validăm că proprietățile există și sunt șiruri nenule
    if (!userId || !providerId || !packageId) {
      return NextResponse.json(
        { error: "Parametrii userId, providerId și packageId sunt obligatorii." },
        { status: 400 }
      );
    }

    // 3. Preluăm ProviderPackage pentru a ști totalSessions și expiresAt
    const providerPackage = await prisma.providerPackage.findUnique({
      where: { id: packageId },
      select: { totalSessions: true, expiresAt: true },
    });
    if (!providerPackage) {
      return NextResponse.json(
        { error: "ProviderPackage inexistent pentru packageId dat." },
        { status: 404 }
      );
    }

    // 4. Creăm UserProviderPackage
    const now = new Date();
    const userProviderPackage = await prisma.userProviderPackage.create({
      data: {
        userId: userId,
        providerId: providerId,
        packageId: packageId,
        totalSessions: providerPackage.totalSessions,
        createdAt: now,
        expiresAt: providerPackage.expiresAt,
        // usedSessions rămâne 0 implicit
      },
    });

    // 5. Returnăm obiectul creat și status 201
    return NextResponse.json(
      { userProviderPackage },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Eroare la /api/purchase:", error);
    return NextResponse.json(
      { error: "Eroare internă la crearea UserProviderPackage.", details: error.message },
      { status: 500 }
    );
  }
}
