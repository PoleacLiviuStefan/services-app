// app/api/auth/current-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Folosește configurația ta existentă

// GET - Obține utilizatorul curent din NextAuth session
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Returnează informațiile utilizatorului din sesiune
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
        gender: session.user.gender
      }
    });

  } catch (error) {
    console.error('Error getting current user from NextAuth:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get current user' },
      { status: 500 }
    );
  }
}