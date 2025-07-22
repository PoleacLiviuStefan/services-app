// /api/calendly/event-scheduled/route.ts - VERSIUNE FINALĂ CU EXTENSIE 5 MIN ȘI FIX RECORDING
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Funcție pentru crearea unei camere Daily.co
async function createDailyRoom(
  sessionId: string,
  endTime: Date
): Promise<{
  roomUrl: string;
  roomName: string;
  roomId: string;
  domainName: string;
  originalEndTime: Date;
  extendedEndTime: Date;
}> {
  if (!process.env.DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is required');
  }
  const dailyApiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN ?? 'mysticgold.daily.co';

  // 1. 🆕 EXTINDE DURATA CU 5 MINUTE PENTRU BUFFER
  const extendedEndTime = new Date(endTime.getTime() + 5 * 60 * 1000); // +5 minute
  const exp = Math.floor(extendedEndTime.getTime() / 1000);
  
  console.log(`⏰ Timp original (Calendly): ${endTime.toISOString()}`);
  console.log(`⏰ Timp extins (+5 min buffer): ${extendedEndTime.toISOString()}`);

  // 2. configurarea camerei
  const roomProperties = {
    enable_recording: 'cloud',
    max_participants: 10,
    enable_chat: true,
    enable_screenshare: true,
    start_video_off: false,
    start_audio_off: false,
    exp,
    eject_at_room_exp: true,
    enable_prejoin_ui: true,
    enable_network_ui: true,
    enable_people_ui: true,
    lang: 'en',
    geo: 'auto',
  };

  // helper pentru POST-uri
  const apiPost = async (path: string, body: any) => {
    const res = await fetch(`https://api.daily.co/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Daily API error (${path}): ${text}`);
    }
    return res.json();
  };

  // 3. creare cameră
  const room = await apiPost('rooms', {
    name: `calendly-session-${sessionId}`,
    privacy: 'private',
    properties: roomProperties,
  });

  // 4. 🔧 FIX RECORDING ERROR: Folosește layout suportat pentru cloud recording
  const { token } = await apiPost('meeting-tokens', {
    properties: {
      room_name: room.name,
      exp: Math.floor(Date.now() / 1000) + 24 * 3600, // ⏰ TOKEN EXPIRĂ DUPĂ 24 ORE
      eject_at_token_exp: true,
      enable_recording: 'cloud',
      start_cloud_recording: true,
      start_cloud_recording_opts: {
        layout: { preset: 'grid' }, // 🔧 FIX: Schimbat din 'active-speaker' în 'grid' (suportat pentru cloud recording)
      },
    },
  });

  console.log(`🎥 Cameră Daily.co creată cu succes:`);
  console.log(`   - Room: ${room.name}`);
  console.log(`   - Expiry: ${extendedEndTime.toISOString()} (+5 min buffer)`);
  console.log(`   - Token expiră: ${new Date((Math.floor(Date.now() / 1000) + 24 * 3600) * 1000).toISOString()} (24h de la crearea token-ului)`);
  console.log(`   - Recording layout: grid (fix pentru active-speaker error)`);

  // 5. returnează URL-ul cu token
  return {
    roomUrl: `${room.url}?t=${token}`,
    roomName: room.name,
    roomId: room.id,
    domainName: room.domain_name ?? dailyDomain,
    originalEndTime: endTime,
    extendedEndTime: extendedEndTime,
  };
}

