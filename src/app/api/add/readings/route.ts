import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const readings = await prisma.reading.findMany();
  return NextResponse.json(readings);
}

export async function POST(request: Request) {
  const { name, description = '' } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const created = await prisma.reading.create({
    data: { name, description },
  });
  return NextResponse.json(created, { status: 201 });
}