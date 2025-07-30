// app/api/register/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { sendVerificationEmail } from '@/lib/mail'
import { formatForUrl } from '@/utils/helper' // 🆕 Import funcția existentă

// 🆕 Funcție pentru generarea slug-ului unic
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = formatForUrl(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existingUser = await prisma.user.findFirst({
      where: { slug: slug }
    });
    
    if (!existingUser) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// 1) Define Zod schema for request body with password complexity
const registerSchema = z.object({
  nume: z.string().min(1, 'Numele este obligatoriu'),
  prenume: z.string().min(1, 'Prenumele este obligatoriu'),
  email: z.string().email('Email invalid'),
  parola: z.string()
    .min(6, 'Parola trebuie să aibă minim 6 caractere')
    .regex(/[A-Z]/, 'Parola trebuie să conțină cel puțin o literă mare')
    .regex(/[^A-Za-z0-9]/, 'Parola trebuie să conțină cel puțin un caracter special'),
  dataNasterii: z.string().refine(str => {
    const date = new Date(str)
    const today = new Date()
    today.setFullYear(today.getFullYear() - 18)
    return date <= today
  }, 'Trebuie să ai cel puțin 18 ani'),
  gen: z.enum(['masculin', 'feminin', 'altul']),
})
type RegisterData = z.infer<typeof registerSchema>

export async function POST(req: Request) {
  try {
    // 2) Parse + validate
    const body = await req.json()
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        errors[key] = issue.message
      }
      return NextResponse.json({ errors }, { status: 400 })
    }
    const { nume, prenume, email, parola, dataNasterii, gen } = result.data

    // 3) Check duplicates
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ errors: { email: 'Email-ul este deja folosit' } }, { status: 400 })
    }

    // 🆕 4) Generează slug-ul pentru numele complet
    const fullName = `${nume} ${prenume}`;
    const userSlug = await generateUniqueSlug(fullName);
    
    console.log(`🆕 Utilizator nou: "${fullName}" → slug: "${userSlug}"`);

    // 🆕 5) Hash password + create user CU SLUG
    const hashed = await bcrypt.hash(parola, 10)
    const user = await prisma.user.create({
      data: {
        name: fullName,
        slug: userSlug,  // 🆕 Include slug-ul generat
        email,
        password: hashed,
        birthDate: new Date(dataNasterii),
        gender: gen,
        // isVerified implicit default false
      },
    })

    // 6) Create email verification record
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // 7) Send verification email
    await sendVerificationEmail(email, token)

    // 🆕 8) Return response cu slug inclus (pentru debugging)
    return NextResponse.json(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        slug: user.slug, // 🆕 Include slug-ul în răspuns
        message: 'Verifică-ți email-ul pentru a activa contul.' 
      },
      { status: 201 }
    )
  } catch (err: any) {
    // handle unique constraint (e.g. duplicate userId on EmailVerification)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target[0] : 'value'
      
      // 🆕 Mesaj specific pentru slug duplicat (nu ar trebui să se întâmple)
      if (target === 'slug') {
        console.error('💥 Eroare: Slug duplicat la înregistrare!', err);
        return NextResponse.json(
          { errors: { general: 'Eroare internă la generarea profilului. Încearcă din nou.' } },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { errors: { [target]: `${target} deja folosit` } },
        { status: 400 }
      )
    }
    console.error('💥 Eroare la înregistrare:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}