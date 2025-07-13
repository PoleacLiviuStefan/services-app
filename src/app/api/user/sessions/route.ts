// /api/user/sessions/route.ts
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

    console.log(`📋 Obținere sesiuni pentru user: ${userId}`);

    // Verifică dacă utilizatorul este provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true }
    });

    const isProvider = !!provider;

    console.log(`👤 User ${userId} este ${isProvider ? 'provider' : 'client'}`);

    // Pentru clienți, verifică mai multe strategii
    let whereCondition;
    
    if (isProvider) {
      whereCondition = { providerId: provider.id };
    } else {
      // STRATEGIA 1: Încearcă cu model `client` (lowercase)
      try {
        const clientRecord = await prisma.client.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (clientRecord) {
          whereCondition = { clientId: clientRecord.id };
          console.log(`✅ Strategia 1 - folosesc clientId din model client: ${clientRecord.id}`);
        } else {
          console.log(`⚠️ Strategia 1 - nu s-a găsit client record pentru userId: ${userId}`);
          whereCondition = { clientId: userId }; // Fallback la strategia 2
        }
      } catch (error) {
        console.log(`❌ Strategia 1 failed (model client nu există):`, error.message);
        
        // STRATEGIA 2: clientId se referă direct la userId
        console.log(`🔄 Încerc strategia 2 - clientId = userId direct`);
        whereCondition = { clientId: userId };
      }
    }

    console.log('🔍 Where condition:', whereCondition);

    // Obține sesiunile cu toate câmpurile de recording
    let consultingSessions;
    
    try {
      consultingSessions = await prisma.consultingSession.findMany({
        where: whereCondition,
        include: {
          provider: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
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
    } catch (includeError) {
      console.log(`❌ Eroare cu include client, încerc fără:`, includeError.message);
      
      // Dacă include-ul pentru client eșuează, încearcă fără el
      consultingSessions = await prisma.consultingSession.findMany({
        where: whereCondition,
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
    }

    console.log(`📊 Găsite ${consultingSessions.length} sesiuni pentru user ${userId}`);

    // Pentru fiecare sesiune completă, încearcă AGRESIV să obții înregistrarea
    for (const sess of consultingSessions) {
      const isSessionCompleted = sess.status === 'COMPLETED' || sess.isFinished;
      const hasRoomName = sess.dailyRoomName;
      const missingRecording = !sess.recordingUrl;
      
      if (isSessionCompleted && hasRoomName && missingRecording) {
        console.log(`🔍 CĂUTARE AGRESIVĂ înregistrare pentru sesiunea ${sess.id} (${sess.dailyRoomName})`);
        
        try {
          const recordingData = await fetchRecordingFromDaily(sess.dailyRoomName);
          if (recordingData) {
            console.log(`✅ GĂSIT! Actualizez sesiunea ${sess.id} cu URL: ${recordingData.url}`);
            
            // Actualizează sesiunea cu datele găsite
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
            
            // Actualizează obiectul local pentru response
            sess.recordingUrl = recordingData.url;
            sess.hasRecording = true;
            sess.recordingStatus = recordingData.status;
            sess.recordingDuration = recordingData.duration;
          } else {
            console.log(`❌ Nu s-a găsit înregistrare pentru ${sess.id} (${sess.dailyRoomName})`);
            
            // Marchează că am încercat să găsim înregistrarea
            if (sess.recordingStatus !== 'NOT_FOUND') {
              await prisma.consultingSession.update({
                where: { id: sess.id },
                data: { 
                  recordingStatus: 'NOT_FOUND',
                  updatedAt: new Date()
                }
              });
              sess.recordingStatus = 'NOT_FOUND';
            }
          }
        } catch (error) {
          console.error(`❌ Eroare la obținerea înregistrării pentru ${sess.id}:`, error);
        }
      }
    }

    // Mapează datele pentru frontend
    const sessions = consultingSessions.map(sess => {
      // Pentru counterpart info, adaptează-te la structura disponibilă
      let counterpart, counterpartEmail, counterpartImage;
      
      if (isProvider) {
        // Pentru provider, afișează info despre client
        if (sess.client) {
          // Dacă există relația client
          counterpart = sess.client.name || sess.client.email || 'Client necunoscut';
          counterpartEmail = sess.client.email || null;
          counterpartImage = sess.client.image || null;
        } else {
          // Dacă nu există relația client, poate că clientId e direct userId
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

      // Determină dacă sesiunea are înregistrare disponibilă - LOGICĂ ÎMBUNĂTĂȚITĂ
      const hasRecording = !!(
        sess.hasRecording || 
        sess.recordingUrl || 
        sess.recordingStatus === 'READY' || 
        sess.recordingStatus === 'PROCESSING'
      );
      
      // Mai bună determinare a statusului înregistrării
      const recordingInfo = {
        hasRecording,
        recordingUrl: sess.recordingUrl,
        recordingStatus: sess.recordingStatus || 'NONE',
        recordingAvailable: !!(sess.recordingUrl && sess.recordingStatus === 'READY'),
        recordingProcessing: sess.recordingStatus === 'PROCESSING'
      };

      // Determină statusul real al sesiunii
      const now = new Date();
      let actualStatus = sess.status;
      
      // Dacă sesiunea e programată dar a trecut timpul, poate fi considerată "missed" 
      if (sess.status === 'SCHEDULED' && sess.startDate && new Date(sess.startDate) < now) {
        // Verifică dacă cineva s-a alăturat
        if (!sess.joinedAt) {
          actualStatus = 'NO_SHOW';
        }
      }

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
        status: actualStatus,
        duration: sess.duration, // Durata estimată
        actualDuration: sess.actualDuration, // Durata reală
        isFinished: sess.isFinished,
        participantCount: sess.participantCount,
        rating: sess.rating,
        feedback: sess.feedback,
        notes: sess.notes,
        totalPrice: sess.totalPrice,
        role: isProvider ? 'provider' as const : 'client' as const,
        createdAt: sess.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: sess.updatedAt?.toISOString() || new Date().toISOString(),
        
        // Session timing
        scheduledAt: sess.scheduledAt?.toISOString() || null,
        joinedAt: sess.joinedAt?.toISOString() || null,
        leftAt: sess.leftAt?.toISOString() || null,
        
        // Recording information - ACTUALIZAT ȘI ÎMBUNĂTĂȚIT
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

        // Calendly integration (dacă există)
        calendlyEventUri: sess.calendlyEventUri
      };
    });

    // Grupează sesiunile pe statusuri pentru statistici - ÎMBUNĂTĂȚIT
    const stats = {
      total: sessions.length,
      scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
      inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
      completed: sessions.filter(s => s.status === 'COMPLETED').length,
      cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
      noShow: sessions.filter(s => s.status === 'NO_SHOW').length,
      withRecording: sessions.filter(s => s.hasRecording || s.recordingProcessing).length,
      recordingReady: sessions.filter(s => s.recordingAvailable).length,
      recordingProcessing: sessions.filter(s => s.recordingProcessing).length
    };

    console.log(`📈 Statistici sesiuni pentru user ${userId}:`, stats);

    return NextResponse.json({
      sessions,
      totalCount: sessions.length,
      isProvider,
      stats,
      providerId: provider?.id || null
    });

  } catch (error) {
    console.error("❌ Error fetching user sessions:", error);
    
    // Log-uri mai detaliate pentru debugging
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
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
    
    // Găsește înregistrarea pentru camera specificată (căutare exactă)
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
        download_link: recording.download_link ? 'Available' : 'Not ready',
        created_at: recording.created_at
      });

      // Returnează datele chiar dacă înregistrarea nu e gata încă
      const result = {
        url: recording.download_link || null,
        status: recording.status === 'finished' ? 'READY' : 
                recording.status === 'in-progress' ? 'PROCESSING' : 
                recording.status === 'failed' ? 'FAILED' : 'UNKNOWN',
        duration: recording.duration ? Math.round(recording.duration / 60) : null // convertește în minute
      };
      
      // Returnează doar dacă are URL sau este în procesare
      if (result.url || result.status === 'PROCESSING') {
        return result;
      }
    } else {
      console.log(`❌ Nu s-a găsit înregistrare pentru camera ${roomName}`);
      
      // Debug: afișează primele 5 camere pentru debugging
      const sampleRooms = recordings.slice(0, 5).map((r: any) => r.room_name);
      console.log(`🔍 Primele 5 camere din Daily.co: ${sampleRooms.join(', ')}`);
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching recording from Daily.co:', error);
    return null;
  }
}