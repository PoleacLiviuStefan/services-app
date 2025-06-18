// app/api/add/packages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET  /api/add/packages
 * Returnează toate pachetele existente
 */
export async function GET() {
  try {
    const packages = await prisma.providerPackage.findMany();
    return NextResponse.json(packages);
  } catch (err: any) {
    console.error('Prisma error on GET /api/add/packages:', err);
    return NextResponse.json(
      { error: 'Eroare internă la citirea pachetelor' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/add/packages
 * Creează un nou pachet pentru un provider
 */
export async function POST(request: Request) {
  const { providerId, service, totalSessions, price, expiresAt } =
    await request.json();

  // --- validare minimă ---
  if (!providerId || !service || !totalSessions || !price) {
    return NextResponse.json(
      { error: 'providerId, service, totalSessions și price sunt obligatorii' },
      { status: 400 },
    );
  }

  // --- parse și validate numbers ---
  const ts = Number(totalSessions);
  const pr = Number(price);
  if (Number.isNaN(ts) || Number.isNaN(pr)) {
    return NextResponse.json(
      { error: 'totalSessions și price trebuie să fie numere valide' },
      { status: 400 },
    );
  }

  // --- parse și validate expiresAt (opțional) ---
  let expiresDate: Date | null = null;
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    const parsed = Date.parse(expiresAt);
    if (Number.isNaN(parsed)) {
      return NextResponse.json(
        { error: 'expiresAt nu este un format ISO valid' },
        { status: 400 },
      );
    }
    expiresDate = new Date(parsed);
  }

  try {
    const created = await prisma.providerPackage.create({
      data: {
        service:        service.trim(),
        totalSessions:  ts,
        price:          pr,
        expiresAt:      expiresDate,
        provider: {
          connect: { id: providerId },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    // dump full error for debugging
    console.error('Prisma error on POST /api/add/packages:', err);
    return NextResponse.json(
      { error: 'Eroare internă la salvarea pachetului' },
      { status: 500 },
    );
  }
}