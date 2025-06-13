import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;
  const { packages }: { packages: Array<{
    id?: string;
    service: string;
    totalSessions: number;
    price: number;
    expiresAt?: string;
    calendlyEventTypeUri?: string;
  }> } = await request.json();

  // 1) Remove any packages the user has deleted
  const incomingIds = packages.map((p) => p.id).filter(Boolean) as string[];
  await prisma.providerPackage.deleteMany({
    where: {
      providerId,
      id: { notIn: incomingIds },
    },
  });

  // 2) Upsert each package
  const upserted = await Promise.all(
    packages.map((pkg) =>
      pkg.id
        ? prisma.providerPackage.update({
            where: { id: pkg.id },
            data: {
              service: pkg.service,
              totalSessions: pkg.totalSessions,
              price: pkg.price,
              expiresAt: pkg.expiresAt ? new Date(pkg.expiresAt) : null,
              calendlyEventTypeUri: pkg.calendlyEventTypeUri ?? null,
            },
          })
        : prisma.providerPackage.create({
            data: {
              providerId,
              service: pkg.service,
              totalSessions: pkg.totalSessions,
              price: pkg.price,
              expiresAt: pkg.expiresAt ? new Date(pkg.expiresAt) : null,
              calendlyEventTypeUri: pkg.calendlyEventTypeUri ?? null,
            },
          })
    )
  );

  // 3) Return the full, fresh list
  const refreshed = await prisma.providerPackage.findMany({
    where: { providerId },
  });

  return NextResponse.json({ packages: refreshed });
}
