// /api/user/sessions/route.ts - VERSIUNEA CORECTATĂ
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

    console.log(`🔍 Căutare sesiuni pentru user: ${userId}`);

    // 2. Determinăm dacă utilizatorul e provider sau client
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    console.log(`👤 Provider record:`, providerRecord?.id || 'Nu este provider');

    let allSessions: any[] = [];

    if (providerRecord) {
      // 3a. Preluăm toate sesiunile ca provider
      console.log(`🔍 Căutare sesiuni ca provider pentru: ${providerRecord.id}`);
      
      const providerSessions = await prisma.consultingSession.findMany({
        where: { providerId: providerRecord.id },
        orderBy: { startDate: 'asc' },
        include: { 
          client: { select: { name: true, email: true } },
          speciality: { select: { id: true, name: true, description: true, price: true } },
          userPackage: {
            select: {
              id: true,
              totalSessions: true,
              usedSessions: true,
              expiresAt: true
            }
          }
        }
      });

      console.log(`📊 Găsite ${providerSessions.length} sesiuni ca provider`);

      allSessions = [...allSessions, ...providerSessions.map(sess => ({
        ...sess,
        isProvider: true,
        counterpartInfo: sess.client
      }))];
    }

    // 3b. Preluăm toate sesiunile ca client (indiferent dacă e și provider)
    console.log(`🔍 Căutare sesiuni ca client pentru: ${userId}`);
    
    const clientSessions = await prisma.consultingSession.findMany({
      where: { clientId: userId },
      orderBy: { startDate: 'asc' },
      include: { 
        provider: { 
          select: { 
            id: true,
            user: { select: { name: true, email: true } }
          }
        },
        speciality: { select: { id: true, name: true, description: true, price: true } },
        userPackage: {
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            expiresAt: true
          }
        }
      }
    });

    console.log(`📊 Găsite ${clientSessions.length} sesiuni ca client`);

    allSessions = [...allSessions, ...clientSessions.map(sess => ({
      ...sess,
      isProvider: false,
      counterpartInfo: sess.provider.user
    }))];

    // 4. Sortăm toate sesiunile după data de start
    allSessions.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });

    console.log(`📋 Total sesiuni găsite: ${allSessions.length}`);

    // 5. Transformăm datele pentru frontend
    const sessionsData = allSessions.map(sess => {
      const counterpart = sess.counterpartInfo;
      
      return {
        id: sess.id,
        startDate: sess.startDate ? sess.startDate.toISOString() : '',
        endDate: sess.endDate ? sess.endDate.toISOString() : null,
        joinUrl: sess.dailyRoomUrl || sess.calendlyEventUri || '', // preferă Daily.co, fallback la Calendly
        roomName: sess.dailyRoomName || null,
        counterpart: counterpart?.name || counterpart?.email || 'Necunoscut',
        speciality: sess.speciality?.name || 'Specialitate necunoscută',
        status: sess.status || 'SCHEDULED',
        duration: sess.duration || null,
        actualDuration: sess.actualDuration || null,
        isFinished: sess.isFinished || false,
        participantCount: sess.participantCount || null,
        rating: sess.rating || null,
        feedback: sess.feedback || null,
        totalPrice: sess.totalPrice || null,
        role: sess.isProvider ? 'provider' : 'client',
        createdAt: sess.createdAt ? sess.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    console.log(`✅ Returnare ${sessionsData.length} sesiuni formatate`);

    // 6. Returnăm JSON în formatul așteptat de componentă
    return NextResponse.json({ 
      sessions: sessionsData,
      totalCount: sessionsData.length,
      isProvider: !!providerRecord
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error fetching sessions:', message);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru actualizarea statusului unei sesiuni
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      sessionId, 
      status, 
      joinedAt, 
      leftAt, 
      actualDuration,
      participantCount,
      rating,
      feedback,
      notes 
    } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId este obligatoriu' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    console.log(`📝 Actualizare sesiune ${sessionId} de către user ${userId}`);

    // Verificăm dacă utilizatorul este provider
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    // Verificăm dacă utilizatorul are dreptul să modifice această sesiune
    const userSession = await prisma.consultingSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { providerId: providerRecord?.id },
          { clientId: userId }
        ]
      }
    });

    if (!userSession) {
      return NextResponse.json(
        { error: 'Sesiunea nu a fost găsită sau nu ai permisiuni' },
        { status: 404 }
      );
    }

    // Pregătim datele pentru actualizare
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (joinedAt) updateData.joinedAt = new Date(joinedAt);
    if (leftAt) updateData.leftAt = new Date(leftAt);
    if (actualDuration !== undefined) updateData.actualDuration = actualDuration;
    if (participantCount !== undefined) updateData.participantCount = participantCount;
    if (rating !== undefined) updateData.rating = rating;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (notes !== undefined) updateData.notes = notes;

    // Marchează ca finalizată dacă statusul este COMPLETED
    if (status === 'COMPLETED') {
      updateData.isFinished = true;
      if (!leftAt) updateData.leftAt = new Date();
    }

    // Actualizăm sesiunea
    const updatedSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: updateData
    });

    // Dacă sesiunea s-a finalizat și este din pachet, actualizăm sesiunile folosite
    if (status === 'COMPLETED' && userSession.packageId) {
      await prisma.userProviderPackage.update({
        where: { id: userSession.packageId },
        data: {
          usedSessions: {
            increment: 1
          }
        }
      });
    }

    console.log(`✅ Sesiune ${sessionId} actualizată cu succes`);

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        isFinished: updatedSession.isFinished,
        actualDuration: updatedSession.actualDuration,
        participantCount: updatedSession.participantCount,
        updatedAt: updatedSession.updatedAt ? updatedSession.updatedAt.toISOString() : null
      }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error updating session:', message);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    );
  }
}