// /api/video/session/[sessionId]/recording/route.ts - ACTUALIZAT pentru associere prin session ID

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

// POST - Start/Stop recording or update recording status
export async function POST(
  req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const { sessionId } = await params;
    const userId = session.user.id;
    const body = await req.json();
    const { action, recordingUrl, dailyRecordingId } = body; // adăugat dailyRecordingId

    console.log(`🎥 Recording action: ${action} pentru sesiunea ${sessionId} de către user ${userId}`);

    // Găsește sesiunea și verifică dacă user-ul curent este provider-ul
    const consultingSession = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        provider: {
          include: {
            user: true
          }
        }
      }
    });

    if (!consultingSession) {
      return NextResponse.json({ error: "Sesiunea nu a fost găsită" }, { status: 404 });
    }

    const isProvider = consultingSession.provider.user.id === userId;
    if (!isProvider) {
      return NextResponse.json({ error: "Doar provider-ul poate controla înregistrarea" }, { status: 403 });
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    if (action === 'start') {
      // Marchează că înregistrarea a început și salvează daily recording ID dacă este furnizat
      updateData = {
        ...updateData,
        status: 'IN_PROGRESS',
        joinedAt: consultingSession.joinedAt || new Date(),
        recordingStarted: true,
        recordingStartedAt: new Date(),
        recordingStatus: 'RECORDING',
        dailyRecordingId: dailyRecordingId || null, // ⭐ SALVEAZĂ DAILY RECORDING ID
        notes: consultingSession.notes ? 
          `${consultingSession.notes}\n[${new Date().toISOString()}] Înregistrare începută` : 
          `[${new Date().toISOString()}] Înregistrare începută`
      };

      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      console.log(`✅ Înregistrarea a început pentru sesiunea ${sessionId} - BD actualizată`);
      if (dailyRecordingId) {
        console.log(`📋 Daily recording ID salvat: ${dailyRecordingId}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Înregistrarea a început",
        recordingStarted: true,
        status: 'IN_PROGRESS'
      });

    } else if (action === 'stop') {
      // Calculează durata înregistrării
      let recordingDuration = null;
      if (consultingSession.recordingStartedAt) {
        const durationMs = new Date().getTime() - new Date(consultingSession.recordingStartedAt).getTime();
        recordingDuration = Math.round(durationMs / (1000 * 60));
      }

      // Calculează durata actuală a sesiunii
      let actualDuration = null;
      if (consultingSession.joinedAt) {
        const sessionDurationMs = new Date().getTime() - new Date(consultingSession.joinedAt).getTime();
        actualDuration = Math.round(sessionDurationMs / (1000 * 60));
      } else if (consultingSession.startDate) {
        const sessionDurationMs = new Date().getTime() - new Date(consultingSession.startDate).getTime();
        actualDuration = Math.round(sessionDurationMs / (1000 * 60));
      }

      console.log(`📊 Calculare durate: recordingDuration=${recordingDuration}min, actualDuration=${actualDuration}min`);

      updateData = {
        ...updateData,
        recordingStarted: false,
        recordingStoppedAt: new Date(),
        hasRecording: true, // ⭐ CRUCIAL
        recordingDuration: recordingDuration,
        actualDuration: actualDuration,
        recordingStatus: 'PROCESSING',
        dailyRecordingId: dailyRecordingId || consultingSession.dailyRecordingId, // ⭐ ACTUALIZEAZĂ DAILY RECORDING ID
        notes: consultingSession.notes ? 
          `${consultingSession.notes}\n[${new Date().toISOString()}] Înregistrare oprită - durată: ${recordingDuration || 'N/A'}min` : 
          `[${new Date().toISOString()}] Înregistrare oprită - durată: ${recordingDuration || 'N/A'}min`
      };

      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      console.log(`✅ Înregistrarea s-a oprit pentru sesiunea ${sessionId}`, {
        hasRecording: true,
        recordingDuration,
        actualDuration,
        dailyRecordingId: dailyRecordingId || consultingSession.dailyRecordingId
      });

      return NextResponse.json({ 
        success: true, 
        message: "Înregistrarea s-a oprit - sesiunea va avea înregistrare disponibilă",
        recordingStarted: false,
        hasRecording: true,
        actualDuration: actualDuration,
        recordingDuration: recordingDuration,
        recordingStatus: 'PROCESSING'
      });

    } else if (action === 'update_url' && recordingUrl) {
      updateData = {
        ...updateData,
        recordingUrl: recordingUrl,
        recordingStatus: 'READY',
        notes: consultingSession.notes ? 
          `${consultingSession.notes}\n[${new Date().toISOString()}] URL înregistrare disponibil` : 
          `[${new Date().toISOString()}] URL înregistrare disponibil`
      };

      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      console.log(`✅ URL înregistrare actualizat pentru sesiunea ${sessionId}: ${recordingUrl}`);

      return NextResponse.json({ 
        success: true, 
        message: "URL-ul înregistrării a fost actualizat",
        recordingUrl: recordingUrl
      });

    } else {
      return NextResponse.json({ error: "Acțiune invalidă sau date incomplete" }, { status: 400 });
    }

  } catch (error) {
    console.error("❌ Error handling recording:", error);
    return NextResponse.json(
      { error: "Eroare internă la gestionarea înregistrării" },
      { status: 500 }
    );
  }
}

// GET - Get recording URL - ACTUALIZAT pentru căutare prin session ID și daily recording ID
export async function GET(
  _req: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const { sessionId } = await params;
    const userId = session.user.id;

    console.log(`📺 Solicitare URL înregistrare pentru sesiunea ${sessionId} de către user ${userId}`);

    // Găsește sesiunea
    const consultingSession = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        speciality: {
          select: { id: true, name: true }
        }
      }
    });

    if (!consultingSession) {
      return NextResponse.json({ error: "Sesiunea nu a fost găsită" }, { status: 404 });
    }

    console.log(`🔍 Sesiune găsită: ${consultingSession.id}`, {
      providerId: consultingSession.provider.user.id,
      clientId: consultingSession.clientId,
      dailyRoomName: consultingSession.dailyRoomName,
      dailyRecordingId: consultingSession.dailyRecordingId,
      hasRecording: consultingSession.hasRecording,
      recordingUrl: !!consultingSession.recordingUrl
    });

    // Verifică accesul - ÎMBUNĂTĂȚIT
    const isProvider = consultingSession.provider.user.id === userId;
    let isClient = false;
    
    if (!isProvider) {
      // Multiple strategii pentru verificarea clientului
      if (consultingSession.clientId === userId) {
        isClient = true;
      } else {
        try {
          const clientRecord = await prisma.client.findUnique({
            where: { userId },
            select: { id: true }
          });
          if (clientRecord && consultingSession.clientId === clientRecord.id) {
            isClient = true;
          }
        } catch (error) {
          console.log(`ℹ️ Nu s-a putut verifica prin tabela Client:`, error.message);
        }
      }
    }

    console.log(`👤 Access check: isProvider=${isProvider}, isClient=${isClient}`);

    if (!isProvider && !isClient) {
      return NextResponse.json({ error: "Nu ai acces la această sesiune" }, { status: 403 });
    }

    // CĂUTARE PRIN MULTIPLE STRATEGII - în ordine de prioritate
    console.log(`🔍 CĂUTARE ÎNREGISTRARE prin multiple strategii...`);
    
    let recordingData = null;

    // Strategia 1: Dacă avem daily recording ID salvat în BD
    if (consultingSession.dailyRecordingId) {
      console.log(`🎯 Strategia 1: Căutare prin daily recording ID: ${consultingSession.dailyRecordingId}`);
      recordingData = await fetchRecordingByDailyId(consultingSession.dailyRecordingId);
      if (recordingData) {
        console.log(`✅ GĂSIT prin daily recording ID!`);
      }
    }

    // Strategia 2: Căutare prin session ID în numele camerei
    if (!recordingData) {
      console.log(`🎯 Strategia 2: Căutare prin session ID în numele camerei: ${sessionId}`);
      recordingData = await fetchRecordingBySessionId(sessionId);
      if (recordingData) {
        console.log(`✅ GĂSIT prin session ID în numele camerei!`);
      }
    }

    // Strategia 3: Căutare prin numele camerei (metoda originală)
    if (!recordingData && consultingSession.dailyRoomName) {
      console.log(`🎯 Strategia 3: Căutare prin numele camerei: ${consultingSession.dailyRoomName}`);
      recordingData = await fetchRecordingByRoomName(consultingSession.dailyRoomName);
      if (recordingData) {
        console.log(`✅ GĂSIT prin numele camerei!`);
      }
    }

    // Strategia 4: Căutare prin timestamp (sesiuni din aceeași zi)
    if (!recordingData && consultingSession.startDate) {
      console.log(`🎯 Strategia 4: Căutare prin timestamp aproximativ`);
      recordingData = await fetchRecordingByTimestamp(consultingSession.startDate, sessionId);
      if (recordingData) {
        console.log(`✅ GĂSIT prin căutare timestamp!`);
      }
    }

    if (recordingData && recordingData.url) {
      console.log(`✅ ÎNREGISTRARE GĂSITĂ! Actualizez BD...`);
      
      // Actualizează sesiunea cu toate informațiile găsite
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { 
          recordingUrl: recordingData.url,
          hasRecording: true,
          recordingStatus: recordingData.status,
          recordingDuration: recordingData.duration,
          dailyRecordingId: recordingData.dailyId, // Salvează daily recording ID pentru viitor
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ 
        recordingUrl: recordingData.url,
        recordingAvailable: true,
        source: recordingData.source,
        status: recordingData.status,
        duration: recordingData.duration,
        dailyRecordingId: recordingData.dailyId
      });
    }

    // Dacă există deja URL în BD, returnează-l
    if (consultingSession.recordingUrl) {
      console.log(`✅ URL înregistrare existent în BD: ${consultingSession.recordingUrl}`);
      return NextResponse.json({ 
        recordingUrl: consultingSession.recordingUrl,
        recordingAvailable: true,
        source: 'database'
      });
    }

    // Nu s-a găsit nimic
    console.log(`❌ NU S-A GĂSIT înregistrare pentru sesiunea ${sessionId}`);
    
    return NextResponse.json({ 
      error: "Înregistrarea nu este încă disponibilă",
      recordingAvailable: false,
      note: "Înregistrarea va fi disponibilă în câteva minute după încheierea sesiunii. Încearcă din nou în 2-3 minute.",
      debug: {
        sessionId: sessionId,
        roomName: consultingSession.dailyRoomName,
        dailyRecordingId: consultingSession.dailyRecordingId,
        hasRecordingInDb: !!consultingSession.recordingUrl,
        recordingStatus: consultingSession.recordingStatus
      }
    }, { status: 404 });

  } catch (error) {
    console.error("❌ Error getting recording:", error);
    return NextResponse.json(
      { 
        error: "Eroare internă la obținerea înregistrării",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// FUNCȚII HELPER PENTRU CĂUTARE PRIN MULTIPLE STRATEGII

// Strategia 1: Căutare directă prin Daily recording ID
async function fetchRecordingByDailyId(dailyRecordingId: string): Promise<any> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) return null;

  try {
    console.log(`🔍 Căutare prin Daily recording ID: ${dailyRecordingId}`);
    
    const response = await fetch(`https://api.daily.co/v1/recordings/${dailyRecordingId}`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`⚠️ Nu s-a găsit recording cu ID: ${dailyRecordingId}`);
      return null;
    }

    const recording = await response.json();
    
    return {
      url: recording.download_link || null,
      status: recording.status === 'finished' ? 'READY' : 'PROCESSING',
      duration: recording.duration ? Math.round(recording.duration / 60) : null,
      dailyId: recording.id,
      source: 'daily_recording_id'
    };

  } catch (error) {
    console.error('❌ Error fetching by daily recording ID:', error);
    return null;
  }
}

// Strategia 2: Căutare prin session ID în numele camerei
async function fetchRecordingBySessionId(sessionId: string): Promise<any> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) return null;

  try {
    console.log(`🔍 Căutare prin session ID în nume: ${sessionId}`);
    
    const response = await fetch(`https://api.daily.co/v1/recordings?limit=100`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const recordings = data.data || [];
    
    // Caută înregistrări care conțin session ID-ul în numele camerei
    const recording = recordings.find((r: any) => 
      r.room_name && (
        r.room_name.includes(sessionId) ||
        r.room_name.includes(sessionId.split('-').pop()) // Ultimele caractere din UUID
      )
    );
    
    if (recording) {
      console.log(`✅ Găsit prin session ID: ${recording.room_name}`);
      return {
        url: recording.download_link || null,
        status: recording.status === 'finished' ? 'READY' : 'PROCESSING',
        duration: recording.duration ? Math.round(recording.duration / 60) : null,
        dailyId: recording.id,
        source: 'session_id_match'
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching by session ID:', error);
    return null;
  }
}

// Strategia 3: Căutare prin numele camerei (metoda originală)
async function fetchRecordingByRoomName(roomName: string): Promise<any> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey || !roomName) return null;

  try {
    console.log(`🔍 Căutare prin numele camerei: ${roomName}`);
    
    const response = await fetch(`https://api.daily.co/v1/recordings?limit=100`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const recordings = data.data || [];
    
    // Căutare exactă și fuzzy
    let recording = recordings.find((r: any) => r.room_name === roomName);
    
    if (!recording) {
      recording = recordings.find((r: any) => 
        r.room_name && roomName && 
        (r.room_name.toLowerCase().includes(roomName.toLowerCase()) || 
         roomName.toLowerCase().includes(r.room_name.toLowerCase()))
      );
    }
    
    if (recording) {
      return {
        url: recording.download_link || null,
        status: recording.status === 'finished' ? 'READY' : 'PROCESSING',
        duration: recording.duration ? Math.round(recording.duration / 60) : null,
        dailyId: recording.id,
        source: 'room_name_match'
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching by room name:', error);
    return null;
  }
}

// Strategia 4: Căutare prin timestamp (pentru sesiuni din aceeași perioadă)
async function fetchRecordingByTimestamp(sessionStartDate: Date, sessionId: string): Promise<any> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (!dailyApiKey) return null;

  try {
    console.log(`🔍 Căutare prin timestamp pentru sesiunea din: ${sessionStartDate.toISOString()}`);
    
    const response = await fetch(`https://api.daily.co/v1/recordings?limit=100`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const recordings = data.data || [];
    
    // Găsește înregistrări din aceeași zi
    const sessionDate = sessionStartDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const candidateRecordings = recordings.filter((r: any) => {
      if (!r.started_at) return false;
      const recordingDate = new Date(r.started_at).toISOString().split('T')[0];
      return recordingDate === sessionDate;
    });
    
    console.log(`📅 Găsite ${candidateRecordings.length} înregistrări din ${sessionDate}`);
    
    if (candidateRecordings.length === 1) {
      // Dacă e doar o înregistrare din ziua aia, probabil e cea căutată
      const recording = candidateRecordings[0];
      console.log(`🎯 Găsită o singură înregistrare din ziua ${sessionDate}, probabil e cea căutată`);
      
      return {
        url: recording.download_link || null,
        status: recording.status === 'finished' ? 'READY' : 'PROCESSING',
        duration: recording.duration ? Math.round(recording.duration / 60) : null,
        dailyId: recording.id,
        source: 'timestamp_match'
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching by timestamp:', error);
    return null;
  }
}