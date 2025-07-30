// app/api/chat/conversation/route.ts - Cu broadcast în timp real
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initRedisPublisher, REDIS_CHANNELS } from '@/lib/redis';

const prisma = new PrismaClient();

// Helper pentru generarea conversation ID
const generateConversationId = (slug1: string, slug2: string): string => {
  return [slug1, slug2].sort().join('-');
};

// GET - Recuperează mesajele pentru o conversație specifică
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

    const { searchParams } = new URL(req.url);
    
    const user1Param = searchParams.get('user1'); // poate fi slug sau nume
    const user2Param = searchParams.get('user2'); // poate fi slug sau nume
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!user1Param || !user2Param) {
      return NextResponse.json(
        { success: false, error: 'Both user1 and user2 are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Căutare conversație între: "${user1Param}" și "${user2Param}"`);

    // 1. Găsește utilizatorul curent în baza de date
    const currentUser = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { 
        id: true,
        name: true, 
        slug: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Current user not found in database' },
        { status: 404 }
      );
    }

    // 2. Găsește ceilalți doi utilizatori
    const [user1Data, user2Data] = await Promise.all([
      prisma.user.findFirst({
        where: {
          OR: [
            { slug: user1Param },
            { name: user1Param }
          ]
        },
        select: { 
          id: true,
          name: true, 
          slug: true,
          image: true 
        }
      }),
      prisma.user.findFirst({
        where: {
          OR: [
            { slug: user2Param },
            { name: user2Param }
          ]
        },
        select: { 
          id: true,
          name: true, 
          slug: true,
          image: true 
        }
      })
    ]);

    if (!user1Data || !user2Data) {
      return NextResponse.json(
        { success: false, error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // 3. Verifică autorizarea
    const currentUserSlug = currentUser.slug;
    const currentUserName = currentUser.name;
    
    const hasAccess = (
      (currentUserSlug && (currentUserSlug === user1Data.slug || currentUserSlug === user2Data.slug)) ||
      currentUserName === user1Data.name || currentUserName === user2Data.name
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - can only access your own conversations' },
        { status: 403 }
      );
    }

    // 4. Verifică să nu încerce să converseze cu sine
    if (user1Data.id === user2Data.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot have conversation with yourself' },
        { status: 400 }
      );
    }

    // 5. Găsește mesajele - ACTUALIZAT pentru a lua ultimele mesaje
    const messages = await prisma.message.findMany({
      where: {
        messageType: 'PRIVATE',
        OR: [
          // Căutare după slug-uri
          ...(user1Data.slug && user2Data.slug ? [
            {
              AND: [
                { fromUserSlug: user1Data.slug },
                { toUserSlug: user2Data.slug }
              ]
            },
            {
              AND: [
                { fromUserSlug: user2Data.slug },
                { toUserSlug: user1Data.slug }
              ]
            }
          ] : []),
          
          // Backwards compatibility pentru nume
          {
            AND: [
              { fromUsername: user1Data.name },
              { toUsername: user2Data.name }
            ]
          },
          {
            AND: [
              { fromUsername: user2Data.name },
              { toUsername: user1Data.name }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' }, // 🆕 Descrescător pentru ultimele mesaje
      take: limit,
      skip: offset,
      select: {
        id: true,
        content: true,
        fromUserSlug: true,
        toUserSlug: true,
        fromUsername: true,
        toUsername: true,
        createdAt: true,
        messageType: true
      }
    });

    // 🆕 Inversează mesajele pentru afișare cronologică (vechi -> nou)
    const chronologicalMessages = messages.reverse();

    // 6. Îmbogățește mesajele cu informații despre utilizatori
    const enrichedMessages = chronologicalMessages.map(message => {
      let sender = null;
      let receiver = null;

      if (message.fromUserSlug === user1Data.slug || message.fromUsername === user1Data.name) {
        sender = user1Data;
        receiver = user2Data;
      } else if (message.fromUserSlug === user2Data.slug || message.fromUsername === user2Data.name) {
        sender = user2Data;
        receiver = user1Data;
      }

      return {
        ...message,
        sender: sender ? {
          slug: sender.slug,
          name: sender.name,
          image: sender.image
        } : null,
        receiver: receiver ? {
          slug: receiver.slug,
          name: receiver.name,
          image: receiver.image
        } : null,
        isFromCurrentUser: (
          message.fromUserSlug === currentUserSlug || 
          message.fromUsername === currentUserName
        )
      };
    });

    // 7. Informații despre participanții conversației
    const participants = [user1Data, user2Data].map(user => ({
      id: user.id,
      slug: user.slug,
      name: user.name,
      image: user.image,
      isCurrentUser: user.id === currentUser.id
    }));

    return NextResponse.json({
      success: true,
      messages: enrichedMessages,
      participants: participants,
      conversationId: [user1Data.slug || user1Data.name, user2Data.slug || user2Data.name]
        .sort()
        .join('-'),
      count: messages.length,
      meta: {
        totalMessages: enrichedMessages.length,
        hasSlugBasedMessages: enrichedMessages.some(m => m.fromUserSlug && m.toUserSlug),
        hasNameBasedMessages: enrichedMessages.some(m => m.fromUsername && m.toUsername),
        hasMoreMessages: messages.length === limit, // 🆕 Indică dacă există mesaje mai vechi
        currentUser: {
          name: currentUser.name,
          slug: currentUser.slug
        }
      }
    });

  } catch (error) {
    console.error('💥 Error fetching conversation messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Trimite un mesaj ȘI face broadcast în timp real
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { content, toUserSlug, toUserName } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (!toUserSlug && !toUserName) {
      return NextResponse.json(
        { success: false, error: 'Recipient identifier (slug or name) is required' },
        { status: 400 }
      );
    }

    // Găsește expeditorul (utilizatorul curent)
    const fromUser = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { id: true, name: true, slug: true, image: true }
    });

    if (!fromUser) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      );
    }

    // Găsește destinatarul
    const toUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(toUserSlug ? [{ slug: toUserSlug }] : []),
          ...(toUserName ? [{ name: toUserName }] : [])
        ]
      },
      select: { id: true, name: true, slug: true, image: true }
    });

    if (!toUser) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Verifică să nu trimită mesaj către sine
    if (fromUser.id === toUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    // Creează mesajul în DB
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        messageType: 'PRIVATE',
        fromUserSlug: fromUser.slug,
        toUserSlug: toUser.slug,
        fromUsername: fromUser.name,
        toUsername: toUser.name
      },
      select: {
        id: true,
        content: true,
        fromUserSlug: true,
        toUserSlug: true,
        fromUsername: true,
        toUsername: true,
        createdAt: true,
        messageType: true
      }
    });

    console.log(`✅ Mesaj trimis de ${fromUser.name} către ${toUser.name}`);

    // 🚀 BROADCAST PRIN REDIS pentru update în timp real
    try {
      const redis = await initRedisPublisher();
      
      if (redis) {
        const conversationId = generateConversationId(
          fromUser.slug || fromUser.name!, 
          toUser.slug || toUser.name!
        );

        const enrichedMessage = {
          ...message,
          sender: {
            slug: fromUser.slug,
            name: fromUser.name,
            image: fromUser.image
          },
          receiver: {
            slug: toUser.slug,
            name: toUser.name,
            image: toUser.image
          }
        };

        const broadcastData = {
          type: 'message',
          conversationId,
          message: enrichedMessage,
          timestamp: new Date().toISOString()
        };

        // Publică în Redis folosind channel-ul din configurația ta
        await redis.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify(broadcastData));
        console.log(`📡 Message broadcasted to Redis channel ${REDIS_CHANNELS.CHAT_EVENTS} for conversation: ${conversationId}`);
        
      } else {
        console.warn('⚠️ Redis publisher not available, message not broadcasted');
      }
    } catch (broadcastError) {
      console.error('❌ Error broadcasting message:', broadcastError);
      // Nu eșuăm request-ul dacă broadcast-ul nu funcționează
    }

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        sender: {
          slug: fromUser.slug,
          name: fromUser.name,
          image: fromUser.image
        },
        receiver: {
          slug: toUser.slug,
          name: toUser.name,
          image: toUser.image
        },
        isFromCurrentUser: true
      }
    });

  } catch (error) {
    console.error('💥 Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}