// 🆕 Funcție pentru validarea și obținerea pachetului
async function validateUserPackage(packageId: string, userId: string, providerId: string) {
  console.log(`🔍 Validare pachet: ${packageId} pentru user ${userId} și provider ${providerId}`);
  
  const userPackage = await prisma.userProviderPackage.findFirst({
    where: {
      id: packageId,
      userId: userId,
      providerId: providerId,
    },
    include: {
      providerPackage: {
        select: {
          service: true,
          price: true
        }
      },
      provider: {
        select: {
          mainSpecialityId: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          sessions: {
            where: {
              wasPackageSession: true,
              status: {
                not: 'CANCELLED'
              }
            }
          }
        }
      }
    }
  });

  if (!userPackage) {
    console.error(`❌ Pachetul ${packageId} nu a fost găsit sau nu aparține user-ului ${userId}`);
    throw new Error('Pachetul nu a fost găsit sau nu vă aparține');
  }

  const actualUsedSessions = userPackage._count.sessions;
  const remainingSessions = userPackage.totalSessions - actualUsedSessions;

  console.log(`📊 Statistici pachet: ${actualUsedSessions}/${userPackage.totalSessions} sesiuni folosite, ${remainingSessions} rămase`);

  if (remainingSessions <= 0) {
    console.error(`❌ Pachetul ${packageId} nu mai are sesiuni disponibile (${actualUsedSessions}/${userPackage.totalSessions})`);
    throw new Error('Pachetul nu mai are sesiuni disponibile');
  }

  if (userPackage.expiresAt && userPackage.expiresAt < new Date()) {
    console.error(`❌ Pachetul ${packageId} a expirat la ${userPackage.expiresAt}`);
    throw new Error('Pachetul a expirat');
  }

  console.log(`✅ Pachet valid: ${userPackage.providerPackage?.service} - ${remainingSessions} sesiuni rămase`);
  
  return {
    userPackage,
    actualUsedSessions,
    remainingSessions
  };
}

