// /api/calendly/event-scheduled/route.ts - FIXED VERSION
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Funcție pentru crearea unei camere Daily.co
async function createDailyRoom(
  sessionId: string
): Promise<{
  roomUrl: string;
  roomName: string;
  roomId: string;
  domainName: string;
}> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN || 'mysticgold.daily.co';
  if (!dailyApiKey) throw new Error('DAILY_API_KEY is required');

  const roomName = `calendly-session-${sessionId}`;
  const roomProperties: any = {
    max_participants: 2,
    enable_chat: true,
    enable_screenshare: true,
    start_video_off: false,
    start_audio_off: false,
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    eject_at_room_exp: true,
  };
  if (process.env.ENABLE_RECORDING === 'true') {
    roomProperties.enable_recording = 'cloud';
  }

  // 1. Creare cameră privată
  const roomRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dailyApiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: roomProperties,
    }),
  });
  if (!roomRes.ok) {
    const err = await roomRes.text();
    throw new Error(`Failed to create Daily room: ${err}`);
  }
  const room = await roomRes.json();

  // 2. Generare token de acces
  const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dailyApiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: room.name,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // expiră în 24h
        eject_at_token_exp: true,
      },
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to create meeting token: ${err}`);
  }
  const { token } = await tokenRes.json();

  // 3. Returnare URL cu token ca parametru
  return {
    roomUrl: `${room.url}?t=${token}`,
    roomName: room.name,
    roomId: room.id,
    domainName: room.domain_name || dailyDomain,
  };
}


export async function POST(request: Request) {
  try {
    console.log('📅 Procesare eveniment Calendly');

    // AUTENTIFICARE OBLIGATORIE - ia utilizatorul curent
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ Unauthorized: No authenticated user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    console.log(`👤 Client autentificat: ${currentUserId}`);

    const { providerId, scheduledEventUri } = await request.json();

    console.log(`📊 Calendly event data:`, { providerId, scheduledEventUri, clientId: currentUserId });

    // VALIDARE INPUT
    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId este obligatoriu' },
        { status: 400 }
      );
    }

    if (!scheduledEventUri) {
      return NextResponse.json(
        { error: 'scheduledEventUri este obligatoriu' },
        { status: 400 }
      );
    }

    // ————————————————————————————————
    // ÎNCARCĂ PROVIDER-UL CU TOKEN-URILE CALENDLY
    // ————————————————————————————————
    console.log(`🔍 Căutare provider cu token-uri Calendly: ${providerId}`);
    
    const provider = await prisma.provider.findUnique({
      where: { userId: providerId },
      select: {
        id: true,
        userId: true,
        calendlyAccessToken: true,
        calendlyRefreshToken: true,
        calendlyExpiresAt: true,
        mainSpeciality: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!provider) {
      console.error(`❌ Provider-ul cu ID ${providerId} nu a fost găsit`);
      return NextResponse.json(
        { error: `Provider-ul cu ID ${providerId} nu a fost găsit` },
        { status: 404 }
      );
    }

    if (!provider.mainSpeciality) {
      console.error(`❌ Provider-ul ${providerId} nu are specialitate principală configurată`);
      return NextResponse.json(
        { error: 'Provider-ul nu are o specialitate principală configurată' },
        { status: 400 }
      );
    }

    // Verifică că provider-ul are token-uri Calendly
    let {
      calendlyAccessToken: token,
      calendlyRefreshToken: refreshToken,
      calendlyExpiresAt: expiresAt,
    } = provider;

    if (!token) {
      console.error(`❌ Provider-ul ${providerId} nu are token Calendly configurat`);
      return NextResponse.json(
        { error: 'Provider-ul nu are autentificare Calendly configurată' },
        { status: 400 }
      );
    }

    console.log(`✅ Provider găsit: ${provider.user.name || provider.user.email} (${provider.id})`);
    console.log(`✅ Specialitate: ${provider.mainSpeciality.name}`);

    // ————————————————————————————————
    // REFRESH TOKEN HELPER
    // ————————————————————————————————
    async function refreshCalendlyToken(): Promise<boolean> {
      if (!refreshToken) {
        console.warn('⚠️ Nu există refresh token pentru provider');
        return false;
      }
      
      if (expiresAt && new Date() < expiresAt) {
        console.log('✅ Token-ul Calendly este încă valid');
        return false; // Nu e nevoie de refresh
      }

      console.log('🔄 Refresh token Calendly...');
      
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID!,
        client_secret: process.env.CALENDLY_CLIENT_SECRET!,
        refresh_token: refreshToken,
      });

      const response = await fetch("https://auth.calendly.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error('❌ Refresh token failed:', response.statusText);
        return false;
      }

      const tokenData = await response.json();
      
      // Actualizează variabilele locale
      token = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Salvează în baza de date
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          calendlyAccessToken: token,
          calendlyRefreshToken: refreshToken,
          calendlyExpiresAt: expiresAt,
        },
      });

      console.log('✅ Token Calendly actualizat cu succes');
      return true;
    }

    // ————————————————————————————————
    // OBȚINE DETALIILE EVENIMENTULUI CALENDLY
    // ————————————————————————————————
    console.log('📞 Obținere detalii eveniment Calendly...');
    
    let response = await fetch(scheduledEventUri, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Dacă primim 401, încearcă să reîmprospătezi token-ul
    if (response.status === 401) {
      console.log('🔄 Token expirat, încerc refresh...');
      const refreshed = await refreshCalendlyToken();
      
      if (refreshed) {
        response = await fetch(scheduledEventUri, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Eroare la obținerea detaliilor Calendly:', errorText);
      throw new Error(`Failed to fetch Calendly event: ${response.statusText}`);
    }

    const eventDetails = await response.json();
    const eventData = eventDetails.resource;

    // Extrage informațiile necesare
    const startTime = new Date(eventData.start_time);
    const endTime = new Date(eventData.end_time);
    const clientEmail = eventData.event_memberships?.[0]?.user_email;
    const clientName = eventData.event_memberships?.[0]?.user_name;

    console.log(`⏰ Timp programat: ${startTime.toISOString()} - ${endTime.toISOString()}`);
    console.log(`📧 Client din Calendly: ${clientName} (${clientEmail})`);

    // Verifică că utilizatorul curent există în baza de date
    console.log(`🔍 Verificare utilizator curent: ${currentUserId}`);
    
    const clientUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!clientUser) {
      console.error(`❌ Utilizatorul autentificat ${currentUserId} nu există în baza de date`);
      return NextResponse.json(
        { error: 'Utilizatorul autentificat nu a fost găsit în baza de date' },
        { status: 404 }
      );
    }

    console.log(`✅ Client confirmat: ${clientUser.name || clientUser.email} (${clientUser.id}) - Role: ${clientUser.role}`);

    // Verifică că clientul și provider-ul sunt diferiți
    if (clientUser.id === provider.userId) {
      console.error(`❌ Clientul ${clientUser.id} și provider-ul ${provider.userId} sunt aceeași persoană`);
      return NextResponse.json(
        { error: 'Nu vă puteți programa o sesiune cu dvs. însuși' },
        { status: 400 }
      );
    }

    // Verifică dacă email-ul din Calendly se potrivește cu utilizatorul autentificat (opțional)
    if (clientEmail && clientUser.email && clientEmail.toLowerCase() !== clientUser.email.toLowerCase()) {
      console.warn(`⚠️ Email-ul din Calendly (${clientEmail}) diferă de email-ul utilizatorului autentificat (${clientUser.email})`);
      // Log warning dar continuă - poate utilizatorul a folosit alt email în Calendly
    }

    // Generează un ID unic pentru sesiune
    const sessionId = `calendly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 ID sesiune generat: ${sessionId}`);

    // Creează camera Daily.co
    console.log('🎥 Creare cameră Daily.co...');
    const dailyRoom = await createDailyRoom(sessionId);

    // Calculează durata estimată (în minute)
    const estimatedDuration = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    );

    // Salvează ședința în baza de date
    console.log('💾 Salvare sesiune în baza de date...');
    const sessionRecord = await prisma.consultingSession.create({
      data: {
        id: sessionId,
        providerId: provider.id,
        clientId: clientUser.id, // Folosește utilizatorul curent autentificat
        specialityId: provider.mainSpeciality.id,
        
        // Daily.co details
        dailyRoomName: dailyRoom.roomName,
        dailyRoomUrl: dailyRoom.roomUrl,
        dailyRoomId: dailyRoom.roomId,
        dailyDomainName: dailyRoom.domainName,
        dailyCreatedAt: new Date(),
        
        // Session details
        startDate: startTime,
        endDate: endTime,
        duration: estimatedDuration,
        calendlyEventUri: scheduledEventUri,
        scheduledAt: new Date(),
        status: 'SCHEDULED',
        
        totalPrice: Math.round(provider.mainSpeciality.price * 100), // în bani
        notes: `Sesiune programată prin Calendly pentru ${clientUser.name || clientUser.email}. Calendly client: ${clientName} (${clientEmail})`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Ședință salvată cu succes:`);
    console.log(`   - ID: ${sessionId}`);
    console.log(`   - Client: ${clientUser.name || clientUser.email} (${clientUser.id})`);
    console.log(`   - Provider: ${provider.user.name || provider.user.email} (${provider.id})`);
    console.log(`   - Specialitate: ${provider.mainSpeciality.name}`);
    console.log(`   - Camera Daily.co: ${dailyRoom.roomUrl}`);
    console.log(`   - Timp: ${startTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      sessionId: sessionRecord.id,
      roomUrl: sessionRecord.dailyRoomUrl,
      joinUrl: `/servicii/video/sessions/${sessionRecord.id}`,
      message: 'Ședința a fost programată cu succes din Calendly',
      details: {
        sessionId: sessionRecord.id,
        startDate: sessionRecord.startDate?.toISOString(),
        endDate: sessionRecord.endDate?.toISOString(),
        duration: sessionRecord.duration,
        speciality: provider.mainSpeciality.name,
        client: {
          id: clientUser.id,
          name: clientUser.name || clientUser.email,
          email: clientUser.email,
          role: clientUser.role
        },
        provider: {
          id: provider.id,
          name: provider.user.name || provider.user.email,
          email: provider.user.email
        },
        dailyRoom: {
          roomName: dailyRoom.roomName,
          roomUrl: dailyRoom.roomUrl,
          roomId: dailyRoom.roomId,
          domainName: dailyRoom.domainName
        },
        calendlyEvent: {
          uri: scheduledEventUri,
          clientName: clientName,
          clientEmail: clientEmail
        }
      }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Eroare la salvarea ședinței din Calendly:', message);
    console.error('Stack trace:', err instanceof Error ? err.stack : 'N/A');
    
    // Returnează erori mai specifice bazate pe tipul erorii
    if (message.includes('Daily.co') || message.includes('DAILY_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'Video room creation failed',
          message: 'Unable to create video room. Please try again later.'
        },
        { status: 503 }
      );
    }

    if (message.includes('Calendly') || message.includes('CALENDLY')) {
      return NextResponse.json(
        { 
          error: 'Calendly integration error',
          message: 'Unable to fetch event details from Calendly. Please check provider Calendly configuration.'
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Session creation failed',
        message: 'An unexpected error occurred while creating your session.',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    );
  }
}