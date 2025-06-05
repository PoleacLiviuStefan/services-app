// File: src/app/api/purchase/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  // 1. Obținem sesiunea curentă
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Trebuie să fii autentificat." },
      { status: 401 }
    );
  }
  const currentUserId = session.user.id;

  // 2. Citește JSON-ul din body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.log("[/api/purchase] JSON invalid sau null");
    return NextResponse.json(
      { error: "JSON invalid." },
      { status: 400 }
    );
  }

  // 3. Verifică că body este obiect și extrage packageId
  if (body === null || typeof body !== "object") {
    console.log("[/api/purchase] Body nu e obiect sau e null");
    return NextResponse.json(
      { error: "Payload invalid. Aștept un obiect JSON." },
      { status: 400 }
    );
  }
  const { packageId } = body as { packageId?: string };

  if (typeof packageId !== "string") {
    console.log("[/api/purchase] Lipsă sau tip incorect pentru packageId");
    return NextResponse.json(
      { error: "Lipsește packageId sau tipul este incorect." },
      { status: 400 }
    );
  }

  // 4. Obține detaliile pachetului din baza de date
  let pkg;
  try {
    pkg = await prisma.providerPackage.findUnique({
      where: { id: packageId },
      select: {
        totalSessions: true,
        providerId: true,
      },
    });
  } catch (err: any) {
    // În loc de console.error(err), logăm doar stack-ul
    console.error("[/api/purchase] Eroare la citirea pachetului:", err.stack);
    return NextResponse.json(
      {
        error: "Eroare internă la citirea pachetului.",
        details: err.message ?? "Unknown error"
      },
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

  // 5. Preia providerId-ul care deține pachetul
  const { providerId: providerIdOfPackage, totalSessions } = pkg;

  // 6. Verifică dacă utilizatorul curent este un provider și obține providerId-ul său
  let myProvider;
  try {
    myProvider = await prisma.provider.findUnique({
      where: { userId: currentUserId },
      select: { id: true },
    });
  } catch (err: any) {
    console.error(
      "[/api/purchase] Eroare la citirea provider-ului curent:",
      // Logăm doar stack-ul
      err.stack
    );
    return NextResponse.json(
      {
        error: "Eroare internă la citirea provider-ului curent.",
        details: err.message ?? "Unknown error"
      },
      { status: 500 }
    );
  }

  // 7. Dacă utilizatorul este provider și încearcă să își cumpere propriul pachet, respingem
  if (myProvider && myProvider.id === providerIdOfPackage) {
    return NextResponse.json(
      { error: "Nu poți cumpăra propriul tău pachet." },
      { status: 400 }
    );
  }

  // 8. Creează UserProviderPackage (clientul cumpără pachetul)
  try {
    const newUserPkg = await prisma.userProviderPackage.create({
      data: {
        userId: currentUserId,           // ID-ul user-ului care cumpără
        providerId: providerIdOfPackage, // ID-ul provider-ului care deține pachetul
        packageId,                       // ID-ul pachetului
        totalSessions,                   // totalSessions din pachet
        usedSessions: 0,
      },
    });
    console.log("[/api/purchase] UserProviderPackage creat:", newUserPkg);
    return NextResponse.json(
      { ok: true, data: newUserPkg },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(
      "[/api/purchase] Eroare la crearea UserProviderPackage:",
      // Iar aici, pentru a evita bug-ul din Next 15, afișăm doar stack-ul
      err.stack
    );
    return NextResponse.json(
      {
        error: "Eroare internă la crearea UserProviderPackage.",
        details: err.message ?? "Unknown error"
      },
      { status: 500 }
    );
  }
}
