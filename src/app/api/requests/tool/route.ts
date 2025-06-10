// app/api/requests/tool/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const request = await prisma.approvalRequest.create({
    data: {
      type: "TOOL",
      name,
      description: description ?? "",
      createdById: token.sub as string,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
