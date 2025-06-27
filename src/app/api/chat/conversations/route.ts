// app/api/chat/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - Obține toate conversațiile utilizatorului curent
export async function GET(req: NextRequest) {
  try {
    // Verifică autentificarea cu NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const currentUserName = session.user.name;
    console.log('Current user:', currentUserName);
    // Găsește toate mesajele în care utilizatorul curent participă
    const userMessages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUsername: currentUserName },
          { toUsername: currentUserName }
        ],
        messageType: 'PRIVATE'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        fromUsername: true,
        toUsername: true,
        createdAt: true
      }
    });

    // Grupează mesajele pe participanți (conversații)
    const conversationsMap = new Map<string, {
      participantName: string;
      messages: typeof userMessages;
      lastMessage: typeof userMessages[0];
      messageCount: number;
    }>();

    userMessages.forEach(message => {
      // Determină cine este participantul (nu utilizatorul curent)
      const participantName = message.fromUsername === currentUserName 
        ? message.toUsername 
        : message.fromUsername;

      if (!participantName) return;

      const existingConversation = conversationsMap.get(participantName);
      
      if (!existingConversation) {
        // Prima dată când vedem această conversație
        conversationsMap.set(participantName, {
          participantName,
          messages: [message],
          lastMessage: message,
          messageCount: 1
        });
      } else {
        // Adaugă mesajul la conversația existentă
        existingConversation.messages.push(message);
        existingConversation.messageCount++;
        
        // Actualizează ultimul mesaj dacă este mai recent
        if (new Date(message.createdAt) > new Date(existingConversation.lastMessage.createdAt)) {
          existingConversation.lastMessage = message;
        }
      }
    });

    // Încearcă să obții informații despre participanți din baza de date
    const participantNames = Array.from(conversationsMap.keys());
    
    // Găsește utilizatorii din baza de date pentru a obține avataruri și email-uri
    const participants = await prisma.user.findMany({
      where: {
        name: {
          in: participantNames
        }
      },
      select: {
        name: true,
        email: true,
        image: true
      }
    });

    // Creează un map pentru căutare rapidă
    const participantInfoMap = new Map(
      participants.map(p => [p.name, p])
    );

    // Convertește Map-ul la array și adaugă informațiile despre participanți
    const conversations = Array.from(conversationsMap.values()).map(conv => {
      const participantInfo = participantInfoMap.get(conv.participantName);
      
      return {
        participantName: conv.participantName,
        participantEmail: participantInfo?.email,
        participantImage: participantInfo?.image,
        lastMessage: conv.lastMessage,
        messageCount: conv.messageCount,
        // Pentru viitor: calcularea mesajelor necitite
        unreadCount: 0
      };
    });

    // Sortează conversațiile după ultimul mesaj (cele mai recente primul)
    conversations.sort((a, b) => {
      if (!a.lastMessage || !b.lastMessage) return 0;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      conversations: conversations
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}