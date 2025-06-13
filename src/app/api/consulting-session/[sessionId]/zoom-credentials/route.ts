// File: app/api/user/sessions/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    const now = new Date();
    let sessionsData: Array<{ id: string; scheduledAt: string; joinUrl: string; with: string; role: string }> = [];

    if (providerRecord) {
      // 3a. Dacă e provider, preluăm sesiunile unde e furnizor
      const providerSessions = await prisma.consultingSession.findMany({
        where: {
          providerId: providerRecord.id,
          scheduledAt: { gte: now }
        },
        orderBy: { scheduledAt: 'asc' },
        include: { client: { select: { user: { select: { name: true } } } } }
      });

      sessionsData = providerSessions.map(sess => ({
        id: sess.id,
        scheduledAt: sess.scheduledAt.toISOString(),
        joinUrl: sess.calendlyEventUri || '',
        with: sess.client.user.name,
        role: 'provider'
      }));
    } else {
      // 3b. Dacă e client, preluăm sesiunile unde e client
      const clientSessions = await prisma.consultingSession.findMany({
        where: {
          clientId: userId,
          scheduledAt: { gte: now }
        },
        orderBy: { scheduledAt: 'asc' },
        include: { provider: { select: { user: { select: { name: true } } } } }
      });

      sessionsData = clientSessions.map(sess => ({
        id: sess.id,
        scheduledAt: sess.scheduledAt.toISOString(),
        joinUrl: sess.calendlyEventUri || '',
        with: sess.provider.user.name,
        role: 'client'
      }));
    }

    // 4. Returnăm rezultatul
    return NextResponse.json({ sessions: sessionsData });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    // Asigurăm că trimitem întotdeauna un obiect valid
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
