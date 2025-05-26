// app/api/provider/[providerId]/tools/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(
  req: Request,
  { params }: { params: { providerId: string } | Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  let body: { tools?: string[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.tools)) {
    return NextResponse.json(
      { error: 'tools must be an array of IDs' },
      { status: 400 }
    );
  }

  // 1) Fetch only the tools that actually exist
  const existing = await prisma.tool.findMany({
    where: { id: { in: body.tools } },
    select: { id: true },
  });
  const validConnect = existing.map((t) => ({ id: t.id }));

  try {
    // 2) Update with only the valid IDs
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        tools: { set: validConnect },
      },
      include: { tools: true },
    });

    return NextResponse.json(updated.tools, { status: 200 });
  } catch (err: any) {
    console.error(err.stack);
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}
