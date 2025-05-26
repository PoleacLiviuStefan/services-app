import {prisma} from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { providerId: string } }) {
  const { specialities }: { specialities: string[] } = await req.json();
  const updated = await prisma.provider.update({
    where: { id: params.providerId },
    data: {
      specialities: {
        set: specialities.map((id) => ({ id })),
      },
    },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: { providerId: string } }) {
  const record = await prisma.provider.findUnique({
    where: { id: params.providerId },
    include: { specialities: true }
  });
  return NextResponse.json(record?.specialities || []);
}