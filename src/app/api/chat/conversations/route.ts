// app/api/chat/conversations/route.ts - ACTUALIZAT pentru slug-uri
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
    
    const currentUser = await prisma.user.findUnique({
      where: { name: currentUserName },
      select: { 
        id: true,
        name: true, 
        slug: true,
        image: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      );
    }

    const currentUserSlug = session.user.slug;
    console.log('Current user slug:', currentUserSlug);

    // 🆕 2. Găsește toate mesajele folosind ATÂT slug-uri CÂT și nume (backwards compatibility)
    const userMessages = await prisma.message.findMany({
      where: {
        OR: [
          // 🆕 Căutare după slug-uri (noua metodă)
          ...(currentUserSlug ? [
            { fromUserSlug: currentUserSlug },
            { toUserSlug: currentUserSlug }
          ] : []),
          
        ],
        messageType: 'PRIVATE'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        // 🆕 Includem atât slug-urile cât și numele
        fromUserSlug: true,
        toUserSlug: true,
        fromUsername: true,
        toUsername: true,
        createdAt: true
      }
    });

    console.log(`📊 Găsite ${userMessages.length} mesaje pentru utilizatorul curent`);

    // 🆕 3. Grupează mesajele pe participanți folosind logică hibridă (slug + nume)
    const conversationsMap = new Map<string, {
      participantSlug: string | null;
      participantName: string | null;
      messages: typeof userMessages;
      lastMessage: typeof userMessages[0];
      messageCount: number;
    }>();

    userMessages.forEach(message => {
      let participantSlug: string | null = null;
      let participantName: string | null = null;

      // 🆕 Determină participantul folosind slug-uri (preferabil) sau nume (fallback)
      if (message.fromUserSlug === currentUserSlug || message.fromUsername === currentUserName) {
        // Mesajul e trimis de utilizatorul curent → participantul e destinatarul
        participantSlug = message.toUserSlug;
        participantName = message.toUsername;
      } else {
        // Mesajul e primit de utilizatorul curent → participantul e expeditorul
        participantSlug = message.fromUserSlug;
        participantName = message.fromUsername;
      }

      // Folosim slug-ul ca cheie principală, dar fallback la nume dacă nu există slug
      const conversationKey = participantSlug || participantName;
      
      if (!conversationKey) return; // Skip mesajele fără identificator valid

      const existingConversation = conversationsMap.get(conversationKey);
      
      if (!existingConversation) {
        // Prima dată când vedem această conversație
        conversationsMap.set(conversationKey, {
          participantSlug,
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

        // 🆕 Actualizează informațiile despre participant dacă mesajul nou are slug și cel vechi nu
        if (!existingConversation.participantSlug && participantSlug) {
          existingConversation.participantSlug = participantSlug;
        }
        if (!existingConversation.participantName && participantName) {
          existingConversation.participantName = participantName;
        }
      }
    });

    // 🆕 4. Obține informații despre participanți din baza de date
    const participantSlugs = Array.from(conversationsMap.values())
      .map(conv => conv.participantSlug)
      .filter(Boolean) as string[];
    
    const participantNames = Array.from(conversationsMap.values())
      .map(conv => conv.participantName)
      .filter(Boolean) as string[];

    // Găsește utilizatorii după slug (preferabil) și nume (fallback)
    const participants = await prisma.user.findMany({
      where: {
        OR: [
          ...(participantSlugs.length > 0 ? [{ slug: { in: participantSlugs } }] : []),
          ...(participantNames.length > 0 ? [{ name: { in: participantNames } }] : [])
        ]
      },
      select: {
        name: true,
        slug: true,
        email: true,
        image: true
      }
    });

    console.log(`👥 Găsiți ${participants.length} participanți în conversații`);

    // 🆕 5. Creează map-uri pentru căutare rapidă
    const participantBySlugMap = new Map(
      participants.filter(p => p.slug).map(p => [p.slug!, p])
    );
    const participantByNameMap = new Map(
      participants.filter(p => p.name).map(p => [p.name!, p])
    );

    // 🆕 6. Convertește conversațiile la format final
    const conversations = Array.from(conversationsMap.values()).map(conv => {
      // Încearcă să găsești participantul după slug, apoi după nume
      let participantInfo = null;
      if (conv.participantSlug) {
        participantInfo = participantBySlugMap.get(conv.participantSlug);
      }
      if (!participantInfo && conv.participantName) {
        participantInfo = participantByNameMap.get(conv.participantName);
      }
      
      return {
        // 🆕 Informații despre participant (cu slug în plus)
        participantSlug: participantInfo?.slug || conv.participantSlug,
        participantName: participantInfo?.name || conv.participantName,
        participantEmail: participantInfo?.email,
        participantImage: participantInfo?.image,
        
        // Informații despre conversație
        lastMessage: conv.lastMessage,
        messageCount: conv.messageCount,
        unreadCount: 0, // TODO: implementă logica pentru mesaje necitite
        
        // 🆕 Metadate pentru debugging
        hasSlug: Boolean(participantInfo?.slug),
        conversationKey: conv.participantSlug || conv.participantName
      };
    });

    // Sortează conversațiile după ultimul mesaj (cele mai recente primul)
    conversations.sort((a, b) => {
      if (!a.lastMessage || !b.lastMessage) return 0;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    console.log(`✅ Returnez ${conversations.length} conversații`);

    return NextResponse.json({
      success: true,
      conversations: conversations,
      // 🆕 Informații suplimentare pentru debugging
      meta: {
        currentUser: {
          name: currentUser.name,
          slug: currentUser.slug
        },
        totalMessages: userMessages.length,
        participantsFound: participants.length
      }
    });

  } catch (error) {
    console.error('💥 Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🆕 POST - Marchează o conversație ca citită (pentru viitor)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { participantSlug, participantName } = await req.json();
    
    if (!participantSlug && !participantName) {
      return NextResponse.json(
        { success: false, error: 'Participant identifier required' },
        { status: 400 }
      );
    }

    // TODO: Implementează logica pentru marcarea mesajelor ca citite
    // Deocamdată returnăm success
    
    return NextResponse.json({
      success: true,
      message: 'Conversation marked as read'
    });

  } catch (error) {
    console.error('💥 Error marking conversation as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark conversation as read' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}