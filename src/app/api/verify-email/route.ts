// app/api/verify-email/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token lipsă.' }, { status: 400 })
    }

    // Găsește recordul de verificare
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    })

    if (!verification) {
      return NextResponse.json({ error: 'Token invalid.' }, { status: 400 })
    }

    // Verifică expirarea
    if (verification.expiresAt < new Date()) {
      // opțional: șterge recordul expirat
      await prisma.emailVerification.delete({ where: { token } })
      return NextResponse.json({ error: 'Token expirat.' }, { status: 400 })
    }

    // Marchează userul ca verificat
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    })

    // Șterge recordul de verificare
    await prisma.emailVerification.delete({ where: { token } })

    return NextResponse.json({ success: true, message: 'Email verificat cu succes.' })
  } catch (err) {
    console.error('verify-email error:', err)
    return NextResponse.json({ error: 'Eroare internă.' }, { status: 500 })
  }
}
