// app/api/users/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Funcția pentru formatarea URL-urilor (copiată din utils/util)
function formatForUrl(str: string): string {
  return (
    str
      .toLowerCase()
      // Înlocuim fiecare grup de caractere care NU este:
      //   - litera a–z
      //   - cifră 0–9
      //   - una dintre literele românești: ăâîșț
      // cu o singură cratimă
      .replace(/[^a-z0-9ăâîșț]+/g, "-")
      // Dacă există mai multe cratime consecutive, reducem toate la una singură
      .replace(/-+/g, "-")
      // Eliminăm cratimele de la început și sfârșit (dacă au rămas)
      .replace(/^-+|-+$/g, "")
  );
}

// GET - Rezolvă un utilizator după identificator (nume formatat sau email)
export async function GET(req: NextRequest) {
  try {
    // Verifică autentificarea
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('identifier');

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identifier is required' },
        { status: 400 }
      );
    }

    let user = null;

    // 1. Încearcă să găsească direct după email (dacă identificatorul conține @)
    if (identifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: identifier },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      });
    }

    // 2. Dacă nu a găsit, încearcă să găsească după numele formatat
    if (!user) {
      // Caută toți utilizatorii și verifică dacă numele formatat match-uiește
      const allUsers = await prisma.user.findMany({
        where: {
          name: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      });

      // Găsește utilizatorul cu numele formatat care match-uiește
      user = allUsers.find(u => {
        if (!u.name) return false;
        const formattedName = formatForUrl(u.name);
        return formattedName === identifier.toLowerCase();
      }) || null;
    }

    // 3. Dacă tot nu a găsit, încearcă să interpreteze identificatorul ca fiind un nume parțial
    if (!user) {
      // Decodifică cratimele înapoi în spații pentru căutare parțială
      const searchName = identifier.replace(/-/g, ' ');
      
      user = await prisma.user.findFirst({
        where: {
          name: {
            contains: searchName,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verifică că utilizatorul nu încearcă să găsească pe sine
    if (user.email === session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Cannot start conversation with yourself' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      }
    });

  } catch (error) {
    console.error('Error resolving user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve user' },
      { status: 500 }
    );
  }
}