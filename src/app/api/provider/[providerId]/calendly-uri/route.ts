import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { calendlyCalendarUri }: { calendlyCalendarUri: string } = await req.json();
  const updated = await prisma.provider.update({
    where: { id: params.providerId },
    data: { calendlyCalendarUri },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const { calendlyCalendarUri } = await prisma.provider.findUnique({
    where: { id: params.providerId },
    select: { calendlyCalendarUri: true }
  }) || { calendlyCalendarUri: null };
  return NextResponse.json({ calendlyCalendarUri });
}