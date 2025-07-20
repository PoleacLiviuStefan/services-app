// /api/user/sessions/route.ts - API CU LEGĂTURĂ DIRECTĂ RECENZII
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Funcție pentru calcularea statisticilor de recenzii pentru provider
async function getProviderReviewStats(providerId: string) {
  try {
    const reviewStats = await prisma.review.aggregate({
      where: {
        providerId: providerId
      },
      _count: {
        id: true
      },
      _avg: {
        rating: true
      }
    });

    return {
      totalReviews: reviewStats._count.id || 0,
      averageRating: reviewStats._avg.rating || 0
    };
  } catch (error) {
    console.error('❌ Eroare la calcularea statisticilor de recenzii:', error);
    return {
      totalReviews: 0,
      averageRating: 0
    };
  }
}

export async function GET(): Promise<NextResponse> {
   console.log(`⏰ Server time: ${new Date().toISOString()}`);
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
        // 🔧 QUERY DEFENSIV CU TRY-CATCH PENTRU REVIEW INCLUDE
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
    },
    review: {
      include: {
        fromUser: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    }
  },
  orderBy: { startDate: 'desc' }
});

        
        console.log(`✅ Găsite ${providerSessions.length} sesiuni ca PROVIDER`);
        
        // 🔧 ÎNCARCĂ RECENZIILE SEPARAT PENTRU DEBUGGING
        if (providerSessions.length > 0) {
          console.log(`🔍 Încărcare recenzii separate pentru ${providerSessions.length} sesiuni provider...`);
          
          for (const session of providerSessions) {
            try {
              const review = await prisma.review.findUnique({
                where: { sessionId: session.id },
                include: {
                  fromUser: {
                    select: { name: true, email: true, image: true }
                  }
                }
              });
              
              session.review = review;
              
              if (review) {
                console.log(`📝 Găsită recenzie pentru sesiunea ${session.id}: ${review.rating}/5`);
              }
            } catch (reviewError) {
              console.error(`❌ Eroare la încărcarea recenziei pentru sesiunea ${session.id}:`, reviewError);
              session.review = null;
            }
          }
        }
        
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
      // Verificăm dacă există modelul Client în schema
      const clientRecord = await prisma.client?.findUnique({
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
    },
    review: {
      include: {
        fromUser: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    }
  },
  orderBy: { startDate: 'desc' }
});

        
        console.log(`✅ Găsite ${clientSessions.length} sesiuni ca CLIENT (strategia 1)`);
        
        // 🔧 ÎNCARCĂ RECENZIILE SEPARAT PENTRU CLIENT
        if (clientSessions.length > 0) {
          console.log(`🔍 Încărcare recenzii separate pentru ${clientSessions.length} sesiuni client...`);
          
          for (const session of clientSessions) {
            try {
              const review = await prisma.review.findUnique({
                where: { sessionId: session.id }
              });
              
              session.review = review;
              
              if (review) {
                console.log(`📝 Găsită recenzie pentru sesiunea ${session.id}: ${review.rating}/5`);
              }
            } catch (reviewError) {
              console.error(`❌ Eroare la încărcarea recenziei pentru sesiunea ${session.id}:`, reviewError);
              session.review = null;
            }
          }
        }
        
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
    },
    review: {
      include: {
        fromUser: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    }
  },
  orderBy: { startDate: 'desc' }
});

        
        console.log(`✅ Găsite ${clientSessions.length} sesiuni ca CLIENT (strategia 2)`);
        
        // 🔧 ÎNCARCĂ RECENZIILE SEPARAT PENTRU CLIENT (STRATEGIA 2)
        if (clientSessions.length > 0) {
          console.log(`🔍 Încărcare recenzii separate pentru ${clientSessions.length} sesiuni client (strategia 2)...`);
          
          for (const session of clientSessions) {
            try {
              const review = await prisma.review.findUnique({
                where: { sessionId: session.id }
              });
              
              session.review = review;
              
              if (review) {
                console.log(`📝 Găsită recenzie pentru sesiunea ${session.id}: ${review.rating}/5`);
              }
            } catch (reviewError) {
              console.error(`❌ Eroare la încărcarea recenziei pentru sesiunea ${session.id}:`, reviewError);
              session.review = null;
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Strategia 2 failed:`, error);
        clientSessions = [];
      }
    }

    // === VERIFICARE ȘI ACTUALIZARE STATUS SESIUNI ===
    const allSessions = [...providerSessions, ...clientSessions];
    const sessionsToUpdate: {id: string, status: string, isFinished: boolean, reason: string}[] = [];

    for (const sess of allSessions) {
      const statusCheck = checkAndUpdateSessionStatus(sess);
      
      if (statusCheck.needsUpdate) {
        console.log(`🔄 Sesiunea ${sess.id} necesită actualizare:`, {
          oldStatus: sess.status,
          newStatus: statusCheck.newStatus,
          oldIsFinished: sess.isFinished,
          newIsFinished: statusCheck.newIsFinished,
          reason: statusCheck.reason
        });
        
        sessionsToUpdate.push({
          id: sess.id,
          status: statusCheck.newStatus,
          isFinished: statusCheck.newIsFinished,
          reason: statusCheck.reason
        });
        
        // Actualizează obiectul local pentru răspuns
        sess.status = statusCheck.newStatus;
        sess.isFinished = statusCheck.newIsFinished;
      }
    }

    // Actualizează sesiunile în baza de date (în batch-uri pentru performanță)
    if (sessionsToUpdate.length > 0) {
      console.log(`🔄 Actualizez ${sessionsToUpdate.length} sesiuni în baza de date`);
      
      try {
        const updateGroups = sessionsToUpdate.reduce((groups, session) => {
          const key = `${session.status}-${session.isFinished}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(session.id);
          return groups;
        }, {} as Record<string, string[]>);

        const updatePromises = Object.entries(updateGroups).map(([key, sessionIds]) => {
          const [status, isFinished] = key.split('-');
          return prisma.consultingSession.updateMany({
            where: { id: { in: sessionIds } },
            data: {
              status: status as any,
              isFinished: isFinished === 'true',
              updatedAt: new Date()
            }
          });
        });

        await Promise.all(updatePromises);
        
        console.log(`✅ Sesiuni actualizate cu succes:`, {
          total: sessionsToUpdate.length,
          byStatus: sessionsToUpdate.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });
        
      } catch (error) {
        console.error(`❌ Eroare la actualizarea sesiunilor:`, error);
      }
    }

    // === PROCESARE ÎNREGISTRĂRI ===
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

    // === MAPAREA DATELOR (SIMPLIFICATĂ CU LEGĂTURA DIRECTĂ) ===
    const mapSessionToResponse = (sess: any, userRole: 'provider' | 'client') => {
      try {
        let counterpart, counterpartEmail, counterpartImage, clientId = null;
        
        if (userRole === 'provider') {
          // Pentru provider, afișează info despre client
          if (sess.client) {
            counterpart = sess.client.name || sess.client.email || 'Client necunoscut';
            counterpartEmail = sess.client.email || null;
            counterpartImage = sess.client.image || null;
            clientId = sess.client.id;
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

        // 🆕 EXTRAGE RECENZIA DIRECT DIN SESIUNE (DEFENSIV)
        let reviewInfo = {
          hasReview: false,
          myReview: null,
          clientReview: null
        };

        try {
          if (sess.review) {
            if (userRole === 'client' && sess.review.fromUserId === userId) {
              // Pentru client - recenzia pe care a dat-o
              reviewInfo = {
                hasReview: true,
                myReview: {
                  id: sess.review.id,
                  rating: sess.review.rating,
                  comment: sess.review.comment,
                  date: sess.review.date.toISOString()
                },
                clientReview: null
              };
            } else if (userRole === 'provider' && sess.review.fromUserId === clientId) {
              // Pentru provider - recenzia primită de la client
              const clientName = sess.review.fromUser?.name || sess.review.fromUser?.email || counterpart;
              reviewInfo = {
                hasReview: false, // Provider nu dă recenzii
                myReview: null,
                clientReview: {
                  id: sess.review.id,
                  rating: sess.review.rating,
                  comment: sess.review.comment,
                  date: sess.review.date.toISOString(),
                  clientName: clientName
                }
              };
            }
          }
        } catch (reviewMappingError) {
          console.error(`❌ Eroare la maparea recenziei pentru sesiunea ${sess.id}:`, reviewMappingError);
          // Păstrează valorile default pentru reviewInfo
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

        const baseSessionData = {
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

          calendlyEventUri: sess.calendlyEventUri,

          // 🆕 INFORMAȚII PENTRU RECENZII (SIMPLIFICATE)
          providerId: userRole === 'client' ? sess.providerId : null,
          clientId: userRole === 'provider' ? clientId : null,
          hasReview: reviewInfo.hasReview,
          myReview: reviewInfo.myReview,
          clientReview: reviewInfo.clientReview,

          // Timezone metadata
          timezone: {
            dbTimezone: 'UTC',
            serverTimezone: 'UTC',
            environment: process.env.NODE_ENV,
            needsConversion: false,
            offsetApplied: process.env.NODE_ENV === 'production',
            note: process.env.NODE_ENV === 'production' 
              ? 'Production: Datele sunt UTC+3 din Calendly'
              : 'Development: Datele sunt în UTC'
          }
        };

        return baseSessionData;
        
      } catch (mappingError) {
        console.error(`❌ Eroare critică la maparea sesiunii ${sess.id}:`, mappingError);
        
        // Returnează un obiect minimal pentru a preveni crash-ul complet
        return {
          id: sess.id || 'unknown',
          startDate: null,
          endDate: null,
          joinUrl: '',
          roomName: null,
          roomId: null,
          counterpart: 'Eroare la încărcare',
          counterpartEmail: null,
          counterpartImage: null,
          speciality: 'Eroare la încărcare',
          specialityId: null,
          status: sess.status || 'SCHEDULED',
          duration: null,
          actualDuration: null,
          isFinished: false,
          participantCount: null,
          rating: null,
          feedback: null,
          notes: null,
          totalPrice: null,
          role: userRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scheduledAt: null,
          joinedAt: null,
          leftAt: null,
          recordingUrl: null,
          hasRecording: false,
          recordingAvailable: false,
          recordingProcessing: false,
          recordingStarted: false,
          recordingStartedAt: null,
          recordingStoppedAt: null,
          recordingDuration: null,
          recordingStatus: 'NONE',
          dailyRoomName: null,
          dailyDomainName: null,
          dailyCreatedAt: null,
          packageInfo: null,
          calendlyEventUri: null,
          providerId: null,
          clientId: null,
          hasReview: false,
          myReview: null,
          clientReview: null,
          timezone: {
            dbTimezone: 'UTC',
            serverTimezone: 'UTC',
            environment: process.env.NODE_ENV,
            needsConversion: false,
            offsetApplied: false,
            note: 'Sesiune cu erori - date minime'
          }
        };
      }
    };

    // Mapează sesiunile (acum cu recenziile incluse direct) - DEFENSIV
    let mappedProviderSessions: any[] = [];
    let mappedClientSessions: any[] = [];
    
    try {
      mappedProviderSessions = providerSessions.map(sess => mapSessionToResponse(sess, 'provider'));
      console.log(`✅ Mapare provider sessions: ${mappedProviderSessions.length}`);
    } catch (mappingError) {
      console.error(`❌ Eroare la maparea sesiunilor provider:`, mappingError);
      mappedProviderSessions = [];
    }
    
    try {
      mappedClientSessions = clientSessions.map(sess => mapSessionToResponse(sess, 'client'));
      console.log(`✅ Mapare client sessions: ${mappedClientSessions.length}`);
    } catch (mappingError) {
      console.error(`❌ Eroare la maparea sesiunilor client:`, mappingError);
      mappedClientSessions = [];
    }

    // 🆕 CALCULEAZĂ STATISTICILE PENTRU PROVIDER (dacă este provider) - DEFENSIV
    let providerReviewStats = { totalReviews: 0, averageRating: 0 };
    
    if (isProvider && provider) {
      try {
        providerReviewStats = await getProviderReviewStats(provider.id);
        console.log(`📊 Statistici recenzii provider:`, providerReviewStats);
      } catch (statsError) {
        console.error(`❌ Eroare la calcularea statisticilor provider:`, statsError);
        // Păstrează valorile default
      }
    }

    // === STATISTICI SEPARATE ===
    const calculateStats = (sessions: any[], role: 'provider' | 'client') => {
      const baseStats = {
        total: sessions.length,
        scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
        inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
        completed: sessions.filter(s => s.status === 'COMPLETED').length,
        cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
        noShow: sessions.filter(s => s.status === 'NO_SHOW').length,
        expired: sessions.filter(s => s.isFinished && s.status === 'NO_SHOW').length,
        withRecording: sessions.filter(s => s.hasRecording || s.recordingProcessing).length,
        recordingReady: sessions.filter(s => s.recordingAvailable).length,
        recordingProcessing: sessions.filter(s => s.recordingProcessing).length
      };

      // Adaugă statistici pentru recenzii
      if (role === 'client') {
        return {
          ...baseStats,
          completedWithReviews: sessions.filter(s => (s.status === 'COMPLETED' || s.isFinished) && s.hasReview).length,
          completedWithoutReviews: sessions.filter(s => (s.status === 'COMPLETED' || s.isFinished) && !s.hasReview).length,
          totalReviews: sessions.filter(s => s.hasReview).length
        };
      } else {
        // Pentru provider - statistici despre recenziile primite
        return {
          ...baseStats,
          totalReviews: providerReviewStats.totalReviews,
          averageRating: providerReviewStats.averageRating
        };
      }
    };

    const stats = {
      provider: calculateStats(mappedProviderSessions, 'provider'),
      client: calculateStats(mappedClientSessions, 'client')
    };

    // Timezone info
    const nowUTC = new Date();
    const isProduction = process.env.NODE_ENV === 'production';
    const ROMANIA_OFFSET = isProduction ? 3 * 60 * 60 * 1000 : 0;
    const nowAdjusted = new Date(nowUTC.getTime() + ROMANIA_OFFSET);

    // === LOG PENTRU DEBUGGING ===
    console.log(`📊 Rezumat actualizări sesiuni pentru user ${userId}:`, {
      totalSessions: allSessions.length,
      sessionsUpdated: sessionsToUpdate.length,
      updates: sessionsToUpdate.map(s => ({
        id: s.id,
        newStatus: s.status,
        reason: s.reason
      })),
      environment: process.env.NODE_ENV,
      serverTimeUTC: nowUTC.toISOString(),
      adjustedTime: nowAdjusted.toISOString(),
      offsetApplied: `${ROMANIA_OFFSET / (60 * 60 * 1000)} hours`,
      reviewsIncluded: 'Direct from session relations'
    });

    console.log(`📈 Statistici DUAL pentru user ${userId}:`, {
      provider: stats.provider,
      client: stats.client,
      total: mappedProviderSessions.length + mappedClientSessions.length,
      reviews: {
        clientReviews: mappedClientSessions.filter(s => s.hasReview).length,
        providerReviews: mappedProviderSessions.filter(s => s.clientReview).length,
        providerStats: providerReviewStats
      }
    });

    return NextResponse.json({
      providerSessions: mappedProviderSessions, // 🆕 Sesiuni provider cu recenzii incluse direct
      clientSessions: mappedClientSessions, // 🆕 Sesiuni client cu recenzii incluse direct
      totalCount: mappedProviderSessions.length + mappedClientSessions.length,
      isProvider,
      stats,
      providerId: provider?.id || null,
      sessionsUpdated: sessionsToUpdate.length,
      
      // 🆕 INFORMAȚII DESPRE RECENZII (SIMPLIFICATE)
      reviewsInfo: {
        client: {
          totalReviews: mappedClientSessions.filter(s => s.hasReview).length,
          sessionsWithReviews: mappedClientSessions.filter(s => s.hasReview).length,
          sessionsWithoutReviews: mappedClientSessions.filter(s => !s.hasReview && (s.status === 'COMPLETED' || s.isFinished)).length
        },
        provider: {
          totalReviews: providerReviewStats.totalReviews,
          averageRating: providerReviewStats.averageRating,
          sessionsWithReviews: mappedProviderSessions.filter(s => s.clientReview).length
        }
      },
      
      // METADATA DESPRE TIMEZONE
      timezoneInfo: {
        serverTimeUTC: nowUTC.toISOString(),
        adjustedTime: nowAdjusted.toISOString(),
        environment: process.env.NODE_ENV,
        dbTimezone:  'UTC (Development)',
        serverTimezone: 'UTC',
        offsetHours: ROMANIA_OFFSET / (60 * 60 * 1000),
        offsetApplied: isProduction,
        note: isProduction 
          ? 'Production: Datele din DB sunt UTC+3, comparațiile sunt ajustate cu +3 ore'
          : 'Development: Comparațiile se fac direct în UTC fără ajustare'
      },

      // INFORMAȚII DESPRE ACTUALIZĂRILE DE STATUS
      statusUpdates: {
        total: sessionsToUpdate.length,
        byStatus: sessionsToUpdate.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        details: process.env.NODE_ENV === 'development' ? sessionsToUpdate : undefined
      }
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

// Funcție pentru verificarea și actualizarea statusurilor sesiunilor
function checkAndUpdateSessionStatus(session: any): {
  needsUpdate: boolean;
  newStatus: string;
  newIsFinished: boolean;
  reason: string;
} {
  const nowUTC = new Date();
  
  // Aplicare offset doar în production
  const isProduction = process.env.NODE_ENV === 'production';
  const ROMANIA_OFFSET = isProduction ? 3 * 60 * 60 * 1000 : 0;
  const nowAdjusted = new Date(nowUTC.getTime() + ROMANIA_OFFSET);
  
  // Dacă sesiunea este deja finalizată manual, nu o mai modifică
  if (session.isFinished && ['COMPLETED', 'CANCELLED'].includes(session.status)) {
    return {
      needsUpdate: false,
      newStatus: session.status,
      newIsFinished: session.isFinished,
      reason: 'Sesiunea este deja finalizată manual'
    };
  }

  const startDate = session.startDate ? new Date(session.startDate) : null;
  const endDate = session.endDate ? new Date(session.endDate) : null;
  const scheduledAt = session.scheduledAt ? new Date(session.scheduledAt) : null;

  // CAZ 1: Sesiunea ar trebui să fie COMPLETATĂ (timpul a trecut)
  if (endDate && nowAdjusted > endDate) {
    return {
      needsUpdate: session.status !== 'COMPLETED' || !session.isFinished,
      newStatus: 'COMPLETED',
      newIsFinished: true,
      reason: 'Timpul sesiunii a expirat - marcată ca COMPLETATĂ'
    };
  }

  // CAZ 2: Sesiunea ar trebui să fie ÎN PROGRES (între start și end)
  if (startDate && endDate && nowAdjusted >= startDate && nowAdjusted <= endDate) {
    return {
      needsUpdate: session.status !== 'IN_PROGRESS',
      newStatus: 'IN_PROGRESS',
      newIsFinished: false,
      reason: 'Sesiunea este în intervalul de timp programat'
    };
  }

  // CAZ 3: Sesiunea a trecut cu mult timp și nu a fost completată (NO_SHOW)
  const bufferTime = 2 * 60 * 60 * 1000; // 2 ore buffer
  
  if (endDate && nowAdjusted > new Date(endDate.getTime() + bufferTime) && session.status === 'SCHEDULED') {
    return {
      needsUpdate: true,
      newStatus: 'NO_SHOW',
      newIsFinished: true,
      reason: 'Sesiunea a expirat cu buffer de 2 ore - marcată ca NO_SHOW'
    };
  }

  // CAZ 4: Sesiunea programată a trecut de timpul de start dar nu e în progres (NO_SHOW)
  if (startDate && nowAdjusted > new Date(startDate.getTime() + bufferTime) && session.status === 'SCHEDULED') {
    return {
      needsUpdate: true,
      newStatus: 'NO_SHOW',
      newIsFinished: true,
      reason: 'Sesiunea nu a început în timpul alocat - marcată ca NO_SHOW'
    };
  }

  // CAZ 5: Verificare prin scheduledAt dacă nu avem startDate/endDate
  if (!startDate && !endDate && scheduledAt && nowAdjusted > new Date(scheduledAt.getTime() + bufferTime) && session.status === 'SCHEDULED') {
    return {
      needsUpdate: true,
      newStatus: 'NO_SHOW',
      newIsFinished: true,
      reason: 'Sesiunea programată a expirat - marcată ca NO_SHOW'
    };
  }

  // Nicio schimbare necesară
  return {
    needsUpdate: false,
    newStatus: session.status,
    newIsFinished: session.isFinished,
    reason: 'Statusul sesiunii este corect'
  };
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