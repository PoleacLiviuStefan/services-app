// app/api/provider/[providerId]/bought-packages/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ providerId: string }> }
) {
  try {
    // 1️⃣ extragem userId (param providerId reprezintă userId al provider-ului)
    const { providerId: userId } = await context.params
    console.log('User ID from URL:', userId)

    // 2️⃣ verificăm sesiunea – doar user-ii logați pot vedea pachete
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3️⃣ găsim în baza de date provider-ul corespunzător userId-ului
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    })
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // 4️⃣ interogăm prisma pentru pachetele cumpărate de current user la acest provider
    const boughtPackages = await prisma.userProviderPackage.findMany({
      where: {
        providerId: provider.id,
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageId: true,
        totalSessions: true,
        usedSessions: true,
        createdAt: true,
        expiresAt: true,
        providerPackage: {
          select: {
            service: true,
            totalSessions: true,
            price: true,
            expiresAt: true
          }
        }
      }
    })

    // 5️⃣ răspundem cu lista pachetelor cumpărate
    return NextResponse.json({ boughtPackages }, { status: 200 })
  } catch (e: any) {
    console.error('Error fetching provider bought-packages:', e)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
