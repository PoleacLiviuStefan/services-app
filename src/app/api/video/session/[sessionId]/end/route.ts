// /api/video/session/[sessionId]/end/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

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
    const { endedBy, actualDuration, forceEnd, participantCount } = body;

    console.log(`🏁 Închidere sesiune ${sessionId} de către user ${userId}:`, { forceEnd, actualDuration });

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
        },
        userPackage: {
          select: { 
            id: true, 
            totalSessions: true, 
            usedSessions: true,
            expiresAt: true
          }
        },
        speciality: {
          select: { id: true, name: true, price: true }
        }
      }
    });

    if (!consultingSession) {
      return NextResponse.json({ error: "Sesiunea nu a fost găsită" }, { status: 404 });
    }

    const isProvider = consultingSession.provider.user.id === userId;
    if (!isProvider) {
      return NextResponse.json({ error: "Doar provider-ul poate închide sesiunea" }, { status: 403 });
    }

    // Verifică dacă sesiunea este deja închisă
    if (consultingSession.status === 'COMPLETED' || consultingSession.isFinished) {
      return NextResponse.json({ error: "Sesiunea este deja închisă" }, { status: 400 });
    }

    const now = new Date();

    // Calculează durata reală dacă nu este furnizată
    let calculatedDuration = actualDuration;
    if (!calculatedDuration && consultingSession.joinedAt) {
      const durationMs = now.getTime() - new Date(consultingSession.joinedAt).getTime();
      calculatedDuration = Math.round(durationMs / (1000 * 60)); // în minute
    }

    // Pregătește datele pentru actualizare
    const updateData: any = {
      status: 'COMPLETED',
      isFinished: true,
      endDate: now,
      leftAt: now,
      actualDuration: calculatedDuration,
      participantCount: participantCount || consultingSession.participantCount || 2,
      updatedAt: now
    };

    // Adaugă notă despre închiderea sesiunii
    const endNote = `[${now.toISOString()}] Sesiune închisă de provider${forceEnd ? ' (forțat)' : ''}`;
    updateData.notes = consultingSession.notes ? 
      `${consultingSession.notes}\n${endNote}` : 
      endNote;

    console.log(`📊 Date pentru închiderea sesiunii:`, updateData);

    // Actualizează sesiunea în tranzacție pentru a asigura consistența
    const result = await prisma.$transaction(async (tx) => {
      // Actualizează sesiunea
      const updatedSession = await tx.consultingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      // Actualizează pachetul utilizatorului dacă există
      if (consultingSession.userPackage && consultingSession.packageId) {
        await tx.userProviderPackage.update({
          where: { id: consultingSession.packageId },
          data: {
            usedSessions: {
              increment: 1
            },
            updatedAt: now
          }
        });

        console.log(`📦 Pachet actualizat: sesiuni folosite incrementate pentru pachetul ${consultingSession.packageId}`);
      }

      return updatedSession;
    });

    // Opțional: Șterge camera Daily.co dacă nu mai este necesară
    if (consultingSession.dailyRoomName) {
      await deleteDailyRoom(consultingSession.dailyRoomName);
    }

    console.log(`✅ Sesiunea ${sessionId} a fost închisă cu succes`);

    // Opțional: Trimite notificări către client despre închiderea sesiunii
    // await sendSessionEndNotification(consultingSession.client, consultingSession);

    return NextResponse.json({ 
      success: true,
      message: "Sesiunea a fost închisă cu succes",
      session: {
        id: result.id,
        status: result.status,
        isFinished: result.isFinished,
        endDate: result.endDate?.toISOString(),
        actualDuration: result.actualDuration,
        participantCount: result.participantCount,
        leftAt: result.leftAt?.toISOString(),
        hasRecording: !!consultingSession.recordingUrl,
        recordingUrl: consultingSession.recordingUrl
      },
      packageUpdated: !!consultingSession.userPackage
    });

  } catch (error) {
    console.error("❌ Error ending session:", error);
    return NextResponse.json(
      { error: "Eroare internă la închiderea sesiunii" },
      { status: 500 }
    );
  }
}

