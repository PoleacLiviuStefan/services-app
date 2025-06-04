// app/api/add/packages/route.ts
import { NextResponse } from 'next/server';        // API-ul App Router 🡒 NextResponse
import { prisma } from '@/lib/prisma';             // instanța Prisma Client

/**
 * GET  /api/add/packages
 * Returnează toate pachetele existente
 */
export async function GET() {
  const packages = await prisma.providerPackage.findMany();
  return NextResponse.json(packages);              // răspuns JSON standard
}

/**
 * POST /api/add/packages
 * Creează un nou pachet pentru un provider
 */
export async function POST(request: Request) {
  // body-ul vine ca flux de bytes ➜ parsăm cu .json()
  const { providerId, service, totalSessions, price, expiresAt } =
    await request.json();

  /* -------- validare minimă -------- */
  if (!providerId || !service || !totalSessions || !price) {
    return NextResponse.json(
      { error: 'providerId, service, totalSessions și price sunt obligatorii' },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.providerPackage.create({
      data: {
        providerId,
        service: service.trim(),
        totalSessions: Number(totalSessions),
        price: Number(price),
        // dacă stringul este gol sau undefined trimitem null, altfel parsăm în Date
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    // Prisma aruncă erori detaliate; le logăm înainte ca Next să le mascheze
    console.error('Prisma error:', err?.message || err);
    return NextResponse.json(
      { error: 'Eroare internă la salvarea pachetului' },
      { status: 500 },
    );
  }
}
