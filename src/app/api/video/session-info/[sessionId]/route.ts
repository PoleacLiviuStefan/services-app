// /api/video/session-info/[sessionId]/route.ts - FIXED FOR NEXT.JS 15
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Verificăm sesiunea utilizatorului
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params pentru Next.js 15
    const { sessionId } = await params;
    const userId = session.user.id;

    console.log(`🔍 Verificare acces la sesiunea: ${sessionId} pentru user: ${userId}`);

    // 2. Determinăm dacă utilizatorul e provider
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    console.log(`👤 Provider record:`, providerRecord?.id || 'Nu este provider');

    // 3. Găsim sesiunea și verificăm permisiunile
    const userSession = await prisma.consultingSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { providerId: providerRecord?.id },
          { clientId: userId }
        ]
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        speciality: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true
          }
        },
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

    if (!userSession) {
      console.log(`❌ Sesiunea ${sessionId} nu a fost găsită sau nu ai permisiuni`);
      
      // DEBUG: Să vedem toate sesiunile acestui user
      const allUserSessions = await prisma.consultingSession.findMany({
        where: {
          OR: [
            { providerId: providerRecord?.id },
            { clientId: userId }
          ]
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          createdAt: true
        }
      });
      
      console.log(`🔍 DEBUG: Toate sesiunile pentru user ${userId}:`, allUserSessions);
      
      return NextResponse.json(
        { 
          error: 'Sesiunea nu a fost găsită sau nu ai permisiuni',
          debug: process.env.NODE_ENV === 'development' ? {
            searchedSessionId: sessionId,
            userId,
            providerId: providerRecord?.id,
            allUserSessions
          } : undefined
        },
        { status: 404 }
      );
    }

    console.log(`✅ Sesiune găsită:`, {
      id: userSession.id,
      startDate: userSession.startDate,
      status: userSession.status,
      dailyRoomUrl: userSession.dailyRoomUrl
    });

    // 4. Verificarea de timp (doar dacă nu suntem în TESTING_MODE)
    const isTestingMode = process.env.TESTING_MODE === 'true';
    
    if (!isTestingMode) {
      console.log(`⏰ Verificare restricții de timp (PRODUCTION MODE)`);
      
      const now = new Date();
      const sessionStart = userSession.startDate ? new Date(userSession.startDate) : null;
      
      if (sessionStart) {
        const timeDiff = now.getTime() - sessionStart.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        console.log(`📊 Time diff: ${hoursDiff.toFixed(2)} ore`);

        // Permite accesul cu 30 minute înainte și 24 ore după programare
        if (hoursDiff < -0.5 || hoursDiff > 24) {
          console.log(`🚫 Acces refuzat: sesiunea nu este în intervalul permis`);
          return NextResponse.json(
            { error: 'Sesiunea nu este disponibilă în acest moment' },
            { status: 403 }
          );
        }
      }
    } else {
      console.log(`🧪 TESTING MODE ACTIVAT: Permitere acces fără restricții de timp`);
    }

    // 5. Construim răspunsul
    const isProvider = userSession.providerId === providerRecord?.id;
    const counterpart = isProvider ? userSession.client : userSession.provider.user;

    console.log(`🎭 Rol utilizator:`, isProvider ? 'Provider' : 'Client');
    console.log(`👥 Counterpart:`, counterpart.name || counterpart.email);

    const sessionData = {
      id: userSession.id,
      startDate: userSession.startDate ? userSession.startDate.toISOString() : null,
      endDate: userSession.endDate ? userSession.endDate.toISOString() : null,
      joinUrl: userSession.dailyRoomUrl || userSession.calendlyEventUri || '', // fallback pentru compatibilitate
      roomName: userSession.dailyRoomName,
      roomId: userSession.dailyRoomId,
      domainName: userSession.dailyDomainName,
      counterpart: counterpart.name || counterpart.email || 'Necunoscut',
      counterpartEmail: counterpart.email,
      speciality: {
        id: userSession.speciality.id,
        name: userSession.speciality.name,
        description: userSession.speciality.description,
        price: userSession.speciality.price
      },
      status: userSession.status || 'SCHEDULED',
      isProvider: isProvider,
      duration: userSession.duration,
      actualDuration: userSession.actualDuration,
      participantCount: userSession.participantCount,
      isFinished: userSession.isFinished,
      rating: userSession.rating,
      feedback: userSession.feedback,
      notes: userSession.notes,
      totalPrice: userSession.totalPrice,
      calendlyEventUri: userSession.calendlyEventUri,
      scheduledAt: userSession.scheduledAt ? userSession.scheduledAt.toISOString() : null,
      joinedAt: userSession.joinedAt ? userSession.joinedAt.toISOString() : null,
      leftAt: userSession.leftAt ? userSession.leftAt.toISOString() : null,
      createdAt: userSession.createdAt ? userSession.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: userSession.updatedAt ? userSession.updatedAt.toISOString() : new Date().toISOString(),
      packageInfo: userSession.userPackage ? {
        id: userSession.userPackage.id,
        totalSessions: userSession.userPackage.totalSessions,
        usedSessions: userSession.userPackage.usedSessions,
        remainingSessions: userSession.userPackage.totalSessions - userSession.userPackage.usedSessions,
        expiresAt: userSession.userPackage.expiresAt ? userSession.userPackage.expiresAt.toISOString() : null
      } : null
    };

    console.log(`🎥 Join URL pentru sesiune:`, sessionData.joinUrl || 'Nu există');
    console.log(`✅ Returnare date sesiune cu succes`);

    return NextResponse.json({
      success: true,
      session: sessionData,
      testingMode: isTestingMode,
      debug: process.env.NODE_ENV === 'development' ? {
        userId,
        providerId: providerRecord?.id,
        sessionStart: userSession.startDate,
        now: new Date().toISOString()
      } : undefined
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error fetching session details:', message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Endpoint pentru anularea unei sesiuni (doar provider)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Verificăm sesiunea utilizatorului
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params pentru Next.js 15
    const { sessionId } = await params;
    const userId = session.user.id;

    console.log(`🗑️ Încercare anulare sesiune ${sessionId} de către user ${userId}`);

    // 2. Verificăm dacă utilizatorul este provider
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!providerRecord) {
      console.log(`❌ User ${userId} nu este provider autorizat`);
      return NextResponse.json(
        { error: 'Nu ești un provider autorizat' },
        { status: 403 }
      );
    }

    // 3. Verificăm dacă utilizatorul este provider-ul sesiunii
    const userSession = await prisma.consultingSession.findFirst({
      where: {
        id: sessionId,
        providerId: providerRecord.id // doar provider-ul poate anula
      }
    });

    if (!userSession) {
      console.log(`❌ Sesiunea ${sessionId} nu a fost găsită pentru provider ${providerRecord.id}`);
      return NextResponse.json(
        { error: 'Sesiunea nu a fost găsită sau nu ai permisiuni' },
        { status: 404 }
      );
    }

    // 4. Verificăm dacă sesiunea poate fi anulată (doar dacă nu e în TESTING_MODE)
    const isTestingMode = process.env.TESTING_MODE === 'true';
    
    if (!isTestingMode) {
      const now = new Date();
      const sessionStart = userSession.startDate ? new Date(userSession.startDate) : null;
      
      if (sessionStart && sessionStart <= now) {
        return NextResponse.json(
          { error: 'Nu poți anula o sesiune care a început deja' },
          { status: 400 }
        );
      }

      if (userSession.status === 'IN_PROGRESS') {
        return NextResponse.json(
          { error: 'Nu poți anula o sesiune în desfășurare' },
          { status: 400 }
        );
      }
    } else {
      console.log(`🧪 TESTING MODE: Permit anularea fără verificări de timp`);
    }

    // 5. Ștergem camera Daily.co (opțional)
    if (userSession.dailyRoomName) {
      await deleteDailyRoom(userSession.dailyRoomName);
    }

    // 6. Marcăm sesiunea ca anulată
    const updatedSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Sesiunea ${sessionId} a fost anulată cu succes`);

    return NextResponse.json({
      success: true,
      message: 'Sesiunea a fost anulată cu succes',
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        updatedAt: updatedSession.updatedAt ? updatedSession.updatedAt.toISOString() : null
      }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error cancelling session:', message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Endpoint pentru actualizarea unei sesiuni (PUT)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Verificăm sesiunea utilizatorului
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Await params pentru Next.js 15
    const { sessionId } = await params;
    const userId = session.user.id;
    const updateData = await request.json();

    console.log(`📝 Actualizare sesiune ${sessionId}:`, updateData);

    // 2. Verificăm dacă utilizatorul e provider
    const providerRecord = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    // 3. Verificăm permisiunile
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
      console.log(`❌ Sesiunea ${sessionId} nu a fost găsită sau nu ai permisiuni`);
      return NextResponse.json(
        { error: 'Sesiunea nu a fost găsită sau nu ai permisiuni' },
        { status: 404 }
      );
    }

    // 4. Pregătim datele pentru actualizare
    const allowedFields = [
      'rating', 'feedback', 'notes', 'status', 
      'joinedAt', 'leftAt', 'actualDuration', 'participantCount'
    ];

    const filteredData: any = {
      updatedAt: new Date()
    };

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'joinedAt' || field === 'leftAt') {
          filteredData[field] = new Date(updateData[field]);
        } else {
          filteredData[field] = updateData[field];
        }
      }
    });

    console.log(`📊 Date filtrate pentru actualizare:`, filteredData);

    // 5. Actualizăm sesiunea
    const updatedSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: filteredData
    });

    console.log(`✅ Sesiunea ${sessionId} a fost actualizată cu succes`);

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        rating: updatedSession.rating,
        feedback: updatedSession.feedback,
        notes: updatedSession.notes,
        actualDuration: updatedSession.actualDuration,
        participantCount: updatedSession.participantCount,
        updatedAt: updatedSession.updatedAt ? updatedSession.updatedAt.toISOString() : null
      }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error updating session:', message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Funcție pentru ștergerea unei camere Daily.co
async function deleteDailyRoom(roomName: string): Promise<void> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured, skipping room deletion');
    return;
  }

  try {
    console.log(`🗑️ Ștergere cameră Daily.co: ${roomName}`);
    
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to delete Daily room ${roomName}: ${response.statusText}`);
    } else {
      console.log(`✅ Daily room ${roomName} deleted successfully`);
    }
  } catch (error) {
    console.error('❌ Error deleting Daily room:', error);
  }
}