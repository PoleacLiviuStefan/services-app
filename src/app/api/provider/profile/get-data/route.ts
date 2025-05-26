// src/app/api/user/provider/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // 1. Verificăm sesiunea
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Trebuie să fii autentificat.' },
      { status: 401 }
    )
  }

  // 2. Preluăm user-ul curent
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })
  if (!user) {
    return NextResponse.json(
      { error: 'User nu a fost găsit.' },
      { status: 404 }
    )
  }

  // 3. Preluăm profilul de provider
  const provider = await prisma.provider.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      online: true,
      description: true,
      videoUrl: true,
      grossVolume: true,
      reading: {
        select: { id: true, name: true, description: true }
      },
      specialities: {
        select: { id: true, name: true, description: true }
      },
      tools: {
        select: { id: true, name: true }
      },
      mainSpeciality: {
        select: { id: true, name: true }
      },
      mainTool: {
        select: { id: true, name: true }
      },
      providerPackages: {
        select: {
          id: true,
          service: true,
          totalSessions: true,
          price: true,
          expiresAt: true
        }
      }
    }
  })

  if (!provider) {
    return NextResponse.json(
      { error: 'Nu ai un profil de provider.' },
      { status: 404 }
    )
  }

  // 4. Preluăm consultațiile viitoare și cele avute
  const now = new Date()
  const futureSessions = await prisma.consultingSession.findMany({
    where: {
      providerId: provider.id,
      scheduledAt: { gte: now }
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      isFinished: true,
      client: {
        select: { id: true, name: true, image: true }
      },
      speciality: {
        select: { id: true, name: true }
      }
    }
  })

  const pastSessions = await prisma.consultingSession.findMany({
    where: {
      providerId: provider.id,
      scheduledAt: { lt: now }
    },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      scheduledAt: true,
      isFinished: true,
      client: {
        select: { id: true, name: true, image: true }
      },
      speciality: {
        select: { id: true, name: true }
      }
    }
  })

  // 5. Returnăm totul către client
  return NextResponse.json({
    provider,
    futureSessions,
    pastSessions
  })
}
