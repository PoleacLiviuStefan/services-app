import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/mail'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'Email invalid.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // nu expune existența
    return new NextResponse({"error":"No user found"}, { status: 404 })
  }

  await prisma.passwordReset.deleteMany({ where: { userId: user.id } })
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60)
  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  })
  await sendPasswordResetEmail(email, token)

  // răspuns fără body
  return new NextResponse(null, { status: 204 })
}
