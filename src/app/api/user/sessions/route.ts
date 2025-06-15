// /api/user/sessions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // 1. Verificăm sesiunea utilizatorului
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Determinăm dacă utilizatorul e provider sau client
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    let sessionsData: Array<{
      id: string;
      startDate: string;
      joinUrl: string;
      counterpart: string;
      role: 'provider' | 'client';
    }> = [];

    if (providerRecord) {
      // 3a. Preluăm toate sesiunile ca provider
      const providerSessions = await prisma.consultingSession.findMany({
        where: { providerId: providerRecord.id },
        orderBy: { startDate: 'asc' },
        include: { client: { select: { name: true } } }
      });
      sessionsData = providerSessions.map(sess => ({
        id: sess.id,
        startDate: sess.startDate ? sess.startDate.toISOString() : '',
        joinUrl: sess.calendlyEventUri || '',
        counterpart: sess.client.name,
        role: 'provider'
      }));
    } else {
      // 3b. Preluăm toate sesiunile ca client
      const clientSessions = await prisma.consultingSession.findMany({
        where: { clientId: userId },
        orderBy: { startDate: 'asc' },
        include: { provider: { select: { user: { select: { name: true } } } } }
      });
      sessionsData = clientSessions.map(sess => ({
        id: sess.id,
        startDate: sess.startDate ? sess.startDate.toISOString() : '',
        joinUrl: sess.calendlyEventUri || '',
        counterpart: sess.provider.user.name,
        role: 'client'
      }));
    }

    // 4. Returnăm JSON
    return NextResponse.json({ sessions: sessionsData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error fetching sessions:', message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
