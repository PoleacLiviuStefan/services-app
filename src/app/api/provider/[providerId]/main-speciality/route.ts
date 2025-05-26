import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { mainSpecialityId }: { mainSpecialityId: string } = await req.json();
  const updated = await prisma.provider.update({
    where: { id: params.providerId },
    data: { mainSpecialityId },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const provider = await prisma.provider.findUnique({
    where: { id: params.providerId },
    include: { mainSpeciality: true }
  });
  return NextResponse.json(provider?.mainSpeciality || null);
}