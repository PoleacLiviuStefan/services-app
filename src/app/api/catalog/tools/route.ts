// src/app/api/tools/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      select: {
        id: true,
        name: true,
        description: true,

        // relația Many-to-Many
        providers: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        }
      },
    })

    return NextResponse.json(tools, { status: 200 })
  } catch (error) {
    console.error("Eroare la obținerea tool-urilor:", error)
    return NextResponse.json(
      { error: "A apărut o eroare la obținerea uneltelor." },
      { status: 500 }
    )
  }
}
