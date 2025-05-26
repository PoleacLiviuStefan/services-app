import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { videoUrl }: { videoUrl: string } = await req.json();
  const updated = await prisma.provider.update({
    where: { id: params.providerId },
    data: { videoUrl },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const { videoUrl } = await prisma.provider.findUnique({
    where: { id: params.providerId },
    select: { videoUrl: true }
  }) || { videoUrl: null };
  return NextResponse.json({ videoUrl });
}