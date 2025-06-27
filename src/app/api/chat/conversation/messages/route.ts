// app/api/chat/conversation/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initRedisPublisher, REDIS_CHANNELS } from '@/lib/redis';
import { normalizeUserName, generateConversationId } from '@/utils/userResolver';

const prisma = new PrismaClient();

// POST - Trimite un mesaj într-o conversație privată
export async function POST(req: NextRequest) {
  try {
    // Verifică autentificarea cu NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { content, fromUsername, toUsername } = body;

    // Normalizează numele
    const normalizedFromUsername = normalizeUserName(fromUsername);
    const normalizedToUsername = normalizeUserName(toUsername);
    const normalizedCurrentUser = normalizeUserName(session.user.name);

    // Verifică că utilizatorul autentificat este cel care trimite mesajul
    if (normalizedCurrentUser !== normalizedFromUsername) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - cannot send messages as other users' },
        { status: 403 }
      );
    }

    // Validare
    if (!content || !fromUsername || !toUsername) {
      return NextResponse.json(
        { success: false, error: 'Content, fromUsername and toUsername are required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    if (fromUsername.length > 50 || toUsername.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Username too long (max 50 characters)' },
        { status: 400 }
      );
    }

    // Verifică că utilizatorul nu încearcă să-și trimită mesaj sieși
    if (normalizedFromUsername.toLowerCase() === normalizedToUsername.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    console.log(`Sending message from "${normalizedFromUsername}" to "${normalizedToUsername}"`);

    // Salvează mesajul în baza de date folosind numele reale
    const savedMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        fromUsername: normalizedFromUsername,
        toUsername: normalizedToUsername,
        messageType: 'PRIVATE'
      }
    });

    console.log('Message saved to database:', savedMessage.id);

    // Încearcă să publice în Redis pentru real-time updates
    // Dacă Redis nu funcționează, mesajul tot se salvează în DB
    try {
      const publisher = await initRedisPublisher();
      if (publisher) {
        // Generează conversationId folosind numele reale
        const conversationId = generateConversationId(normalizedFromUsername, normalizedToUsername);
        
        await publisher.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
          type: 'message',
          message: savedMessage,
          conversationId: conversationId
        }));
        console.log(`Message published to Redis successfully for conversation: ${conversationId}`);
      }
    } catch (redisError) {
      console.warn('Redis publish failed, but message saved to DB:', redisError.message);
      // Nu returna eroare - mesajul a fost salvat în DB
    }

    return NextResponse.json({
      success: true,
      message: savedMessage
    });

  } catch (error) {
    console.error('Error saving conversation message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// DELETE - Șterge un mesaj (doar expeditorul poate șterge)
export async function DELETE(req: NextRequest) {
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
    const messageId = searchParams.get('id');
    const username = searchParams.get('username');

    if (!messageId || !username) {
      return NextResponse.json(
        { success: false, error: 'Message ID and username are required' },
        { status: 400 }
      );
    }

    // Normalizează numele
    const normalizedUsername = normalizeUserName(username);
    const normalizedCurrentUser = normalizeUserName(session.user.name);

    // Verifică că utilizatorul autentificat este cel care încearcă să șteargă
    if (normalizedCurrentUser !== normalizedUsername) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - cannot delete other users messages' },
        { status: 403 }
      );
    }

    // Verifică dacă mesajul aparține utilizatorului (doar expeditorul poate șterge)
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        fromUsername: normalizedUsername,
        messageType: 'PRIVATE'
      }
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found or not authorized to delete' },
        { status: 404 }
      );
    }

    // Șterge mesajul
    await prisma.message.delete({
      where: { id: messageId }
    });

    // Încearcă să publice ștergerea în Redis
    try {
      const publisher = await initRedisPublisher();
      if (publisher) {
        // Generează conversation ID folosind numele reale
        const conversationId = generateConversationId(message.fromUsername!, message.toUsername!);

        // Anunță ștergerea prin Redis
        await publisher.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
          type: 'messageDeleted',
          messageId: messageId,
          conversationId: conversationId
        }));
        console.log(`Message deletion published to Redis for conversation: ${conversationId}`);
      }
    } catch (redisError) {
      console.warn('Redis publish failed for message deletion:', redisError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}