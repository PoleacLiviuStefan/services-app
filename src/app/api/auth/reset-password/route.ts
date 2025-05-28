import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'

const resetSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(6, 'Parola trebuie să aibă minim 6 caractere')
    .regex(/[A-Z]/, 'Trebuie o literă mare')
    .regex(/[^A-Za-z0-9]/, 'Trebuie un caracter special'),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { token, newPassword } = parsed.data

  // Găsește token
  const record = await prisma.passwordReset.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token invalid sau expirat.' }, { status: 400 })
  }

  // Hash + update parola
  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hash },
  })

  // Șterge recordul
  await prisma.passwordReset.delete({ where: { token } })

  return NextResponse.json({ success: true })
}
