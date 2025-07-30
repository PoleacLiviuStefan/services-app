// app/api/chat/conversation/messages/route.ts - CORECTAT pentru slug-uri
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initRedisPublisher, REDIS_CHANNELS } from '@/lib/redis';

const prisma = new PrismaClient();

// 🆕 Funcție helper pentru generarea conversation ID cu slug-uri
const generateConversationId = (slug1: string, slug2: string): string => {
  return [slug1, slug2].sort().join('-');
};

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
    const { 
      content, 
      // 🆕 Acceptă atât slug-uri cât și nume
      fromUserSlug, 
      toUserSlug,
      // 🗑️ Backwards compatibility  
      fromUsername, 
      toUsername 
    } = body;

    // Validare conținut
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // 🆕 Validare parametri - trebuie să avem identificatori pentru destinatar
    if (!toUserSlug && !toUsername) {
      return NextResponse.json(
        { success: false, error: 'Recipient identifier (toUserSlug or toUsername) is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Trimitere mesaj către: ${toUserSlug || toUsername}`);

    // 🆕 1. Găsește utilizatorul curent (expeditorul)
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

    // 🆕 2. Verifică autorizarea - expeditorul trebuie să fie utilizatorul curent
    if (fromUserSlug || fromUsername) {
      // Dacă sunt specificate explicit, verifică că sunt ale utilizatorului curent
      const isAuthorizedSender = (
        (fromUserSlug && fromUserSlug === currentUser.slug) ||
        (fromUsername && fromUsername === currentUser.name) ||
        (!fromUserSlug && !fromUsername) // Dacă nu sunt specificate, se folosește utilizatorul curent
      );

      if (!isAuthorizedSender) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - cannot send messages as other users' },
          { status: 403 }
        );
      }
    }

    // 🆕 3. Găsește destinatarul
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          ...(toUserSlug ? [{ slug: toUserSlug }] : []),
          ...(toUsername ? [{ name: toUsername }] : [])
        ]
      },
      select: { 
        id: true,
        name: true, 
        slug: true 
      }
    });

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // 🆕 4. Verifică să nu trimită mesaj către sine
    if (currentUser.id === recipient.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    console.log(`📨 Mesaj de la ${currentUser.name} (${currentUser.slug}) către ${recipient.name} (${recipient.slug})`);

    // 🆕 5. Salvează mesajul cu atât slug-uri cât și nume (hibrid)
    const savedMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        messageType: 'PRIVATE',
        // 🆕 Folosește slug-uri (metoda preferată)
        fromUserSlug: currentUser.slug,
        toUserSlug: recipient.slug,
        // 🗑️ Backwards compatibility (va fi eliminat)
        fromUsername: currentUser.name,
        toUsername: recipient.name
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

    console.log('✅ Mesaj salvat în baza de date:', savedMessage.id);

    // 🆕 6. Publică în Redis pentru real-time updates (cu slug-uri)
    try {
      const publisher = await initRedisPublisher();
      if (publisher && currentUser.slug && recipient.slug) {
        const conversationId = generateConversationId(currentUser.slug, recipient.slug);
        
        await publisher.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
          type: 'message',
          message: {
            ...savedMessage,
            // 🆕 Îmbogățește cu informații despre expeditor și destinatar
            sender: {
              slug: currentUser.slug,
              name: currentUser.name
            },
            receiver: {
              slug: recipient.slug,
              name: recipient.name
            }
          },
          conversationId: conversationId
        }));
        
        console.log(`📡 Mesaj publicat în Redis pentru conversația: ${conversationId}`);
      }
    } catch (redisError) {
      console.warn('⚠️ Redis publish eșuat, dar mesajul a fost salvat în DB:', redisError.message);
      // Nu returna eroare - mesajul a fost salvat în DB
    }

    return NextResponse.json({
      success: true,
      message: {
        ...savedMessage,
        // 🆕 Informații îmbogățite pentru client
        sender: {
          slug: currentUser.slug,
          name: currentUser.name
        },
        receiver: {
          slug: recipient.slug,
          name: recipient.name
        },
        isFromCurrentUser: true
      }
    });

  } catch (error) {
    console.error('💥 Error saving conversation message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save message' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🆕 DELETE - Șterge un mesaj (doar expeditorul poate șterge) - ACTUALIZAT
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
    // 🆕 Acceptă atât slug cât și nume pentru identificare
    const userSlug = searchParams.get('userSlug');
    const username = searchParams.get('username');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // 🆕 Găsește utilizatorul curent
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

    // 🆕 Găsește mesajul și verifică ownership
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          // 🆕 Verifică după slug (preferabil)
          ...(currentUser.slug ? [{ fromUserSlug: currentUser.slug }] : []),
          // 🗑️ Verifică după nume (backwards compatibility)
          { fromUsername: currentUser.name }
        ],
        messageType: 'PRIVATE'
      },
      select: {
        id: true,
        fromUserSlug: true,
        toUserSlug: true,
        fromUsername: true,
        toUsername: true
      }
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found or not authorized to delete' },
        { status: 404 }
      );
    }

    // 🆕 Verifică ownership suplimentar dacă sunt specificate parametri
    if (userSlug || username) {
      const isOwner = (
        (userSlug && userSlug === currentUser.slug) ||
        (username && username === currentUser.name)
      );

      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - cannot delete other users messages' },
          { status: 403 }
        );
      }
    }

    console.log(`🗑️ Ștergere mesaj ${messageId} de către ${currentUser.name}`);

    // Șterge mesajul
    await prisma.message.delete({
      where: { id: messageId }
    });

    // 🆕 Publică ștergerea în Redis (cu slug-uri)
    try {
      const publisher = await initRedisPublisher();
      if (publisher && message.fromUserSlug && message.toUserSlug) {
        const conversationId = generateConversationId(message.fromUserSlug, message.toUserSlug);

        await publisher.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
          type: 'messageDeleted',
          messageId: messageId,
          conversationId: conversationId,
          deletedBy: {
            slug: currentUser.slug,
            name: currentUser.name
          }
        }));
        
        console.log(`📡 Ștergerea mesajului publicată în Redis pentru conversația: ${conversationId}`);
      }
    } catch (redisError) {
      console.warn('⚠️ Redis publish eșuat pentru ștergerea mesajului:', redisError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('💥 Error deleting conversation message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🆕 PUT - Editează un mesaj (doar expeditorul poate edita)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { messageId, content } = await req.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message ID and content are required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Găsește utilizatorul curent
    const currentUser = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { id: true, name: true, slug: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Current user not found' },
        { status: 404 }
      );
    }

    // Găsește și actualizează mesajul
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          ...(currentUser.slug ? [{ fromUserSlug: currentUser.slug }] : []),
          { fromUsername: currentUser.name }
        ],
        messageType: 'PRIVATE'
      }
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found or not authorized to edit' },
        { status: 404 }
      );
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { 
        content: content.trim(),
        // Adaugă timestamp pentru editare
        updatedAt: new Date()
      }
    });

    console.log(`✏️ Mesaj editat ${messageId} de către ${currentUser.name}`);

    // Publică editarea în Redis
    try {
      const publisher = await initRedisPublisher();
      if (publisher && message.fromUserSlug && message.toUserSlug) {
        const conversationId = generateConversationId(message.fromUserSlug, message.toUserSlug);

        await publisher.publish(REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
          type: 'messageEdited',
          message: updatedMessage,
          conversationId: conversationId,
          editedBy: {
            slug: currentUser.slug,
            name: currentUser.name
          }
        }));
      }
    } catch (redisError) {
      console.warn('⚠️ Redis publish eșuat pentru editarea mesajului:', redisError.message);
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });

  } catch (error) {
    console.error('💥 Error editing message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to edit message' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}