// PUT - Update session status (pentru actualizări parțiale)
export async function PUT(
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

    console.log(`📝 Actualizare status sesiune ${sessionId}:`, body);

    // Găsește sesiunea și verifică permisiunile
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

    // Verifică dacă user-ul curent are permisiuni (provider sau client)
    const isProvider = consultingSession.provider.user.id === userId;
    const isClient = consultingSession.clientId === userId;

    if (!isProvider && !isClient) {
      return NextResponse.json({ error: "Nu ai permisiuni pentru această sesiune" }, { status: 403 });
    }

    // Doar provider-ul poate face anumite actualizări
    const providerOnlyFields = ['status', 'isFinished', 'endDate'];
    const hasProviderOnlyFields = providerOnlyFields.some(field => body[field] !== undefined);
    
    if (hasProviderOnlyFields && !isProvider) {
      return NextResponse.json({ error: "Doar provider-ul poate face această actualizare" }, { status: 403 });
    }

    // Pregătește datele pentru actualizare
    const allowedFields = [
      'status', 'joinedAt', 'leftAt', 'actualDuration', 'participantCount',
      'rating', 'feedback', 'notes', 'isFinished'
    ];

    const updateData: any = {
      updatedAt: new Date()
    };

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'joinedAt' || field === 'leftAt') {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    });

    console.log(`📊 Date pentru actualizare:`, updateData);

    // Actualizează sesiunea
    const updatedSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: updateData
    });

    console.log(`✅ Sesiunea ${sessionId} a fost actualizată cu succes`);

    return NextResponse.json({
      success: true,
      message: "Sesiunea a fost actualizată cu succes",
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        isFinished: updatedSession.isFinished,
        joinedAt: updatedSession.joinedAt?.toISOString(),
        leftAt: updatedSession.leftAt?.toISOString(),
        actualDuration: updatedSession.actualDuration,
        participantCount: updatedSession.participantCount,
        rating: updatedSession.rating,
        feedback: updatedSession.feedback,
        notes: updatedSession.notes,
        updatedAt: updatedSession.updatedAt?.toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error updating session:", error);
    return NextResponse.json(
      { error: "Eroare internă la actualizarea sesiunii" },
      { status: 500 }
    );
  }
}

// Funcție pentru ștergerea unei camere Daily.co
async function deleteDailyRoom(roomName: string): Promise<void> {
  const dailyApiKey = process.env.DAILY_API_KEY;
  
  if (!dailyApiKey) {
    console.warn('⚠️ DAILY_API_KEY not configured, skipping room deletion');
    return;
  }

  try {
    console.log(`🗑️ Ștergere cameră Daily.co: ${roomName}`);
    
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to delete Daily room ${roomName}: ${response.statusText}`);
    } else {
      console.log(`✅ Daily room ${roomName} deleted successfully`);
    }
  } catch (error) {
    console.error('❌ Error deleting Daily room:', error);
  }
}

// Funcție pentru trimiterea notificărilor (placeholder)
async function sendSessionEndNotification(client: any, session: any): Promise<void> {
  try {
    // Aici poți implementa logica pentru trimiterea notificărilor
    // De exemplu: email, push notifications, etc.
    console.log(`📧 Notificare trimisă către ${client.email} pentru închiderea sesiunii ${session.id}`);
    
    // Exemplu de implementare cu email (necesită configurarea unui service de email):
    /*
    await sendEmail({
      to: client.email,
      subject: 'Sesiunea ta s-a încheiat',
      template: 'session-ended',
      data: {
        clientName: client.name,
        sessionId: session.id,
        speciality: session.speciality?.name,
        duration: session.actualDuration,
        recordingUrl: session.recordingUrl
      }
    });
    */
  } catch (error) {
    console.error('❌ Error sending session end notification:', error);
  }
}