// app/api/requests/[id]/reject/route.ts
import { NextResponse } from "next/server";
import type { NextRequest, NextParams } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: NextParams) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params.id as string;
  const reqItem = await prisma.approvalRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: token.sub as string,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(reqItem);
}
