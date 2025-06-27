// app/api/chat/conversation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeUserName } from '@/utils/userResolver';

const prisma = new PrismaClient();

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
    let user1 = searchParams.get('user1');
    let user2 = searchParams.get('user2');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!user1 || !user2) {
      return NextResponse.json(
        { success: false, error: 'Both user1 and user2 are required' },
        { status: 400 }
      );
    }

    // Normalizează numele pentru a evita problemele cu encoding
    user1 = normalizeUserName(user1);
    user2 = normalizeUserName(user2);

    // Verifică că utilizatorul autentificat are acces la această conversație
    const currentUserName = normalizeUserName(session.user.name);
    if (currentUserName !== user1 && currentUserName !== user2) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - can only access your own conversations' },
        { status: 403 }
      );
    }

    // Verifică să nu încerce să converseze cu sine
    if (user1.toLowerCase() === user2.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot have conversation with yourself' },
        { status: 400 }
      );
    }

    console.log(`Loading conversation between: "${user1}" and "${user2}"`);

    // Găsește mesajele între cei doi utilizatori
    const messages = await prisma.message.findMany({
      where: {
        messageType: 'PRIVATE', // Doar mesajele private
        OR: [
          {
            AND: [
              { fromUsername: user1 },
              { toUsername: user2 }
            ]
          },
          {
            AND: [
              { fromUsername: user2 },
              { toUsername: user1 }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset
    });

    console.log(`Found ${messages.length} messages for conversation`);

    return NextResponse.json({
      success: true,
      messages: messages,
      conversationId: [user1, user2].sort().join('-'),
      count: messages.length
    });

  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}