// app/api/chat/conversation/events/route.ts - DEBUG VERSION cu Redis config existentă
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initRedisSubscriber, REDIS_CHANNELS } from '@/lib/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

// Helper pentru generarea conversation ID cu slug-uri
const generateConversationId = (slug1: string, slug2: string): string => {
  return [slug1, slug2].sort().join('-');
};

// GET - Server-Sent Events pentru conversații
export async function GET(req: NextRequest) {
  try {
    // 1. Autentificare
    const session = await getServerSession(authOptions);
    console.log('🔍 Session user:', session?.user);
    
    if (!session?.user?.name) {
      console.log('❌ No session or user name');
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parametri
    const { searchParams } = new URL(req.url);
    const userParam = searchParams.get('user');
    const conversationParam = searchParams.get('conversation');
    
    console.log('🔍 URL Parameters:', { userParam, conversationParam });
    
    if (!userParam || !conversationParam) {
      console.log('❌ Missing parameters');
      return new Response('Missing required parameters: user and conversation', { status: 400 });
    }

    // 3. Găsește utilizatorul curent în baza de date
    const currentUser = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { 
        id: true,
        name: true, 
        slug: true 
      }
    });

    console.log('🔍 Current user from DB:', currentUser);

    if (!currentUser) {
      console.log('❌ Current user not found in database');
      return new Response('Current user not found in database', { status: 404 });
    }

    // 4. Găsește utilizatorul cerut în parametri
    const requestedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { slug: userParam },
          { name: userParam }
        ]
      },
      select: { 
        id: true,
        name: true, 
        slug: true 
      }
    });

    console.log('🔍 Requested user from DB:', requestedUser);
    console.log('🔍 User IDs match?', currentUser.id === requestedUser?.id);

    if (!requestedUser) {
      console.log('❌ Requested user not found');
      return new Response('Requested user not found', { status: 404 });
    }

    if (requestedUser.id !== currentUser.id) {
      console.log('❌ User ID mismatch - currentUser:', currentUser.id, 'requestedUser:', requestedUser.id);
      return new Response('Forbidden - can only access your own conversations', { status: 403 });
    }

    // 5. Parsează conversation ID inteligent
    let conversationParticipants: string[] = [];
    
    console.log('🔍 Parsing conversation ID:', conversationParam);
    console.log('🔍 Current user slug:', requestedUser.slug);
    
    // Strategy: știu că utilizatorul curent este unul dintre participanți
    // Încerc să determin unde să împart conversation ID-ul
    if (conversationParam.includes('-')) {
      const currentUserSlug = requestedUser.slug!;
      
      // Verifică dacă conversation ID începe cu slug-ul utilizatorului curent
      if (conversationParam.startsWith(currentUserSlug + '-')) {
        const otherParticipant = conversationParam.substring(currentUserSlug.length + 1);
        conversationParticipants = [currentUserSlug, otherParticipant];
        console.log('✅ Conversation starts with current user slug');
      }
      // Verifică dacă conversation ID se termină cu slug-ul utilizatorului curent
      else if (conversationParam.endsWith('-' + currentUserSlug)) {
        const otherParticipant = conversationParam.substring(0, conversationParam.length - currentUserSlug.length - 1);
        conversationParticipants = [otherParticipant, currentUserSlug];
        console.log('✅ Conversation ends with current user slug');
      }
      // Dacă conversation ID conține slug-ul în mijloc (mai complex)
      else {
        // Try all possible split positions
        const allSplitPositions = [];
        for (let i = 0; i < conversationParam.length; i++) {
          if (conversationParam[i] === '-') {
            allSplitPositions.push(i);
          }
        }
        
        console.log('🔍 Trying split positions:', allSplitPositions);
        
        // Încearcă fiecare poziție de split
        for (const splitPos of allSplitPositions) {
          const part1 = conversationParam.substring(0, splitPos);
          const part2 = conversationParam.substring(splitPos + 1);
          
          if ((part1 === currentUserSlug || part2 === currentUserSlug) && part1 !== part2) {
            conversationParticipants = [part1, part2];
            console.log('✅ Found valid split:', conversationParticipants);
            break;
          }
        }
      }
      
      if (conversationParticipants.length === 0) {
        console.log('❌ Could not parse conversation participants');
        return new Response('Invalid conversation format', { status: 400 });
      }
    } else {
      console.log('❌ Invalid conversation format - no hyphen');
      return new Response('Invalid conversation format', { status: 400 });
    }

    console.log('🔍 Conversation participants:', conversationParticipants);

    // 6. Verifică că utilizatorul curent face parte din conversație
    const userIsInConversation = (
      // Verifică după slug
      (requestedUser.slug && conversationParticipants.includes(requestedUser.slug)) ||
      // Verifică după nume (backwards compatibility)
      conversationParticipants.includes(requestedUser.name!)
    );

    console.log('🔍 User slug in conversation?', requestedUser.slug && conversationParticipants.includes(requestedUser.slug));
    console.log('🔍 User name in conversation?', conversationParticipants.includes(requestedUser.name!));
    console.log('🔍 User is in conversation?', userIsInConversation);

    if (!userIsInConversation) {
      console.log('❌ User not participant in conversation');
      console.log('   User slug:', requestedUser.slug);
      console.log('   User name:', requestedUser.name);
      console.log('   Participants:', conversationParticipants);
      return new Response('Forbidden - not participant in this conversation', { status: 403 });
    }

    console.log('✅ Authorization passed, creating SSE stream...');

    // 7. Configure SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let isControllerClosed = false;

        // Helper pentru trimis evenimente SSE
        const sendEvent = (data: any) => {
          if (isControllerClosed) {
            console.log('⚠️ Attempted to send event on closed controller');
            return;
          }
          
          try {
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch (error) {
            console.log('❌ Error encoding event:', typeof error);
            isControllerClosed = true;
          }
        };

        // Trimite event de confirmare
        sendEvent({
          type: 'connected',
          timestamp: new Date().toISOString(),
          conversationId: conversationParam,
          user: {
            name: requestedUser.name,
            slug: requestedUser.slug
          }
        });

        console.log('✅ SSE connection established');

        // 🚀 REDIS SUBSCRIBE pentru mesaje în timp real
        let redisSubscriber: any = null;
        const messageHandler = (message: string) => {
          try {
            const data = JSON.parse(message);
            console.log('📨 Redis message received:', data.type, 'for conversation:', data.conversationId);
            
            // Verifică dacă mesajul e pentru conversația curentă
            if (data.conversationId === conversationParam || 
                data.conversationId === conversationParticipants.join('-') ||
                data.conversationId === conversationParticipants.reverse().join('-')) {
              
              console.log('✅ Forwarding Redis message to SSE client');
              sendEvent(data);
            } else {
              console.log('⚠️ Message not for this conversation:', data.conversationId);
            }
          } catch (error) {
            console.error('❌ Error parsing Redis message:', error);
          }
        };

        // Inițializează Redis subscriber
        initRedisSubscriber()
          .then(async (subscriber) => {
            if (subscriber) {
              redisSubscriber = subscriber;
              await subscriber.subscribe(REDIS_CHANNELS.CHAT_EVENTS, messageHandler);
              console.log(`✅ Subscribed to Redis channel: ${REDIS_CHANNELS.CHAT_EVENTS}`);
            } else {
              console.warn('⚠️ Redis subscriber not available');
            }
          })
          .catch((error) => {
            console.error('❌ Failed to subscribe to Redis:', error);
          });

        // Heartbeat pentru a menține conexiunea activă
        const heartbeat = setInterval(() => {
          if (!isControllerClosed) {
            sendEvent({ 
              type: 'heartbeat', 
              timestamp: new Date().toISOString(),
              conversationId: conversationParam
            });
          } else {
            console.log('⚠️ Controller is closed, stopping heartbeat');
            clearInterval(heartbeat);
          }
        }, 30_000);

        // Cleanup la abort
        req.signal.addEventListener('abort', () => {
          console.log('🧹 SSE connection aborted, cleaning up');
          isControllerClosed = true;
          clearInterval(heartbeat);
          
          // Cleanup Redis subscription
          if (redisSubscriber) {
            try {
              redisSubscriber.unsubscribe(REDIS_CHANNELS.CHAT_EVENTS, messageHandler);
              console.log('✅ Unsubscribed from Redis');
            } catch (error) {
              console.error('❌ Error unsubscribing from Redis:', error);
            }
          }
          
          try {
            controller.close();
          } catch (e) {
            console.log('⚠️ Controller already closed during cleanup');
          }
        });
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
    
  } catch (error) {
    console.log('💥 Error in SSE endpoint:');
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      console.log('Stack trace:', error.stack);
    } else {
      console.log('Non-Error object:', String(error));
    }
    
    return new Response('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}