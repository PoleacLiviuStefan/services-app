// app/api/requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const requests = await prisma.approvalRequest.findMany({
    select: {
      id: true,
      type: true,
      name: true,
      description: true,
      price: true,
      status: true,
      createdAt: true,                    // when it was created
      createdBy: {                        // who created it
        select: {
          id: true,
          name: true,
        }
      }
    },
  });

  // flatten createdBy into createdByName if you prefer:
  const result = requests.map(r => ({
    ...r,
    createdByName: r.createdBy.name,
  }));

  return NextResponse.json(result);
}
