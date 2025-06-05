// File: app/api/user/bought-packages/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 1. Verificăm sesiunea NextAuth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Nu ești autentificat." },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // 2. Interogăm Prisma pentru pachetele cumpărate de acest user
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
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // 3. Returnăm rezultatul
  return NextResponse.json({ packages: boughtPackages });
}
