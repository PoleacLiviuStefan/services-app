// File: app/api/consulting-sessions/[sessionId]/zoom-credentials/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    // 1. Verificăm sesiunea user-ului
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { sessionId } = params;

    // 2. Determinăm rolul (provider vs client)
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    // 3. Preluăm înregistrarea de consultingSession
    const cs = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        providerId: true,
        clientId: true,
        zoomSessionName: true,
        zoomTokens: true
      }
    });
    if (!cs) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 4. Alege token-ul potrivit din cs.zoomTokens
    //    dacă e provider ia token-ul pentru provider, altfel pentru client
    const role      = providerRecord && providerRecord.id === cs.providerId
                      ? 'provider'
                      : 'client';
    const userKey   = role === 'provider' ? cs.providerId : cs.clientId;
    const token     = (cs.zoomTokens as Record<string,string>)[userKey];
    const sessName  = cs.zoomSessionName;
    if (!token || !sessName) {
      return NextResponse.json(
        { error: 'Zoom credentials incomplete' },
        { status: 500 }
      );
    }

    // 5. Returnăm nume sesiune, token și userId (alegem userId = rol)
    return NextResponse.json({
      sessionName: sessName,
      token,
      userId: userKey
    }, { status: 200 });

  } catch (e: any) {
    console.error('Error /zoom-credentials:', e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
