import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";


export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma?.user.findUnique({
    where: { email: session.user.email },
    include: { provider: true },
  });

  if (!user || !user.provider) {
    return NextResponse.json({ error: "Provider data not found for this user" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: {
      fromUserId: user.id, // aici user.id trebuie să existe
    },
  });
  

  return NextResponse.json({ reviews }, { status: 200 });
}
