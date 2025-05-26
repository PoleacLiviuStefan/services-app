import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { providerId: string } | Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { reading: true },
  });
  return NextResponse.json(provider?.reading ?? {});
}

export async function PUT(
  req: Request,
  { params }: { params: { providerId: string } | Promise<{ providerId: string }> }
) {
  const { providerId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { readingId } = body;
  // allow clearing the relation
  if (readingId === "") {
    // okay, unset the relation
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { readingId: null },
      include: { reading: true },
    });
    return NextResponse.json(updatedProvider.reading ?? {}, { status: 200 });
  }

  if (typeof readingId !== "string") {
    return NextResponse.json(
      { error: "readingId must be a string (or empty to clear)" },
      { status: 400 }
    );
  }

  // 1) confirm the Reading exists
  const readingExists = await prisma.reading.findUnique({
    where: { id: readingId },
    select: { id: true },
  });
  if (!readingExists) {
    return NextResponse.json(
      { error: `No Reading found with id=${readingId}` },
      { status: 400 }
    );
  }

  // 2) now safe to update
  try {
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { readingId },
      include: { reading: true },
    });
    return NextResponse.json(updatedProvider.reading ?? {}, { status: 200 });
  } catch (err: any) {
    // Prisma itself should never violate the FK now, but just in case:
    console.error(err.stack);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}