import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const packages = await prisma.providerPackage.findMany();
  return NextResponse.json(packages);
}

export async function POST(request: Request) {
  const { providerId, service, totalSessions, price, expiresAt } = await request.json();
  if (!providerId || !service || !totalSessions || !price) {
    return NextResponse.json({ error: 'providerId, service, totalSessions and price are required' }, { status: 400 });
  }
  const created = await prisma.providerPackage.create({
    data: { providerId, service, totalSessions, price, expiresAt: expiresAt || null },
  });
  return NextResponse.json(created, { status: 201 });
}