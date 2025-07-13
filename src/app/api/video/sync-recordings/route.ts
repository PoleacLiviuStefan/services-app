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
    const userId = session.user.id;

    // Verifică dacă utilizatorul este provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!provider) {
      return NextResponse.json(
        { error: "Doar providerii pot sincroniza înregistrările" },
        { status: 403 }
      );
    }

    console.log(`🔄 Începe sincronizarea înregistrărilor pentru provider ${provider.id}`);

    // Obține toate sesiunile completed ale provider-ului din ultimele 30 de zile
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sessions = await prisma.consultingSession.findMany({
      where: {
        providerId: provider.id,
        status: "COMPLETED",
        startDate: { gte: thirtyDaysAgo },
        dailyRoomName: { not: null },
      },
      select: {
        id: true,
        dailyRoomName: true,
        recordingUrl: true,
        hasRecording: true,
        recordingStatus: true,
        startDate: true,
        endDate: true,
      },
    });
    console.log(`📊 Găsite ${sessions.length} sesiuni pentru sincronizare`);

    // Obține toate înregistrările de la Daily.co (până la 100)
    const dailyRecordings = await fetchAllRecordingsFromDaily();
    console.log(`📊 Găsite ${dailyRecordings.length} înregistrări în Daily.co`);

    if (dailyRecordings.length === 0) {
      console.log("⚠️ Nu s-au găsit înregistrări în Daily.co");
      return NextResponse.json({
        success: true,
        message: "Nu s-au găsit înregistrări în Daily.co pentru sincronizare",
        total: sessions.length,
        updated: 0,
        dailyRecordings: 0,
        orphanRecordings: 0,
        strategiesUsed: {},
      });
    }

    let updatedCount = 0;
    let totalChecked = 0;
    const strategiesUsed: Record<string, number> = {
      daily_recording_id: 0,
      exact_room_name: 0,
      session_id_in_room_name: 0,
      fuzzy_room_name: 0,
      timestamp_single_match: 0,
      timestamp_closest_match: 0,
      not_found: 0,
    };

    for (const sess of sessions) {
      totalChecked++;
      console.log(`🔍 Verificare sesiunea ${sess.id} - camera: ${sess.dailyRoomName}`);
      let recording: any = null;
      let matchStrategy = "";

      // STRATEGIA 0: dailyRecordingId
      if ((sess as any).dailyRecordingId) {
        recording = dailyRecordings.find(r => r.id === (sess as any).dailyRecordingId);
        if (recording) {
          matchStrategy = "daily_recording_id";
          console.log(`✅ STRATEGIA 0 - Match prin Daily Recording ID: ${(sess as any).dailyRecordingId}`);
        }
      }

      // STRATEGIA 1: room_name exact
      if (!recording && sess.dailyRoomName) {
        recording = dailyRecordings.find(r => r.room_name === sess.dailyRoomName);
        if (recording) {
          matchStrategy = "exact_room_name";
          console.log(`✅ STRATEGIA 1 - Match exact prin numele camerei: ${sess.dailyRoomName}`);
        }
      }

      // STRATEGIA 2: session ID in room_name
      if (!recording) {
        recording = dailyRecordings.find(r =>
          r.room_name &&
          (r.room_name.includes(sess.id) ||
            r.room_name.includes(sess.id.split("-").pop()!))
        );
        if (recording) {
          matchStrategy = "session_id_in_room_name";
          console.log(`✅ STRATEGIA 2 - Match prin session ID în numele camerei: ${recording.room_name}`);
        }
      }

      // STRATEGIA 3: fuzzy room name
      if (!recording && sess.dailyRoomName) {
        recording = dailyRecordings.find(r =>
          r.room_name &&
          (r.room_name.toLowerCase().includes(sess.dailyRoomName.toLowerCase()) ||
           sess.dailyRoomName.toLowerCase().includes(r.room_name.toLowerCase()))
        );
        if (recording) {
          matchStrategy = "fuzzy_room_name";
          console.log(`✅ STRATEGIA 3 - Match fuzzy: ${sess.dailyRoomName} ↔ ${recording.room_name}`);
        }
      }

      // STRATEGIA 4: timestamp (using start_ts)
      if (!recording && sess.startDate) {
        const sessionTime = sess.startDate.getTime();
        const sameDay = dailyRecordings.filter(r => {
          if (typeof r.start_ts !== "number") return false;
          const recTime = r.start_ts * 1000;
          const dRec = new Date(recTime);
          const dSess = new Date(sessionTime);
          return (
            dRec.getFullYear() === dSess.getFullYear() &&
            dRec.getMonth() === dSess.getMonth() &&
            dRec.getDate() === dSess.getDate()
          );
        });
        if (sameDay.length === 1) {
          recording = sameDay[0];
          matchStrategy = "timestamp_single_match";
          console.log(`✅ STRATEGIA 4 - Single match zi: ${recording.room_name}`);
        } else if (sameDay.length > 1) {
          let closest = sameDay[0];
          let minDiff = Infinity;
          for (const cand of sameDay) {
            const diff = Math.abs(sessionTime - cand.start_ts * 1000);
            if (diff < minDiff) {
              minDiff = diff;
              closest = cand;
            }
          }
          if (minDiff < 2 * 60 * 60 * 1000) {
            recording = closest;
            matchStrategy = "timestamp_closest_match";
            console.log(`✅ STRATEGIA 4 - Closest match: ${closest.room_name}`);
          }
        }
      }

      if (recording) {
        console.log(`✅ Înregistrare găsită pentru ${sess.id} prin ${matchStrategy}:`, recording);

        // 1) Obține download_link dacă e finished
        if (recording.status === "finished") {
          const link = await fetchDownloadLink(recording.id);
          recording.download_link = link;
        }

        // 2) Actualizează DB dacă e nevoie
        const updateData: any = { updatedAt: new Date() };
        if (recording.status === "finished" && recording.download_link) {
          if (!sess.recordingUrl || sess.recordingUrl !== recording.download_link) {
            updateData.recordingUrl = recording.download_link;
            updateData.hasRecording = true;
            updateData.recordingStatus = "READY";
          }
        } else if (recording.status === "in-progress") {
          updateData.recordingStatus = "PROCESSING";
          updateData.hasRecording = true;
        } else if (recording.status === "failed") {
          updateData.recordingStatus = "FAILED";
          updateData.hasRecording = false;
        }

        if (Object.keys(updateData).length > 1) {
          await prisma.consultingSession.update({
            where: { id: sess.id },
            data: updateData,
          });
          updatedCount++;
          console.log(`📹 Sesiunea ${sess.id} actualizată`);
        } else {
          console.log(`ℹ️ Sesiunea ${sess.id} deja sincronizată`);
        }

        strategiesUsed[matchStrategy]++;

      } else {
        strategiesUsed.not_found++;
        console.log(`❌ Nu s-a găsit înregistrare pentru ${sess.id}`);
        await prisma.consultingSession.update({
          where: { id: sess.id },
          data: {
            recordingStatus: "NOT_FOUND",
            updatedAt: new Date(),
          },
        });
      }
    }

    // Găsește orphan recordings
    const orphanRecordings = dailyRecordings.filter(dr =>
      !sessions.some(s => s.dailyRoomName === dr.room_name)
    );
    console.log(`⚠️ Orphan recordings: ${orphanRecordings.length}`);

    return NextResponse.json({
      success: true,
      total: totalChecked,
      updated: updatedCount,
      dailyRecordings: dailyRecordings.length,
      orphanRecordings: orphanRecordings.length,
      strategiesUsed,
    });

  } catch (error) {
    console.error("❌ Error syncing recordings:", error);
    return NextResponse.json(
      { error: "Eroare internă", details: String(error) },
      { status: 500 }
    );
  }
}

// Helper: listare + acces link
async function fetchAllRecordingsFromDaily(): Promise<any[]> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) {
    console.warn("⚠️ DAILY_API_KEY not configured");
    return [];
  }

  // 1) Listează până la 100
  const resp = await fetch("https://api.daily.co/v1/recordings?limit=100", {
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    console.error("❌ Eroare la fetch recordings:", resp.statusText);
    return [];
  }
  const body = await resp.json();
  const recordings = Array.isArray(body.data) ? body.data : [];

  console.log(`📊 Preluate ${recordings.length} înregistrări`);

  return recordings;
}

// Helper: generează download_link
async function fetchDownloadLink(recordingId: string): Promise<string | null> {
  const dailyApiKey = process.env.DAILY_API_KEY!;
  try {
    const resp = await fetch(
      `https://api.daily.co/v1/recordings/${recordingId}/access-link`,
      {
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!resp.ok) {
      console.error(`❌ Eroare access-link (${recordingId}):`, resp.statusText);
      return null;
    }
    const json = await resp.json();
    return json.download_link || null;
  } catch (e) {
    console.error("❌ Exception access-link:", e);
    return null;
  }
}
