// File: src/app/api/provider/[providerId]/calendly/map-event-type/route.ts
import { NextResponse, RequestEvent } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT({ params, request }: RequestEvent) {
  const { providerId } = await params;
  const { calendlyEventTypeUri, packageId } = await request.json();

  if (!calendlyEventTypeUri || !packageId) {
    return NextResponse.json(
      { error: "URI eveniment sau packageId lipsesc." },
      { status: 400 }
    );
  }

  const pkg = await prisma.providerPackage.findUnique({
    where: { id: packageId },
    select: { providerId: true },
  });
  if (!pkg || pkg.providerId !== providerId) {
    return NextResponse.json(
      { error: "Pachet invalid pentru acest provider." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction([
      prisma.providerPackage.updateMany({
        where: { providerId, calendlyEventTypeUri },
        data: { calendlyEventTypeUri: null },
      }),
      prisma.providerPackage.update({
        where: { id: packageId },
        data: { calendlyEventTypeUri },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Mapping save error:", e);
    return NextResponse.json(
      { error: "Nu s-a putut salva maparea." },
      { status: 500 }
    );
  }
}
