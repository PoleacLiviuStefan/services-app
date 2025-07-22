// File: src/app/api/purchase/route.ts - CU ACTUALIZAREA GROSS VOLUME

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

  // 4. Obține detaliile pachetului din baza de date (INCLUSIV PREȚUL)
  let pkg;
  try {
    pkg = await prisma.providerPackage.findUnique({
      where: { id: packageId },
      select: {
        totalSessions: true,
        providerId: true,
        price: true, // 🆕 Adăugat pentru gross volume
        service: true, // 🆕 Pentru logging
      },
    });
  } catch (err: any) {
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

  // 5. Preia providerId-ul care deține pachetul și prețul
  const { providerId: providerIdOfPackage, totalSessions, price: packagePrice, service: packageService } = pkg;

  console.log(`💰 Pachet găsit: ${packageService} - ${packagePrice}€ - ${totalSessions} sesiuni`);

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

  // 8. 🆕 CREEAZĂ UserProviderPackage ȘI ACTUALIZEAZĂ GROSS VOLUME ÎN TRANZACȚIE
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Creează UserProviderPackage (clientul cumpără pachetul)
      const newUserPkg = await tx.userProviderPackage.create({
        data: {
          userId: currentUserId,           // ID-ul user-ului care cumpără
          providerId: providerIdOfPackage, // ID-ul provider-ului care deține pachetul
          packageId,                       // ID-ul pachetului
          totalSessions,                   // totalSessions din pachet
          usedSessions: 0,
        },
      });

      // 🆕 ACTUALIZEAZĂ GROSS VOLUME PE PROVIDER
      const updatedProvider = await tx.provider.update({
        where: { id: providerIdOfPackage },
        data: {
          grossVolume: {
            increment: packagePrice // Adaugă prețul pachetului la gross volume
          }
        },
        select: {
          grossVolume: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`💰 GrossVolume actualizat pentru provider ${providerIdOfPackage}: +${packagePrice}€ → ${updatedProvider.grossVolume}€`);

      return {
        userPackage: newUserPkg,
        providerInfo: {
          newGrossVolume: updatedProvider.grossVolume,
          grossVolumeIncrease: packagePrice,
          providerName: updatedProvider.user.name || updatedProvider.user.email
        }
      };
    });

    console.log("[/api/purchase] ✅ Cumpărare completă cu succes:");
    console.log(`   - UserProviderPackage creat: ${result.userPackage.id}`);
    console.log(`   - Client: ${currentUserId}`);
    console.log(`   - Pachet: ${packageService} (${totalSessions} sesiuni)`);
    console.log(`   - Preț: ${packagePrice}€`);
    console.log(`   - Provider gross volume: ${result.providerInfo.newGrossVolume}€ (+${result.providerInfo.grossVolumeIncrease}€)`);
    console.log(`   - Provider: ${result.providerInfo.providerName}`);

    return NextResponse.json(
      { 
        ok: true, 
        data: result.userPackage,
        // 🆕 Informații suplimentare despre actualizarea gross volume
        grossVolumeInfo: {
          packagePrice: packagePrice,
          providerGrossVolume: result.providerInfo.newGrossVolume,
          grossVolumeIncrease: result.providerInfo.grossVolumeIncrease,
          providerName: result.providerInfo.providerName
        },
        message: `Pachetul ${packageService} a fost cumpărat cu succes! Provider-ul a fost creditat cu ${packagePrice}€.`
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(
      "[/api/purchase] Eroare la crearea UserProviderPackage și actualizarea gross volume:",
      err.stack
    );

    // 🆕 Verifică tipuri de erori specifice
    if (err.code === 'P2002') {
      return NextResponse.json(
        {
          error: "Ai deja acest pachet cumpărat.",
          details: "Duplicate purchase detected"
        },
        { status: 409 }
      );
    }

    if (err.code === 'P2025') {
      return NextResponse.json(
        {
          error: "Provider-ul sau pachetul nu mai există.",
          details: "Record not found"
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Eroare internă la procesarea cumpărăturii.",
        details: err.message ?? "Unknown error"
      },
      { status: 500 }
    );
  }
}