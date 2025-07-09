// File: app/api/video/session-info/route.ts (pentru sesiune activă curentă)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ActiveSessionInfo {
  sessionId: string;
  roomUrl: string;
  roomName: string;
  startDate: string;
  endDate: string;
  counterpart: string;
  speciality: string;
  status: string;
  isProvider: boolean;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const currentUserId = session.user.id;
    
    // 2. Find active consulting session for this user
    const now = new Date();
    const activeSession = await prisma.consultingSession.findFirst({
      where: {
        OR: [
          { providerId: currentUserId },
          { clientId: currentUserId },
        ],
        startDate: { lte: now },
        endDate: { gte: now },
        isFinished: false,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        // Ensure Daily.co room exists
        dailyRoomUrl: { not: null },
        dailyRoomName: { not: null }
      },
      include: {
        provider: {
          include: {
            user: { 
              select: { 
                name: true, 
                email: true 
              } 
            }
          }
        },
        client: { 
          select: { 
            name: true, 
            email: true 
          } 
        },
        speciality: { 
          select: { 
            name: true 
          } 
        }
      },
      orderBy: {
        startDate: 'asc' // Get the earliest active session
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: 'Nicio sesiune activă găsită' },
        { status: 404 }
      );
    }

    // 3. Determine user role and counterpart
    const isProvider = activeSession.providerId === currentUserId;
    const counterpart = isProvider 
      ? (activeSession.client.name || activeSession.client.email || 'Client necunoscut')
      : (activeSession.provider.user.name || activeSession.provider.user.email || 'Provider necunoscut');

    // 4. Build response
    const response: ActiveSessionInfo = {
      sessionId: activeSession.id,
      roomUrl: activeSession.dailyRoomUrl!,
      roomName: activeSession.dailyRoomName!,
      startDate: activeSession.startDate!.toISOString(),
      endDate: activeSession.endDate!.toISOString(),
      counterpart: counterpart,
      speciality: activeSession.speciality.name,
      status: activeSession.status,
      isProvider: isProvider
    };

    console.log(`✅ Sesiune activă găsită pentru ${currentUserId}:`);
    console.log(`   - Session ID: ${response.sessionId}`);
    console.log(`   - Room: ${response.roomName}`);
    console.log(`   - Counterpart: ${response.counterpart}`);

    return NextResponse.json({
      success: true,
      session: response
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Eroare la găsirea sesiunii active:', message);
    
    return NextResponse.json({
      error: 'Eroare la găsirea sesiunii active',
      details: process.env.NODE_ENV === 'development' ? message : undefined
    }, { status: 500 });
  }
}