import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // Caută utilizatorul
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { provider: true },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (user.provider) {
    return NextResponse.json({ message: "User is already a provider" }, { status: 400 });
  }

  // Creează un provider nou
  const newProvider = await prisma.provider.create({
    data: {
      user: { connect: { id: user.id } },
      description: "Furnizor de servicii",
    },
  });

  return NextResponse.json({ provider: newProvider }, { status: 200 });
}
