// app/api/provider/[providerId]/packages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ providerId: string }> }
) {
  // Așteptăm parametrul dinamic
  const { providerId } = await context.params;
  const body = await request.json();

  if (!body || !Array.isArray(body.packages)) {
    return NextResponse.json(
      { error: "'packages' trebuie să fie un array" },
      { status: 400 }
    );
  }

  type PkgInput = {
    id?: string;
    service?: unknown;
    totalSessions?: unknown;
    price?: unknown;
    expiresAt?: string;
    calendlyEventTypeUri?: string;
  };
  const packages = body.packages as PkgInput[];

  // Validare și parsare
  for (const [i, pkg] of packages.entries()) {
    if (typeof pkg.service !== "string" || pkg.service.trim() === "") {
      return NextResponse.json(
        { error: `La pachetul #${i + 1}: 'service' este obligatoriu și trebuie string` },
        { status: 400 }
      );
    }
    const ts = Number(pkg.totalSessions);
    const pr = Number(pkg.price);
    if (Number.isNaN(ts) || Number.isNaN(pr)) {
      return NextResponse.json(
        { error: `La pachetul #${i + 1}: 'totalSessions' și 'price' trebuie numere` },
        { status: 400 }
      );
    }
    pkg.totalSessions = ts;
    pkg.price = pr;
  }

  const incomingIds = packages
    .map((p) => p.id)
    .filter((id): id is string => typeof id === "string");
  await prisma.providerPackage.deleteMany({
    where: {
      providerId,
      id: { notIn: incomingIds },
    },
  });

  await Promise.all(
    packages.map((pkg) => {
      const baseData = {
        service: pkg.service!.trim(),
        totalSessions: pkg.totalSessions as number,
        price: pkg.price as number,
        expiresAt: pkg.expiresAt ? new Date(pkg.expiresAt) : null,
        calendlyEventTypeUri: pkg.calendlyEventTypeUri?.trim() || null,
      };
      if (pkg.id) {
        return prisma.providerPackage.update({
          where: { id: pkg.id },
          data: baseData,
        });
      }
      return prisma.providerPackage.create({
        data: {
          ...baseData,
          provider: { connect: { id: providerId } },
        },
      });
    })
  );

  const refreshed = await prisma.providerPackage.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ packages: refreshed });({ packages: refreshed });
}
