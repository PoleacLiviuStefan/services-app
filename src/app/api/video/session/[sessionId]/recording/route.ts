// /api/video/session/[sessionId]/recording/route.ts
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
    const { action, recordingUrl } = body; // 'start', 'stop', or 'update_url'

    console.log(`🎥 Recording action: ${action} pentru sesiunea ${sessionId} de către user ${userId}`);

    // Găsește sesiunea și verifică dacă user-ul curent este provider-ul
    const consultingSession = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        client: {
          select: { id: true, name: true, email: true }
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
      // Marchează că înregistrarea a început
      updateData = {
        ...updateData,
        status: 'IN_PROGRESS',
        joinedAt: consultingSession.joinedAt || new Date(),
        recordingStarted: true,  // ⭐ CRUCIAL
        recordingStartedAt: new Date(),  // ⭐ CRUCIAL
        recordingStatus: 'RECORDING',  // ⭐ CRUCIAL
        notes: consultingSession.notes ? 
          `${consultingSession.notes}\n[${new Date().toISOString()}] Înregistrare începută` : 
          `[${new Date().toISOString()}] Înregistrare începută`
      };

      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      console.log(`✅ Înregistrarea a început pentru sesiunea ${sessionId} - BD actualizată`);

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
        recordingDuration = Math.round(durationMs / (1000 * 60)); // în minute
      }

      // Marchează că înregistrarea s-a oprit și că sesiunea ARE înregistrare
      updateData = {
        ...updateData,
        recordingStarted: false,  // ⭐ CRUCIAL
        recordingStoppedAt: new Date(),  // ⭐ CRUCIAL
        hasRecording: true,  // ⭐ CRUCIAL - marchează că sesiunea are înregistrare
        recordingDuration: recordingDuration,  // ⭐ CRUCIAL
        recordingStatus: 'PROCESSING',  // ⭐ CRUCIAL
        notes: consultingSession.notes ? 
          `${consultingSession.notes}\n[${new Date().toISOString()}] Înregistrare oprită` : 
          `[${new Date().toISOString()}] Înregistrare oprită`
      };

      // Calculează durata actuală dacă este posibil
      if (consultingSession.joinedAt) {
        const durationMs = new Date().getTime() - new Date(consultingSession.joinedAt).getTime();
        updateData.actualDuration = Math.round(durationMs / (1000 * 60)); // în minute
      }

      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      console.log(`✅ Înregistrarea s-a oprit pentru sesiunea ${sessionId} - BD actualizată cu hasRecording: true`);

      return NextResponse.json({ 
        success: true, 
        message: "Înregistrarea s-a oprit - sesiunea va avea înregistrare disponibilă",
        recordingStarted: false,
        hasRecording: true,
        actualDuration: updateData.actualDuration,
        recordingDuration: recordingDuration
      });

    } else if (action === 'update_url' && recordingUrl) {
      // Actualizează URL-ul înregistrării când devine disponibil
      updateData = {
        ...updateData,
        recordingUrl: recordingUrl,
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

// GET - Get recording URL
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
        client: {
          select: { id: true, name: true, email: true }
        },
        speciality: {
          select: { id: true, name: true }
        }
      }
    });

    if (!consultingSession) {
      return NextResponse.json({ error: "Sesiunea nu a fost găsită" }, { status: 404 });
    }

    // Verifică dacă user-ul curent este participant în sesiune
    const isProvider = consultingSession.provider.user.id === userId;
    const isClient = consultingSession.clientId === userId;

    if (!isProvider && !isClient) {
      return NextResponse.json({ error: "Nu ai acces la această sesiune" }, { status: 403 });
    }

    // Dacă există deja URL de înregistrare, returnează-l
    if (consultingSession.recordingUrl) {
      console.log(`✅ URL înregistrare existent: ${consultingSession.recordingUrl}`);
      return NextResponse.json({ 
        recordingUrl: consultingSession.recordingUrl,
        recordingAvailable: true,
        source: 'database'
      });
    }

    // Încearcă să obții înregistrarea de la Daily.co
    console.log(`🔍 Căutare înregistrare în Daily.co pentru camera: ${consultingSession.dailyRoomName}`);
    const recordingUrl = await fetchRecordingFromDaily(consultingSession.dailyRoomName);
    
    if (recordingUrl) {
      // Actualizează sesiunea cu URL-ul găsit
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { 
          recordingUrl: recordingUrl,
          hasRecording: true,
          recordingStatus: 'READY',
          updatedAt: new Date()
        }
      });

      console.log(`✅ URL înregistrare găsit și salvat: ${recordingUrl}`);

      return NextResponse.json({ 
        recordingUrl: recordingUrl,
        recordingAvailable: true,
        source: 'daily.co'
      });
    } else {
      return NextResponse.json({ 
        error: "Înregistrarea nu este încă disponibilă sau nu a fost realizată",
        recordingAvailable: false,
        note: "Înregistrarea va fi disponibilă în câteva minute după încheierea sesiunii. Încearcă din nou în 2-3 minute."
      }, { status: 404 });
    }

  } catch (error) {
    console.error("❌ Error getting recording:", error);
    return NextResponse.json(
      { error: "Eroare internă la obținerea înregistrării" },
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
    console.log(`🔍 Căutare înregistrare Daily.co pentru camera: ${roomName}`);
    
    // Obține toate înregistrările
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
    
    console.log(`📊 Găsite ${recordings.length} înregistrări în Daily.co`);
    
    // Găsește înregistrarea pentru camera specificată
    const recording = recordings.find((r: any) => r.room_name === roomName);
    
    if (recording) {
      console.log(`✅ Înregistrare găsită pentru camera ${roomName}:`, {
        id: recording.id,
        status: recording.status,
        duration: recording.duration,
        download_link: recording.download_link ? 'Available' : 'Not ready'
      });

      // Verifică dacă înregistrarea este gata pentru download
      if (recording.download_link && recording.status === 'finished') {
        return recording.download_link;
      } else if (recording.status === 'in-progress') {
        console.log(`⏳ Înregistrarea pentru ${roomName} este încă în procesare`);
        return null;
      } else {
        console.log(`⏳ Înregistrarea pentru ${roomName} nu este încă gata (status: ${recording.status})`);
        return null;
      }
    }

    console.log(`📭 Nu s-a găsit înregistrare pentru camera ${roomName}`);
    
    // Debug: afișează toate camerele disponibile
    const roomNames = recordings.map((r: any) => r.room_name).slice(0, 5);
    console.log(`🔍 Primele 5 camere cu înregistrări: ${roomNames.join(', ')}`);
    
    return null;

  } catch (error) {
    console.error('❌ Error fetching recording from Daily.co:', error);
    return null;
  }
}