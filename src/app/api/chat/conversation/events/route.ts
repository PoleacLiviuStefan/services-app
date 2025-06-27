// app/api/chat/conversation/events/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initRedisSubscriber, REDIS_CHANNELS } from '@/lib/redis';
import { normalizeUserName } from '@/utils/userResolver';

export const runtime = 'nodejs';

// GET - Server-Sent Events pentru conversații
export async function GET(req: NextRequest) {
  try {
    // 1. Autentificare
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parametri
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user');
    const conversation = searchParams.get('conversation');
    if (!user || !conversation) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // 3. Normalize & authorize
    const normalizedUser = normalizeUserName(user);
    const normalizedCurrent = normalizeUserName(session.user.name);
    if (normalizedCurrent !== normalizedUser) {
      return new Response('Forbidden', { status: 403 });
    }

    console.log(`[SSE] User ${normalizedUser} connecting to conversation: ${conversation}`);

    // 4. Configure SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // helper pentru trimis evenimente SSE
        const sendEvent = (data: any) => {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        // trimite event de confirmare
        sendEvent({
          type: 'connected',
          timestamp: new Date().toISOString(),
          conversationId: conversation,
        });

        // 5. Init Redis subscriber
        let subscriber: Awaited<ReturnType<typeof initRedisSubscriber>>;
        let heartbeat: NodeJS.Timer;
        // callback pentru mesaje pub/sub
        const messageHandler = (raw: string) => {
          try {
            const data = JSON.parse(raw);
            // mesaje de chat
            if (data.conversationId === conversation) {
              sendEvent(data);
            }
            // notificări userOnline/userOffline
            if (
              (data.type === 'userOnline' || data.type === 'userOffline') &&
              conversation
                .split('-')
                .map(normalizeUserName)
                .includes(normalizeUserName(data.username || ''))
            ) {
              sendEvent(data);
            }
          } catch (err) {
            console.error('[SSE] Error parsing Redis message:', err);
          }
        };

        try {
          subscriber = await initRedisSubscriber();
          if (!subscriber) throw new Error('Redis unavailable');

          // subscribe cu handler
          await subscriber.subscribe(REDIS_CHANNELS.CHAT_EVENTS, messageHandler);
          console.log(`[SSE] Subscribed to ${REDIS_CHANNELS.CHAT_EVENTS}`);

          // heartbeat
          heartbeat = setInterval(() => {
            sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
          }, 30_000);
        } catch (err) {
          console.error('[SSE] Redis subscriber init error:', err);
          sendEvent({ type: 'error', message: 'Real-time service unavailable' });
        }

        // cleanup la abort
        const cleanup = async () => {
          console.log(`[SSE] Cleaning up for ${normalizedUser} / ${conversation}`);
          if (heartbeat) clearInterval(heartbeat);
          if (subscriber) {
            try {
              await subscriber.unsubscribe(REDIS_CHANNELS.CHAT_EVENTS, messageHandler);
              await subscriber.disconnect();
            } catch (e) {
              console.error('[SSE] Error during Redis cleanup:', e);
            }
          }
          controller.close();
        };
        req.signal.addEventListener('abort', cleanup);
      }
    });

    // 6. Return SSE response
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type':        'text/event-stream',
        'Cache-Control':       'no-cache, no-transform',
        Connection:            'keep-alive',
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('[SSE] Error in events endpoint:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
