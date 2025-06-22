// File: app/api/user/bought-packages/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";

export async function GET() {
  // 1. Verificăm sesiunea
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Nu ești autentificat." },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // 2. Vedem dacă e provider
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: { id: true },
  });

  // 3a. Pachete cumpărate (client)
  const boughtPackages = await prisma.userProviderPackage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      providerId: true,
      packageId: true,
      totalSessions: true,
      usedSessions: true,
      createdAt: true,
      expiresAt: true,
      providerPackage: {
        select: {
          service: true,
          totalSessions: true,
          price: true,
          createdAt: true,
          expiresAt: true,
        },
      },
      provider: {
        select: {
          user: { select: { name: true } },
        },
      },
      invoices: {
        select: {
          id: true,
          number: true,
          url: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // 3b. Pachete vândute (provider)
  let soldPackages = [];
  if (provider) {
    soldPackages = await prisma.userProviderPackage.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        packageId: true,
        totalSessions: true,
        usedSessions: true,
        createdAt: true,
        expiresAt: true,
        providerPackage: {
          select: {
            service: true,
            totalSessions: true,
            price: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        user: {
          select: { name: true },
        },
        invoices: {
          select: {
            id: true,
            number: true,
            url: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // 4. Returnăm ambele liste
  return NextResponse.json({ boughtPackages, soldPackages });
}
