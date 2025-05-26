import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

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
    const date = new Date(str);
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return date <= today;
  }, 'Trebuie să ai cel puțin 18 ani'),
  gen: z.enum(['masculin', 'feminin', 'altul']),
});
type RegisterData = z.infer<typeof registerSchema>;

export async function POST(req: Request) {
  try {
    // Parse JSON body
    const body = await req.json();
    // Validate with Zod
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach(issue => {
        const key = issue.path[0] as string;
        errors[key] = issue.message;
      });
      return NextResponse.json({ errors }, { status: 400 });
    }
    const { nume, prenume, email, parola, dataNasterii, gen } = parseResult.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ errors: { email: 'Email-ul este deja folosit' } }, { status: 400 });
    }

    // Hash password
    const hashed = await bcrypt.hash(parola, 10);
    // Create user
    const user = await prisma.user.create({
      data: {
        name: `${nume} ${prenume}`,
        email,
        password: hashed,
        birthDate: new Date(dataNasterii),
        gender: gen,
      },
    });

    // Return success (excluding sensitive fields)
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err: any) {
    // Handle unique constraint on name if it persists
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[])[0];
      return NextResponse.json({ errors: { [target]: `${target} deja folosit` } }, { status: 400 });
    }
    console.error(err.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
