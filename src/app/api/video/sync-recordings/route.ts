// /api/video/sync-recordings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    console.log('🔄 Sincronizare înregistrări cu Daily.co...');

    // 1. Găsește toate sesiunile care ar putea avea înregistrări
    const sessions = await prisma.consultingSession.findMany({
      where: {
        OR: [
          // Sesiuni care au notes cu înregistrare dar hasRecording = false
          {
            notes: {
              contains: 'Înregistrare începută'
            },
            hasRecording: false
          },
          // Sesiuni completed fără recordingUrl dar cu dailyRoomName
          {
            status: 'COMPLETED',
            recordingUrl: null,
            dailyRoomName: {
              not: null
            }
          },
          // Sesiuni cu recordingStatus = PROCESSING (să verificăm dacă s-au terminat)
          {
            recordingStatus: 'PROCESSING'
          }
        ],
        // Doar sesiuni din ultimele 30 zile
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        dailyRoomName: true,
        recordingUrl: true,
        hasRecording: true,
        recordingStatus: true,
        notes: true,
        createdAt: true,
        startDate: true
      }
    });

    console.log(`📊 Găsite ${sessions.length} sesiuni pentru verificare`);

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nu există sesiuni de sincronizat',
        updated: 0
      });
    }

    // 2. Obține toate înregistrările de la Daily.co
    const dailyRecordings = await fetchAllDailyRecordings();
    
    if (!dailyRecordings) {
      return NextResponse.json({
        error: 'Nu s-au putut obține înregistrările de la Daily.co',
        note: 'Verifică DAILY_API_KEY'
      }, { status: 500 });
    }

    console.log(`📊 Găsite ${dailyRecordings.length} înregistrări în Daily.co`);

    let updatedCount = 0;
    const results = [];

    // 3. Pentru fiecare sesiune, verifică dacă există înregistrare
    for (const sess of sessions) {
      try {
        console.log(`🔍 Verificare sesiune ${sess.id} (${sess.dailyRoomName})`);

        // Găsește înregistrarea corespunzătoare în Daily.co
        const recording = dailyRecordings.find(r => r.room_name === sess.dailyRoomName);

        if (recording) {
          console.log(`✅ Înregistrare găsită pentru ${sess.id}:`, {
            status: recording.status,
            duration: recording.duration,
            download_link: recording.download_link ? 'Available' : 'Not ready'
          });

          const updateData: any = {
            updatedAt: new Date()
          };

          // Dacă sesiunea are înregistrare în notes dar hasRecording = false
          if (sess.notes?.includes('Înregistrare începută') && !sess.hasRecording) {
            updateData.hasRecording = true;
            updateData.recordingStarted = false;
            console.log(`📝 Marcând sesiunea ${sess.id} ca având înregistrare (din notes)`);
          }

          // Dacă înregistrarea este gata și are download_link
          if (recording.download_link && recording.status === 'finished') {
            updateData.recordingUrl = recording.download_link;
            updateData.hasRecording = true;
            updateData.recordingStatus = 'READY';
            updateData.recordingDuration = recording.duration ? Math.round(recording.duration / 60) : null;
            console.log(`🔗 Salvând URL înregistrare pentru ${sess.id}: ${recording.download_link}`);
          } else if (recording.status === 'in-progress') {
            updateData.recordingStatus = 'PROCESSING';
            updateData.hasRecording = true;
            console.log(`⏳ Înregistrarea pentru ${sess.id} este încă în procesare`);
          } else {
            updateData.recordingStatus = 'PROCESSING';
            updateData.hasRecording = true;
            console.log(`⏳ Înregistrarea pentru ${sess.id} nu este încă gata (status: ${recording.status})`);
          }

          // Actualizează sesiunea
          await prisma.consultingSession.update({
            where: { id: sess.id },
            data: updateData
          });

          updatedCount++;
          results.push({
            sessionId: sess.id,
            roomName: sess.dailyRoomName,
            action: 'updated',
            recordingStatus: recording.status,
            hasDownloadLink: !!recording.download_link
          });

        } else {
          console.log(`📭 Nu s-a găsit înregistrare pentru ${sess.id} (${sess.dailyRoomName})`);
          
          // Dacă sesiunea are înregistrare în notes, marchează-o ca având înregistrare oricum
          if (sess.notes?.includes('Înregistrare începută') && sess.notes?.includes('Înregistrare oprită')) {
            await prisma.consultingSession.update({
              where: { id: sess.id },
              data: {
                hasRecording: true,
                recordingStatus: 'READY', // Presupunem că e gata
                recordingStarted: false,
                updatedAt: new Date()
              }
            });

            updatedCount++;
            results.push({
              sessionId: sess.id,
              roomName: sess.dailyRoomName,
              action: 'marked_from_notes',
              note: 'Marcată ca având înregistrare din notes'
            });

            console.log(`📝 Sesiunea ${sess.id} marcată ca având înregistrare din notes`);
          } else {
            results.push({
              sessionId: sess.id,
              roomName: sess.dailyRoomName,
              action: 'no_recording_found'
            });
          }
        }

      } catch (error) {
        console.error(`❌ Eroare la procesarea sesiunii ${sess.id}:`, error);
        results.push({
          sessionId: sess.id,
          action: 'error',
          error: (error as Error).message
        });
      }
    }

    console.log(`✅ Sincronizare completă: ${updatedCount} sesiuni actualizate`);

    return NextResponse.json({
      success: true,
      message: `Sincronizare completă: ${updatedCount} sesiuni actualizate din ${sessions.length} verificate`,
      updated: updatedCount,
      total: sessions.length,
      results: results
    });

  } catch (error) {
    console.error("❌ Error syncing recordings:", error);
    return NextResponse.json(
      { error: "Eroare internă la sincronizarea înregistrărilor" },
      { status: 500 }
    );
  }
}

// Funcție helper pentru obținerea tuturor înregistrărilor de la Daily.co
async function fetchAllDailyRecordings(): Promise<any[] | null> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.daily.co/v1/recordings', {
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
    return data.data || [];

  } catch (error) {
    console.error('❌ Error fetching recordings from Daily.co:', error);
    return null;
  }
}