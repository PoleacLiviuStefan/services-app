// app/api/requests/[id]/approve/route.ts
import { NextResponse } from "next/server";
import type { NextRequest, NextParams } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: NextParams) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

   const { id } = await params;
  const reqItem = await prisma.approvalRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedById: token.sub as string,
      reviewedAt: new Date(),
    },
  });

  if (reqItem.type === "SPECIALITY") {
    await prisma.speciality.create({
      data: {
        name: reqItem.name,
        description: reqItem.description,
        price: reqItem.price ?? 0,
      },
    });
  } else if (reqItem.type === "TOOL") {
    await prisma.tool.create({
      data: {
        name: reqItem.name,
        description: reqItem.description,
      },
    });
  } else if (reqItem.type === "READING") {
    await prisma.reading.create({
      data: {
        name: reqItem.name,
        description: reqItem.description,
      },
    });
  }

  return NextResponse.json(reqItem);
}
