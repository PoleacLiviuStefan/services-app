import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { packages }: { packages: { service: string; totalSessions: number; price: number; expiresAt?: string }[] } = await req.json();
  // transaction: clear old providerPackages and create new ones
  await prisma.$transaction([
    prisma.providerPackage.deleteMany({ where: { providerId: params.providerId } }),
    ...packages.map((p) =>
      prisma.providerPackage.create({
        data: {
          providerId: params.providerId,
          service: p.service,
          totalSessions: p.totalSessions,
          price: p.price,
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : undefined,
        },
      })
    ),
  ]);
  const updated = await prisma.providerPackage.findMany({
    where: { providerId: params.providerId }
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const list = await prisma.providerPackage.findMany({
    where: { providerId: params.providerId }
  });
  return NextResponse.json(list);
}