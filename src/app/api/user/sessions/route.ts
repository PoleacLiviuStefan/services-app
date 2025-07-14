// /api/user/sessions/route.ts - ACTUALIZAT pentru dual view
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const userId = session.user.id;

    console.log(`📋 Obținere sesiuni DUAL pentru user: ${userId}`);

    // Verifică dacă utilizatorul este provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    const isProvider = !!provider;

    console.log(`👤 User ${userId} este ${isProvider ? 'provider' : 'doar client'}`);

    // === SESIUNI CA PROVIDER ===
    let providerSessions: any[] = [];
    if (isProvider) {
      console.log(`🔍 Căutare sesiuni ca PROVIDER pentru providerId: ${provider.id}`);
      
      try {
        providerSessions = await prisma.consultingSession.findMany({
          where: { providerId: provider.id },
          include: {
            client: {
              select: { id: true, name: true, email: true, image: true }
            },
            speciality: {
              select: { id: true, name: true, description: true, price: true }
            },
            userPackage: {
              select: { 
                id: true, 
                totalSessions: true, 
                usedSessions: true,
                expiresAt: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        });
        
        console.log(`✅ Găsite ${providerSessions.length} sesiuni ca PROVIDER`);
      } catch (error) {
        console.error(`❌ Eroare la căutarea sesiunilor ca provider:`, error);
        providerSessions = [];
      }
    }

    // === SESIUNI CA CLIENT ===
    let clientSessions: any[] = [];
    
    // Încearcă strategii multiple pentru a găsi sesiunile ca client
    console.log(`🔍 Căutare sesiuni ca CLIENT pentru userId: ${userId}`);
    
    // STRATEGIA 1: Model Client (dacă există)
    try {
      const clientRecord = await prisma.client.findUnique({
        where: { userId },
        select: { id: true }
      });
      
      if (clientRecord) {
        console.log(`✅ Strategia 1 - folosesc clientId din model client: ${clientRecord.id}`);
        
        clientSessions = await prisma.consultingSession.findMany({
          where: { clientId: clientRecord.id },
          include: {
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true }
                }
              }
            },
            speciality: {
              select: { id: true, name: true, description: true, price: true }
            },
            userPackage: {
              select: { 
                id: true, 
                totalSessions: true, 
                usedSessions: true,
                expiresAt: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        });
        
        console.log(`✅ Găsite ${clientSessions.length} sesiuni ca CLIENT (strategia 1)`);
      } else {
        console.log(`⚠️ Strategia 1 - nu s-a găsit client record pentru userId: ${userId}`);
      }
    } catch (error) {
      console.log(`❌ Strategia 1 failed (model client nu există):`, error.message);
    }
    
    // STRATEGIA 2: clientId = userId direct (dacă strategia 1 nu a funcționat)
    if (clientSessions.length === 0) {
      console.log(`🔄 Încerc strategia 2 - clientId = userId direct`);
      
      try {
        clientSessions = await prisma.consultingSession.findMany({
          where: { clientId: userId },
          include: {
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true }
                }
              }
            },
            speciality: {
              select: { id: true, name: true, description: true, price: true }
            },
            userPackage: {
              select: { 
                id: true, 
                totalSessions: true, 
                usedSessions: true,
                expiresAt: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        });
        
        console.log(`✅ Găsite ${clientSessions.length} sesiuni ca CLIENT (strategia 2)`);
      } catch (error) {
        console.error(`❌ Strategia 2 failed:`, error);
        clientSessions = [];
      }
    }

    // === PROCESARE ÎNREGISTRĂRI ===
    const allSessions = [...providerSessions, ...clientSessions];
    
    // Pentru fiecare sesiune completă, încearcă să obții înregistrarea
    for (const sess of allSessions) {
      const isSessionCompleted = sess.status === 'COMPLETED' || sess.isFinished;
      const hasRoomName = sess.dailyRoomName;
      const missingRecording = !sess.recordingUrl;
      
      if (isSessionCompleted && hasRoomName && missingRecording) {
        console.log(`🔍 CĂUTARE înregistrare pentru sesiunea ${sess.id} (${sess.dailyRoomName})`);
        
        try {
          const recordingData = await fetchRecordingFromDaily(sess.dailyRoomName);
          if (recordingData) {
            console.log(`✅ GĂSIT! Actualizez sesiunea ${sess.id} cu URL: ${recordingData.url}`);
            
            await prisma.consultingSession.update({
              where: { id: sess.id },
              data: { 
                recordingUrl: recordingData.url,
                hasRecording: true,
                recordingStatus: recordingData.status,
                recordingDuration: recordingData.duration,
                updatedAt: new Date()
              }
            });
            
            // Actualizează obiectul local
            sess.recordingUrl = recordingData.url;
            sess.hasRecording = true;
            sess.recordingStatus = recordingData.status;
            sess.recordingDuration = recordingData.duration;
          }
        } catch (error) {
          console.error(`❌ Eroare la obținerea înregistrării pentru ${sess.id}:`, error);
        }
      }
    }

    // === MAPAREA DATELOR ===
    const mapSessionToResponse = (sess: any, userRole: 'provider' | 'client') => {
      let counterpart, counterpartEmail, counterpartImage;
      
      if (userRole === 'provider') {
        // Pentru provider, afișează info despre client
        if (sess.client) {
          counterpart = sess.client.name || sess.client.email || 'Client necunoscut';
          counterpartEmail = sess.client.email || null;
          counterpartImage = sess.client.image || null;
        } else {
          counterpart = 'Client necunoscut';
          counterpartEmail = null;
          counterpartImage = null;
        }
      } else {
        // Pentru client, afișează info despre provider  
        counterpart = sess.provider.user.name || sess.provider.user.email || 'Provider necunoscut';
        counterpartEmail = sess.provider.user.email || null;
        counterpartImage = sess.provider.user.image || null;
      }

      // Determină informațiile despre înregistrare
      const hasRecording = !!(
        sess.hasRecording || 
        sess.recordingUrl || 
        sess.recordingStatus === 'READY' || 
        sess.recordingStatus === 'PROCESSING'
      );
      
      const recordingInfo = {
        hasRecording,
        recordingUrl: sess.recordingUrl,
        recordingStatus: sess.recordingStatus || 'NONE',
        recordingAvailable: !!(sess.recordingUrl && sess.recordingStatus === 'READY'),
        recordingProcessing: sess.recordingStatus === 'PROCESSING'
      };

      return {
        id: sess.id,
        startDate: sess.startDate?.toISOString() || null,
        endDate: sess.endDate?.toISOString() || null,
        joinUrl: sess.dailyRoomUrl || '',
        roomName: sess.dailyRoomName,
        roomId: sess.dailyRoomId,
        counterpart,
        counterpartEmail,
        counterpartImage,
        speciality: sess.speciality?.name || 'Serviciu necunoscut',
        specialityId: sess.speciality?.id || null,
        status: sess.status,
        duration: sess.duration,
        actualDuration: sess.actualDuration,
        isFinished: sess.isFinished,
        participantCount: sess.participantCount,
        rating: sess.rating,
        feedback: sess.feedback,
        notes: sess.notes,
        totalPrice: sess.totalPrice,
        role: userRole,
        createdAt: sess.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: sess.updatedAt?.toISOString() || new Date().toISOString(),
        
        scheduledAt: sess.scheduledAt?.toISOString() || null,
        joinedAt: sess.joinedAt?.toISOString() || null,
        leftAt: sess.leftAt?.toISOString() || null,
        
        // Recording information
        recordingUrl: sess.recordingUrl,
        hasRecording: recordingInfo.hasRecording,
        recordingAvailable: recordingInfo.recordingAvailable,
        recordingProcessing: recordingInfo.recordingProcessing,
        recordingStarted: sess.recordingStarted || false,
        recordingStartedAt: sess.recordingStartedAt?.toISOString() || null,
        recordingStoppedAt: sess.recordingStoppedAt?.toISOString() || null,
        recordingDuration: sess.recordingDuration || null,
        recordingStatus: sess.recordingStatus || 'NONE',
        
        // Daily.co integration
        dailyRoomName: sess.dailyRoomName,
        dailyDomainName: sess.dailyDomainName,
        dailyCreatedAt: sess.dailyCreatedAt?.toISOString() || null,
        
        // Package information
        packageInfo: sess.userPackage ? {
          id: sess.userPackage.id,
          service: sess.speciality?.name || 'Serviciu necunoscut',
          totalSessions: sess.userPackage.totalSessions,
          usedSessions: sess.userPackage.usedSessions,
          remainingSessions: sess.userPackage.totalSessions - sess.userPackage.usedSessions,
          expiresAt: sess.userPackage.expiresAt?.toISOString() || null,
          price: sess.speciality?.price || 0
        } : null,

        calendlyEventUri: sess.calendlyEventUri
      };
    };

    // Mapează sesiunile
    const mappedProviderSessions = providerSessions.map(sess => mapSessionToResponse(sess, 'provider'));
    const mappedClientSessions = clientSessions.map(sess => mapSessionToResponse(sess, 'client'));

    // === STATISTICI SEPARATE ===
    const calculateStats = (sessions: any[]) => ({
      total: sessions.length,
      scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
      inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
      completed: sessions.filter(s => s.status === 'COMPLETED').length,
      cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
      noShow: sessions.filter(s => s.status === 'NO_SHOW').length,
      withRecording: sessions.filter(s => s.hasRecording || s.recordingProcessing).length,
      recordingReady: sessions.filter(s => s.recordingAvailable).length,
      recordingProcessing: sessions.filter(s => s.recordingProcessing).length
    });

    const stats = {
      provider: calculateStats(mappedProviderSessions),
      client: calculateStats(mappedClientSessions)
    };

    console.log(`📈 Statistici DUAL pentru user ${userId}:`, {
      provider: stats.provider,
      client: stats.client,
      total: mappedProviderSessions.length + mappedClientSessions.length
    });

    return NextResponse.json({
      providerSessions: mappedProviderSessions,
      clientSessions: mappedClientSessions,
      totalCount: mappedProviderSessions.length + mappedClientSessions.length,
      isProvider,
      stats,
      providerId: provider?.id || null
    });

  } catch (error) {
    console.error("❌ Error fetching dual sessions:", error);
    console.error("❌ Error stack:", error.stack);
    
    return NextResponse.json(
      { 
        error: "Eroare internă la obținerea sesiunilor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Funcție helper pentru a obține înregistrarea de la Daily.co
async function fetchRecordingFromDaily(roomName: string | null): Promise<{url: string, status: string, duration: number | null} | null> {
  if (!roomName) return null;

  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured, cannot fetch recordings');
    return null;
  }

  try {
    console.log(`🔍 CĂUTARE Daily.co pentru camera: ${roomName}`);
    
    const response = await fetch(`https://api.daily.co/v1/recordings?limit=100`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch recordings from Daily.co: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const recordings = data.data || [];
    
    console.log(`📊 Verificare din ${recordings.length} înregistrări Daily.co`);
    
    // Găsește înregistrarea pentru camera specificată
    let recording = recordings.find((r: any) => r.room_name === roomName);
    
    // Dacă nu găsește exact, încearcă căutare fuzzy
    if (!recording) {
      console.log(`🔍 Căutare exactă eșuată pentru ${roomName}, încerc căutare fuzzy...`);
      recording = recordings.find((r: any) => 
        r.room_name && roomName && 
        (r.room_name.includes(roomName) || roomName.includes(r.room_name))
      );
      
      if (recording) {
        console.log(`✅ Găsit cu căutare fuzzy: ${recording.room_name} pentru ${roomName}`);
      }
    }
    
    if (recording) {
      console.log(`✅ Înregistrare găsită:`, {
        id: recording.id,
        room_name: recording.room_name,
        status: recording.status,
        duration: recording.duration,
        download_link: recording.download_link ? 'Available' : 'Not ready'
      });

      const result = {
        url: recording.download_link || null,
        status: recording.status === 'finished' ? 'READY' : 
                recording.status === 'in-progress' ? 'PROCESSING' : 
                recording.status === 'failed' ? 'FAILED' : 'UNKNOWN',
        duration: recording.duration ? Math.round(recording.duration / 60) : null
      };
      
      if (result.url || result.status === 'PROCESSING') {
        return result;
      }
    } else {
      console.log(`❌ Nu s-a găsit înregistrare pentru camera ${roomName}`);
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching recording from Daily.co:', error);
    return null;
  }
}