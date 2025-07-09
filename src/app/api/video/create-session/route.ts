// /api/video/create-session/route.ts - VERSIUNEA PENTRU TESTING FĂRĂ AUTH
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Funcție pentru crearea unei camere Daily.co
async function createDailyRoom(sessionId: string): Promise<{
  roomUrl: string;
  roomName: string;
  roomId: string;
  domainName: string;
}> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN || 'your-domain.daily.co';
  
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured, using mock room');
    const roomName = `test-room-${sessionId}`;
    return {
      roomUrl: `https://${dailyDomain}/${roomName}`,
      roomName: roomName,
      roomId: `mock-${sessionId}`,
      domainName: dailyDomain,
    };
  }

  const roomName = `session-${sessionId}`;

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: process.env.ENABLE_RECORDING === 'true' ? 'cloud' : 'off',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // expira în 24h
          eject_at_room_exp: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Daily room: ${error}`);
    }

    const room = await response.json();
    
    return {
      roomUrl: room.url,
      roomName: room.name,
      roomId: room.id,
      domainName: room.domain_name || dailyDomain,
    };
  } catch (error) {
    console.warn('⚠️ Daily.co room creation failed, using mock room:', error.message);
    const roomName = `test-room-${sessionId}`;
    return {
      roomUrl: `https://${dailyDomain}/${roomName}`,
      roomName: roomName,
      roomId: `mock-${sessionId}`,
      domainName: dailyDomain,
    };
  }
}

