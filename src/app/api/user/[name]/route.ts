// src/app/api/user/[name]/route.ts
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * În App Router, context.params e un Promise<{ name: string }>
 */
type AsyncRouteContext = {
  params: Promise<{ name: string }>
}

type OnlinePayload = { online: boolean }

/**
 * Actualizează doar `online` pentru provider-ii existenți.
 * Aruncă:
 *  - 'USER_NOT_FOUND' dacă nu există user
 *  - Prisma.PrismaClientKnownRequestError P2025 dacă nu există provider
 */
async function setOnlineStatus(name: string, online: boolean): Promise<boolean> {
  const decoded = name.replace(/-/g, ' ').trim()

  const user = await prisma.user.findFirst({
    where: { name: { equals: decoded, mode: 'insensitive' } },
    select: { id: true }
  })
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  // UPDATE fără create: dacă nu există provider, va arunca P2025
  const updated = await prisma.provider.update({
    where: { userId: user.id },
    data: { online }
  })

  return updated.online
}

/**
 * GET /api/user/[name]
 * Returnează datele provider-ului (inclusiv online)
 */
export async function GET(
  _req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  const { name: slug } = await params
  const decoded = slug.replace(/-/g, ' ').trim()

  // 1️⃣ Preluăm user + provider cu toate datele necesare
  const user = await prisma.user.findFirst({
    where: { name: { equals: decoded, mode: 'insensitive' } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      provider: {
        select: {
          id: true,
          online: true,
          description: true,
          videoUrl: true,
          grossVolume: true,
          calendlyCalendarUri: true,
          reading: {
            select: { id: true, name: true, description: true }
          },
          specialities: {
            select: { id: true, name: true, description: true, price: true }
          },
          tools: {
            select: { id: true, name: true, description: true }
          },
          mainSpeciality: {
            select: { id: true, name: true }
          },
          mainTool: {
            select: { id: true, name: true }
          },
          reviews: {
            select: { rating: true }
          },
          providerPackages: {
            select: {
              id: true,
              service: true,
              totalSessions: true,
              price: true,
              createdAt: true,
              expiresAt: true
            }
          }
        }
      }
    }
  })

  if (!user?.provider) {
    return NextResponse.json(
      { error: `Providerul pentru '${decoded}' nu a fost găsit.` },
      { status: 404 }
    )
  }

  const p = user.provider

  // 2️⃣ Agregăm reviewsCount și averageRating
  const reviewsCount = p.reviews.length
  const avg =
    reviewsCount > 0
      ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
      : 0
  const averageRating = parseFloat(avg.toFixed(2))

  // 3️⃣ Construim obiectul final
  const payload = {
    id: p.id,
    user: {
      id: user.id,
      name: user.name!,
      email: user.email!,
      image: user.image || null
    },
    online: p.online,
    description: p.description || '',
    videoUrl: p.videoUrl || null,
    grossVolume: p.grossVolume,
    scheduleLink: p.calendlyCalendarUri || null,
    reading: p.reading || null,
    specialities: p.specialities,
    tools: p.tools,
    mainSpeciality: p.mainSpeciality,
    mainTool: p.mainTool,
    reviewsCount,
    averageRating,
    providerPackages: p.providerPackages
  }

  return NextResponse.json({ provider: payload }, { status: 200 })
}
/**
 * PATCH /api/user/[name]
 * Body: { online: boolean }
 * Actualizează câmpul `online` într-un provider existent.
 */
export async function PATCH(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  // parse JSON payload
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 })
  }

  // validate payload
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('online' in payload) ||
    typeof (payload as OnlinePayload).online !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'Aștept `{ online: boolean }` ca payload.' },
      { status: 400 }
    )
  }

  const { name: slug } = await params
  try {
    const newStatus = await setOnlineStatus(slug, (payload as OnlinePayload).online)
    return NextResponse.json({ ok: true, online: newStatus })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'User nu a fost găsit.' },
        { status: 404 }
      )
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Provider pentru acest user nu există.' },
        { status: 404 }
      )
    }
    console.error('PATCH /api/user/[name] error:', err)
    return NextResponse.json({ error: 'Eroare internă.' }, { status: 500 })
  }
}

/**
 * POST /api/user/[name]
 * Beacon-urile trimit POST, așa că redirecționăm POST → PATCH
 */
export async function POST(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  return PATCH(req, { params })
}