export async function POST(request: Request) {
  try {
    console.log('📅 Procesare eveniment Calendly cu pachete și extensie 5 minute');

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

    // 🆕 Parsează datele cu packageId
    const { providerId, scheduledEventUri, packageId } = await request.json();

    console.log(`📊 Calendly event data:`, { 
      providerId, 
      scheduledEventUri, 
      packageId, // 🆕 
      clientId: currentUserId 
    });

    // VALIDARE INPUT
    if (!providerId) {
      console.error('❌ providerId lipsește');
      return NextResponse.json(
        { error: 'providerId este obligatoriu' },
        { status: 400 }
      );
    }

    if (!scheduledEventUri) {
      console.error('❌ scheduledEventUri lipsește');
      return NextResponse.json(
        { error: 'scheduledEventUri este obligatoriu' },
        { status: 400 }
      );
    }

    // 🆕 Validare packageId
    if (!packageId) {
      console.error('❌ packageId lipsește');
      return NextResponse.json(
        { error: 'packageId este obligatoriu pentru programare' },
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

    // 🆕 VALIDEAZĂ PACHETUL ÎNAINTE DE CALENDLY
    console.log('🔍 Validare pachet...');
    const { userPackage, actualUsedSessions, remainingSessions } = await validateUserPackage(
      packageId, 
      currentUserId, 
      provider.id
    );

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

    // 🔧 EXTRAGE INFORMAȚIILE DE TIMP (RĂMÂN UTC+3 CA ÎN CALENDLY)
    // Calendly trimite datele în ISO format, probabil deja în timezone-ul configurat
    const startTime = new Date(eventData.start_time); // Păstrează așa cum vine din Calendly
    const originalEndTime = new Date(eventData.end_time);     // Păstrează așa cum vine din Calendly
    const clientEmail = eventData.event_memberships?.[0]?.user_email;
    const clientName = eventData.event_memberships?.[0]?.user_name;

    console.log(`⏰ Timp programat (din Calendly): ${startTime.toISOString()} - ${originalEndTime.toISOString()}`);
    console.log(`📧 Client din Calendly: ${clientName} (${clientEmail})`);
    console.log(`🕐 Timezone note: Datele rămân așa cum vin din Calendly (UTC+3)`);

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

    // 🆕 Creează camera Daily.co cu extensie de 5 minute
    console.log('🎥 Creare cameră Daily.co cu buffer de 5 minute...');
    const dailyRoom = await createDailyRoom(sessionId, originalEndTime);

    // Calculează durata estimată (în minute) - bazată pe timpul original
    const estimatedDuration = Math.round(
      (originalEndTime.getTime() - startTime.getTime()) / (1000 * 60)
    );

    // 🆕 CREEAZĂ SESIUNEA ÎN TRANZACȚIE CU PACHETE ȘI INCREMENTAREA SESIUNILOR FOLOSITE
    console.log('💾 Salvare sesiune în baza de date cu pachete...');
    
    const result = await prisma.$transaction(async (tx) => {
      // Verifică din nou disponibilitatea pachetului în tranzacție (pentru concurență)
      const currentPackage = await tx.userProviderPackage.findUnique({
        where: { id: packageId },
        include: {
          _count: {
            select: {
              sessions: {
                where: {
                  wasPackageSession: true,
                  status: { not: 'CANCELLED' }
                }
              }
            }
          }
        }
      });

      if (!currentPackage) {
        console.error(`❌ Pachetul ${packageId} nu mai există`);
        throw new Error('Pachetul nu mai există');
      }

      const currentUsedSessions = currentPackage._count.sessions;
      if (currentUsedSessions >= currentPackage.totalSessions) {
        console.error(`❌ Pachetul ${packageId} nu mai are sesiuni disponibile în tranzacție (${currentUsedSessions}/${currentPackage.totalSessions})`);
        throw new Error('Pachetul nu mai are sesiuni disponibile');
      }

      // Calculează numărul sesiunii în pachet
      const sessionNumber = currentUsedSessions + 1;

      console.log(`📝 Creez sesiunea #${sessionNumber} din pachetul ${userPackage.providerPackage?.service}`);

      // 🔧 CREEAZĂ SESIUNEA CU DATELE DIN CALENDLY (UTC+3)
      // startTime și originalEndTime rămân așa cum sunt - nu fac nicio conversie
      const sessionRecord = await tx.consultingSession.create({
        data: {
          id: sessionId,
          providerId: provider.id,
          clientId: clientUser.id,
          
          // 🆕 Detalii pachete
          packageId: packageId,
          wasPackageSession: true,
          packageSessionNumber: sessionNumber,
          
          // Daily.co details
          dailyRoomName: dailyRoom.roomName,
          dailyRoomUrl: dailyRoom.roomUrl,
          dailyRoomId: dailyRoom.roomId,
          dailyDomainName: dailyRoom.domainName,
          dailyCreatedAt: new Date(),
          
          // 🔧 Session details - DATELE RĂMÂN CA ÎN CALENDLY (UTC+3)
          startDate: startTime,     // Nu convertesc - păstrez ca vine din Calendly
          endDate: originalEndTime, // 🆕 Păstrează timpul original în DB
          duration: estimatedDuration,
          calendlyEventUri: scheduledEventUri,
          scheduledAt: new Date(),  // Timestamp server pentru metadata
          status: 'SCHEDULED',
          
          
          notes: `Sesiune #${sessionNumber} din pachetul ${userPackage.providerPackage?.service}. Programată prin Calendly pentru ${clientUser.name || clientUser.email}. Camera Daily.co extinsă cu 5 minute buffer (până la ${dailyRoom.extendedEndTime.toISOString()}). Calendly client: ${clientName} (${clientEmail}). Timezone: UTC+3 (păstrat din Calendly). Recording layout: grid (fix pentru active-speaker error).`,
          createdAt: new Date(),    // Timestamp server
          updatedAt: new Date(),    // Timestamp server
        }
      });

      // 🆕 INCREMENTEAZĂ SESIUNILE FOLOSITE ÎN PACHET
      const updatedPackage = await tx.userProviderPackage.update({
        where: { id: packageId },
        data: {
          usedSessions: { increment: 1 }
        }
      });

      console.log(`📊 Incrementat usedSessions pentru pachetul ${packageId}: ${currentPackage.usedSessions} → ${updatedPackage.usedSessions}`);

      return {
        session: sessionRecord,
        packageInfo: {
          sessionNumber,
          remainingSessions: remainingSessions - 1,
          totalSessions: userPackage.totalSessions,
          packageName: userPackage.providerPackage?.service,
          packageId: packageId,
          usedSessions: updatedPackage.usedSessions,
          oldUsedSessions: currentPackage.usedSessions
        }
      };
    });

    console.log(`✅ Ședință salvată cu succes din pachet:`);
    console.log(`   - ID: ${sessionId}`);
    console.log(`   - Client: ${clientUser.name || clientUser.email} (${clientUser.id})`);
    console.log(`   - Provider: ${provider.user.name || provider.user.email} (${provider.id})`);
    console.log(`   - Camera Daily.co: ${dailyRoom.roomUrl}`);
    console.log(`   - 🔧 Timp (UTC+3 din Calendly): ${startTime.toISOString()} - ${originalEndTime.toISOString()}`);
    console.log(`   - 🆕 Timp extins Daily.co: ${dailyRoom.extendedEndTime.toISOString()} (+5 min buffer)`);
    console.log(`   - 🆕 Pachet: ${result.packageInfo.packageName} (sesiunea #${result.packageInfo.sessionNumber})`);
    console.log(`   - 🆕 Sesiuni folosite: ${result.packageInfo.oldUsedSessions} → ${result.packageInfo.usedSessions}`);
    console.log(`   - 🆕 Sesiuni rămase: ${result.packageInfo.remainingSessions}`);
    console.log(`   - 🔧 Recording fix: layout 'grid' (nu mai e active-speaker error)`);

    return NextResponse.json({
      success: true,
      sessionId: result.session.id,
      roomUrl: result.session.dailyRoomUrl,
      joinUrl: `/servicii/video/sessions/${result.session.id}`,
      message: `Sesiunea #${result.packageInfo.sessionNumber} a fost programată cu succes din pachetul ${result.packageInfo.packageName}! Camera are 5 minute buffer și recording cu layout grid.`,
      details: {
        sessionId: result.session.id,
        startDate: result.session.startDate?.toISOString(),
        endDate: result.session.endDate?.toISOString(),
        duration: result.session.duration,
        
        // 🆕 Informații pachete
        packageInfo: result.packageInfo,
        
        // 🆕 Informații despre extensie și fix-uri
        timeInfo: {
          scheduledStart: result.session.startDate?.toISOString(),
          scheduledEnd: result.session.endDate?.toISOString(),
          dailyRoomExpiresAt: dailyRoom.extendedEndTime.toISOString(),
          bufferMinutes: 5,
          note: 'Camera Daily.co are 5 minute buffer față de timpul programat în Calendly',
          dbTimezone: 'UTC+3',
          calendlyTimezone: 'UTC+3 (România)',
          serverTimezone: 'UTC'
        },
        
        // 🆕 Informații token expiry
        tokenInfo: {
          dailyTokenExpiresAt: new Date((Math.floor(Date.now() / 1000) + 24 * 3600) * 1000).toISOString(),
          dailyTokenValidFor: '24 ore de la crearea token-ului',
          roomExpiresAt: dailyRoom.extendedEndTime.toISOString(),
          note: 'Token-ul Daily.co expiră după 24h, camera expiră după timpul programat + 5 min'
        },
        
        // 🆕 Informații fix recording
        recordingInfo: {
          layout: 'grid',
          cloudRecording: true,
          autoStart: true,
          note: 'Layout schimbat din active-speaker în grid pentru compatibilitate cu cloud recording'
        },
        
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
          domainName: dailyRoom.domainName,
          originalEndTime: dailyRoom.originalEndTime.toISOString(),
          extendedEndTime: dailyRoom.extendedEndTime.toISOString()
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
    console.error('❌ Eroare la salvarea ședinței din Calendly cu pachete:', message);
    console.error('Stack trace:', err instanceof Error ? err.stack : 'N/A');
    
    // 🆕 Returnează erori specifice pentru pachete
    if (message.includes('Pachetul nu mai are sesiuni') || message.includes('nu aparține')) {
      return NextResponse.json(
        { 
          error: 'Package validation failed',
          message: message,
          code: 'PACKAGE_ERROR'
        },
        { status: 409 }
      );
    }

    if (message.includes('expirat')) {
      return NextResponse.json(
        { 
          error: 'Package expired',
          message: message,
          code: 'PACKAGE_EXPIRED'
        },
        { status: 410 }
      );
    }
    
    // Returnează erori mai specifice bazate pe tipul erorii
    if (message.includes('Daily.co') || message.includes('DAILY_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'Video room creation failed',
          message: 'Unable to create video room. Please try again later.',
          code: 'DAILY_ERROR'
        },
        { status: 503 }
      );
    }

    if (message.includes('Calendly') || message.includes('CALENDLY')) {
      return NextResponse.json(
        { 
          error: 'Calendly integration error',
          message: 'Unable to fetch event details from Calendly. Please check provider Calendly configuration.',
          code: 'CALENDLY_ERROR'
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Session creation failed',
        message: 'An unexpected error occurred while creating your session.',
        code: 'UNKNOWN_ERROR',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    );
  }
}