export async function POST(request: Request) {
  try {
    const isTestingMode = process.env.TESTING_MODE === 'true' || process.env.NODE_ENV === 'development';
    
    console.log(`🎥 Creare sesiune video - Testing mode: ${isTestingMode}`);

    // În modul testing, permite fără autentificare
    let userId = null;
    let isAuthenticated = false;

    if (!isTestingMode) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
      isAuthenticated = true;
    } else {
      console.log('🧪 TESTING MODE: Permit creare sesiune fără autentificare');
    }

    const requestData = await request.json();
    console.log(`📊 Request data:`, requestData);

    // Validăm datele de intrare
    const {
      clientId,
      providerId,
      specialityId,
      startDate,
      endDate,
      duration = 60,
      immediate = false,
      packageId = null,
      notes = null,
      createRoom = true,
      // Pentru testing - permite specificarea directă a ID-urilor
      testClientId = null,
      testProviderId = null,
      testSpecialityId = null
    } = requestData;

    // În modul testing, folosește ID-uri de test dacă nu sunt specificate
    let finalClientId = clientId;
    let finalProviderId = providerId;
    let finalSpecialityId = specialityId;

    if (isTestingMode && (!clientId || !providerId || !specialityId)) {
      console.log('🔍 Găsire automată participanți pentru testing...');

      // Găsește primul provider disponibil
      if (!finalProviderId) {
        const provider = await prisma.provider.findFirst({
          include: {
            user: { select: { id: true, name: true } },
            specialities: { select: { id: true, name: true } }
          }
        });

        if (provider) {
          finalProviderId = provider.id;
          console.log(`👨‍⚕️ Provider găsit: ${provider.user.name} (${provider.id})`);
          
          if (!finalSpecialityId && provider.specialities.length > 0) {
            finalSpecialityId = provider.specialities[0].id;
            console.log(`🎯 Specialitate găsită: ${provider.specialities[0].name}`);
          }
        }
      }

      // Găsește primul client disponibil
      if (!finalClientId) {
        const client = await prisma.user.findFirst({
          where: { 
            role: 'STANDARD',
            id: { not: userId } // exclude utilizatorul curent dacă e autentificat
          },
          select: { id: true, name: true, email: true }
        });

        if (client) {
          finalClientId = client.id;
          console.log(`👤 Client găsit: ${client.name || client.email} (${client.id})`);
        }
      }

      // Găsește prima specialitate dacă nu avem una
      if (!finalSpecialityId) {
        const speciality = await prisma.speciality.findFirst({
          select: { id: true, name: true }
        });
        
        if (speciality) {
          finalSpecialityId = speciality.id;
          console.log(`🎯 Specialitate găsită: ${speciality.name}`);
        }
      }
    }

    // Validări finale
    if (!finalClientId || !finalProviderId || !finalSpecialityId) {
      return NextResponse.json({
        error: 'clientId, providerId și specialityId sunt obligatorii',
        details: {
          clientId: finalClientId ? '✅' : '❌',
          providerId: finalProviderId ? '✅' : '❌',
          specialityId: finalSpecialityId ? '✅' : '❌'
        }
      }, { status: 400 });
    }

    // Verificăm dacă participanții există
    const [client, provider, speciality] = await Promise.all([
      prisma.user.findUnique({
        where: { id: finalClientId },
        select: { id: true, name: true, email: true }
      }),
      prisma.provider.findUnique({
        where: { id: finalProviderId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.speciality.findUnique({
        where: { id: finalSpecialityId },
        select: { id: true, name: true, description: true, price: true }
      })
    ]);

    if (!client) {
      return NextResponse.json({ 
        error: `Client-ul cu ID ${finalClientId} nu a fost găsit` 
      }, { status: 404 });
    }

    if (!provider) {
      return NextResponse.json({ 
        error: `Provider-ul cu ID ${finalProviderId} nu a fost găsit` 
      }, { status: 404 });
    }

    if (!speciality) {
      return NextResponse.json({ 
        error: `Specialitatea cu ID ${finalSpecialityId} nu a fost găsită` 
      }, { status: 404 });
    }

    console.log(`✅ Participanți validați:`);
    console.log(`   - Client: ${client.name || client.email}`);
    console.log(`   - Provider: ${provider.user.name || provider.user.email}`);
    console.log(`   - Specialitate: ${speciality.name}`);

    // Calculăm datele sesiunii
    let sessionStartDate: Date;
    let sessionEndDate: Date;

    if (immediate) {
      sessionStartDate = new Date();
      sessionEndDate = new Date(Date.now() + duration * 60 * 1000);
    } else {
      if (!startDate) {
        return NextResponse.json({
          error: 'startDate este obligatoriu dacă sesiunea nu este immediată'
        }, { status: 400 });
      }
      sessionStartDate = new Date(startDate);
      sessionEndDate = endDate ? new Date(endDate) : new Date(sessionStartDate.getTime() + duration * 60 * 1000);
    }

    // Generăm ID unic pentru sesiune
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 Session ID generat: ${sessionId}`);

    // Creăm camera Daily.co (dacă este cerută)
    let dailyRoom: any = null;
    if (createRoom) {
      try {
        dailyRoom = await createDailyRoom(sessionId);
        console.log(`🎥 Cameră Daily.co creată: ${dailyRoom.roomUrl}`);
      } catch (error) {
        console.error(`❌ Eroare la crearea camerei Daily.co:`, error);
        // În modul testing, continuăm fără cameră
        if (!isTestingMode) {
          return NextResponse.json({
            error: 'Eroare la crearea camerei video',
            details: error.message
          }, { status: 500 });
        }
      }
    }

    // Salvăm sesiunea în baza de date
    const newSession = await prisma.consultingSession.create({
      data: {
        id: sessionId,
        providerId: finalProviderId,
        clientId: finalClientId,
        specialityId: finalSpecialityId,
        packageId: packageId,
        
        // Daily.co details
        dailyRoomName: dailyRoom?.roomName || null,
        dailyRoomUrl: dailyRoom?.roomUrl || null,
        dailyRoomId: dailyRoom?.roomId || null,
        dailyDomainName: dailyRoom?.domainName || null,
        dailyCreatedAt: dailyRoom ? new Date() : null,
        
        // Session details
        startDate: sessionStartDate,
        endDate: sessionEndDate,
        duration: duration,
        scheduledAt: new Date(),
        status: 'SCHEDULED',
        notes: notes || (isTestingMode ? `Sesiune de test creată în ${new Date().toISOString()}` : null),
        
        totalPrice: Math.round(speciality.price * 100), // în bani
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        provider: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        client: { select: { name: true, email: true } },
        speciality: { select: { name: true, price: true } }
      }
    });

    console.log(`✅ Sesiune creată cu succes:`);
    console.log(`   - ID: ${newSession.id}`);
    console.log(`   - Provider: ${newSession.provider.user.name}`);
    console.log(`   - Client: ${newSession.client.name}`);
    console.log(`   - Specialitate: ${newSession.speciality.name}`);
    console.log(`   - Start: ${sessionStartDate.toISOString()}`);
    console.log(`   - Room URL: ${newSession.dailyRoomUrl || 'Nu a fost creată'}`);

    return NextResponse.json({
      success: true,
      session: {
        id: newSession.id,
        startDate: newSession.startDate?.toISOString(),
        endDate: newSession.endDate?.toISOString(),
        duration: newSession.duration,
        status: newSession.status,
        
        // Participanți
        provider: {
          id: newSession.provider.id,
          name: newSession.provider.user.name,
          email: newSession.provider.user.email
        },
        client: {
          id: newSession.client.id,
          name: newSession.client.name,
          email: newSession.client.email
        },
        
        // Specialitate
        speciality: {
          id: newSession.speciality.id,
          name: newSession.speciality.name,
          price: newSession.speciality.price
        },
        
        // Daily.co
        video: dailyRoom ? {
          roomUrl: newSession.dailyRoomUrl,
          roomName: newSession.dailyRoomName,
          roomId: newSession.dailyRoomId,
          domainName: newSession.dailyDomainName
        } : null,
        
        // URLs utile
        joinUrl: `/servicii/video/sessions/${newSession.id}`,
        totalPrice: newSession.totalPrice,
        notes: newSession.notes
      },
      message: `Sesiunea a fost creată cu succes${immediate ? ' și poate fi accesată imediat' : ''}`,
      immediate: immediate,
      testingMode: isTestingMode,
      authenticated: isAuthenticated
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Eroare la crearea sesiunii video:', message);
    
    return NextResponse.json({
      error: 'A apărut o eroare la crearea sesiunii video',
      details: process.env.NODE_ENV === 'development' ? message : undefined
    }, { status: 500 });
  }
}