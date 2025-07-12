// /api/video/session/[sessionId]/check-provider/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

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

    console.log(`🔍 Verificare provider pentru sesiunea: ${sessionId}, user: ${userId}`);

    // Găsește sesiunea și verifică dacă user-ul curent este provider-ul
    const consultingSession = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        provider: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        client: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!consultingSession) {
      console.log(`❌ Sesiunea ${sessionId} nu a fost găsită`);
      return NextResponse.json({ error: "Sesiunea nu a fost găsită" }, { status: 404 });
    }

    // Verifică dacă user-ul curent este provider-ul acestei sesiuni
    const isProvider = consultingSession.provider.user.id === userId;
    
    // Verifică dacă user-ul curent este client-ul acestei sesiuni
    const isClient = consultingSession.clientId === userId;

    if (!isProvider && !isClient) {
      console.log(`❌ User ${userId} nu are acces la sesiunea ${sessionId}`);
      return NextResponse.json({ error: "Nu ai acces la această sesiune" }, { status: 403 });
    }

    console.log(`✅ User ${userId} este ${isProvider ? 'provider' : 'client'} pentru sesiunea ${sessionId}`);

    return NextResponse.json({ 
      isProvider,
      isClient,
      sessionId: consultingSession.id,
      providerId: consultingSession.providerId,
      clientId: consultingSession.clientId,
      status: consultingSession.status,
      roomUrl: consultingSession.dailyRoomUrl,
      roomName: consultingSession.dailyRoomName
    });

  } catch (error) {
    console.error("❌ Error checking provider status:", error);
    return NextResponse.json(
      { error: "Eroare internă la verificarea statusului de provider" },
      { status: 500 }
    );
  }
}