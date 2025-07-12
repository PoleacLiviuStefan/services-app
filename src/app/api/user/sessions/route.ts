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

    // Pentru fiecare sesiune finalizată fără recording URL, încearcă să obții de la Daily.co
    for (const sess of consultingSessions) {
      if (sess.status === 'COMPLETED' && !sess.recordingUrl && sess.dailyRoomName) {
        console.log(`🔍 Verificare înregistrare pentru sesiunea ${sess.id} (${sess.dailyRoomName})`);
        
        try {
          const recordingUrl = await fetchRecordingFromDaily(sess.dailyRoomName);
          if (recordingUrl) {
            // Actualizează sesiunea cu URL-ul găsit
            await prisma.consultingSession.update({
              where: { id: sess.id },
              data: { 
                recordingUrl: recordingUrl,
                hasRecording: true,
                recordingStatus: 'READY',
                updatedAt: new Date()
              }
            });
            
            // Actualizează obiectul local pentru response
            sess.recordingUrl = recordingUrl;
            sess.hasRecording = true;
            sess.recordingStatus = 'READY';
            
            console.log(`✅ URL înregistrare găsit și salvat pentru ${sess.id}: ${recordingUrl}`);
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

      // Determină dacă sesiunea are înregistrare disponibilă
      const hasRecording = !!(sess.hasRecording || sess.recordingUrl);

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
        
        // Recording information - ACTUALIZAT
        recordingUrl: sess.recordingUrl,
        hasRecording,
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

    // Grupează sesiunile pe statusuri pentru statistici
    const stats = {
      total: sessions.length,
      scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
      inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
      completed: sessions.filter(s => s.status === 'COMPLETED').length,
      cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
      noShow: sessions.filter(s => s.status === 'NO_SHOW').length,
      withRecording: sessions.filter(s => s.hasRecording).length
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
async function fetchRecordingFromDaily(roomName: string | null): Promise<string | null> {
  if (!roomName) return null;

  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured, cannot fetch recordings');
    return null;
  }

  try {
    const response = await fetch(`https://api.daily.co/v1/recordings`, {
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
    
    // Găsește înregistrarea pentru camera specificată
    const recording = recordings.find((r: any) => r.room_name === roomName);
    
    if (recording && recording.download_link && recording.status === 'finished') {
      return recording.download_link;
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching recording from Daily.co:', error);
    return null;
  }
}