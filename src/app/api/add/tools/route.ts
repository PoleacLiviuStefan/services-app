import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tools = await prisma.tool.findMany();
  return NextResponse.json(tools);
}

export async function POST(request: Request) {
  const { name, description = '' } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const created = await prisma.tool.create({
    data: { name, description },
  });
  return NextResponse.json(created, { status: 201 });
}