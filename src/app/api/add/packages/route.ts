// app/api/provider/[providerId]/packages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET  /api/provider/[providerId]/packages
 * Returnează toate pachetele unui anumit provider
 */
export async function GET(
  request: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;
  try {
    const packages = await prisma.providerPackage.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(packages);
  } catch (err: any) {
    console.error('Prisma error on GET /packages:', err);
    return NextResponse.json(
      { error: 'Eroare internă la citirea pachetelor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/provider/[providerId]/packages
 * Creează un nou pachet pentru provider-ul dat
 */
export async function POST(
  request: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;
  const {
    service,
    totalSessions,
    price,
    expiresAt,
    calendlyEventTypeUri,
  } = await request.json();

  // --- validare minimă ---
  if (!service || totalSessions == null || price == null) {
    return NextResponse.json(
      { error: 'service, totalSessions și price sunt obligatorii' },
      { status: 400 }
    );
  }

  // --- parse și validate numbers ---
  const ts = Number(totalSessions);
  const pr = Number(price);
  if (Number.isNaN(ts) || Number.isNaN(pr)) {
    return NextResponse.json(
      { error: 'totalSessions și price trebuie să fie numere valide' },
      { status: 400 }
    );
  }

  // --- parse și validate expiresAt (opțional) ---
  let expiresDate: Date | null = null;
  if (expiresAt) {
    const parsed = Date.parse(expiresAt);
    if (Number.isNaN(parsed)) {
      return NextResponse.json(
        { error: 'expiresAt nu este un format ISO valid' },
        { status: 400 }
      );
    }
    expiresDate = new Date(parsed);
  }

  // --- validate calendlyEventTypeUri (opțional) ---
  const calendlyUri =
    typeof calendlyEventTypeUri === 'string' && calendlyEventTypeUri.trim() !== ''
      ? calendlyEventTypeUri.trim()
      : null;

  try {
    const created = await prisma.providerPackage.create({
      data: {
        service: service.trim(),
        totalSessions: ts,
        price: pr,
        expiresAt: expiresDate,
        calendlyEventTypeUri: calendlyUri,
        provider: {
          connect: { id: providerId },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Prisma error on POST /packages:', err);
    return NextResponse.json(
      { error: 'Eroare internă la salvarea pachetului' },
      { status: 500 }
    );
  }
}