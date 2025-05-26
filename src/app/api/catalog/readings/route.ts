// src/app/api/readings/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const readings = await prisma.reading.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        // relația Many-to-Many cu Provider
        providers: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(readings, { status: 200 })
  } catch (error) {
    console.error("Eroare la obținerea reading style-urilor:", error)
    return NextResponse.json(
      { error: "A apărut o eroare la obținerea reading style-urilor." },
      { status: 500 }
    )
  }
}
