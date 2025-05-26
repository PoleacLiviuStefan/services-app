import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { mainToolId }: { mainToolId: string } = await req.json();
  const updated = await prisma.provider.update({
    where: { id: params.providerId },
    data: { mainToolId },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const provider = await prisma.provider.findUnique({
    where: { id: params.providerId },
    include: { mainTool: true }
  });
  return NextResponse.json(provider?.mainTool || null);
}