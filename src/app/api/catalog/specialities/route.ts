// src/app/api/specialities/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const specialities = await prisma.speciality.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
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
              },
            },
          },
        },
      },
    })

    return NextResponse.json(specialities, { status: 200 })
  } catch (error) {
    console.error("Eroare la obținerea specialităților:", error)
    return NextResponse.json(
      { error: "A apărut o eroare la obținerea serviciilor." },
      { status: 500 }
    )
  }
}
