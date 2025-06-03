// app/api/provider/[providerId]/packages/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";

// ----------------------------
// HANDLER pentru PUT (/api/provider/[providerId]/packages)
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  // 1) Așteptăm context.params și extragem providerId
  const { providerId } = await context.params;

  // 2) Parsăm JSON-ul din body pentru array-ul de pachete
  const { packages }: {
    packages: {
      service: string;
      totalSessions: number;
      price: number;
      expiresAt?: string;
    }[];
  } = await req.json();

  // 3) Transaction: șterge toate providerPackage existente pentru acest provider
  //    și creează noile înregistrări
  await prisma.$transaction([
    prisma.providerPackage.deleteMany({ where: { providerId } }),
    ...packages.map((p) =>
      prisma.providerPackage.create({
        data: {
          providerId,
          service: p.service,
          totalSessions: p.totalSessions,
          price: p.price,
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : undefined,
        },
      })
    ),
  ]);

  // 4) După tranzacție, obținem lista actualizată a pachetelor
  const updated = await prisma.providerPackage.findMany({
    where: { providerId },
  });

  // 5) Returnăm rezultatul ca JSON
  return NextResponse.json({ packages: updated });
}

// Exportăm metoda PUT “împachetată” cu withProviderAuth
export const PUT = withProviderAuth(putHandler);

// ----------------------------
// HANDLER pentru GET (/api/provider/[providerId]/packages)
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: { providerId: string } }
) {
  const { providerId } = await context.params;

  // 1) Obținem pachetele pentru acest provider și includem stripeAccountId
  const list = await prisma.providerPackage.findMany({
    where: { providerId },
    include: {
      provider: {
        select: {
          stripeAccountId: true,
        },
      },
    },
  });

  // 2) Mapăm obiectele astfel încât front-end-ul să aibă și `providerStripeAccountId`
  const formatted = list.map((pkg) => ({
    id: pkg.id,
    service: pkg.service,
    totalSessions: pkg.totalSessions,
    price: pkg.price,
    expiresAt: pkg.expiresAt,
    providerStripeAccountId: pkg.provider.stripeAccountId!, // sigur nu e null/undefined
  }));

  // 3) Returnăm ca JSON
  return NextResponse.json({ packages: formatted });
}

// Exportăm metoda GET “împachetată” cu withProviderAuth
export const GET = withProviderAuth(getHandler);
