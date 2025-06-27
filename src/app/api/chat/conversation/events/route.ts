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
    // Verifică autentificarea cu NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user'); // utilizatorul curent autentificat
    const conversation = searchParams.get('conversation'); // conversationId cu numele reale

    if (!user || !conversation) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Normalizează numele și verifică autorizarea
    const normalizedUser = normalizeUserName(user);
    const normalizedCurrentUser = normalizeUserName(session.user.name);

    // Verifică că utilizatorul autentificat este cel care face cererea
    if (normalizedCurrentUser !== normalizedUser) {
      return new Response('Forbidden', { status: 403 });
    }

    console.log(`[SSE] User ${normalizedUser} connecting to conversation: ${conversation}`);

    // Configurează SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Funcție pentru a trimite date
        const sendEvent = (data: any) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('[SSE] Error sending event:', error);
          }
        };

        // Trimite confirmarea de conectare
        sendEvent({
          type: 'connected',
          timestamp: new Date().toISOString(),
          conversationId: conversation
        });

        // Inițializează subscriber-ul Redis
        let subscriber: any;
        let heartbeatInterval: NodeJS.Timeout;
        
        const initSubscriber = async () => {
          try {
            subscriber = await initRedisSubscriber();
            
            if (subscriber) {
              await subscriber.subscribe(REDIS_CHANNELS.CHAT_EVENTS);
              console.log(`[SSE] Subscribed to Redis events for user ${normalizedUser}`);
              
              subscriber.on('message', (channel: string, message: string) => {
                try {
                  const data = JSON.parse(message);
                  
                  // Filtrează mesajele pentru această conversație
                  if (data.conversationId && data.conversationId === conversation) {
                    console.log(`[SSE] Relaying message to ${normalizedUser} in conversation ${conversation}:`, data.type);
                    sendEvent(data);
                  }
                  
                  // Gestionează notificările de online/offline pentru utilizatori din conversație
                  if ((data.type === 'userOnline' || data.type === 'userOffline')) {
                    // Verifică dacă utilizatorul care se conectează/deconectează face parte din conversația curentă
                    const conversationUsers = conversation.split('-').map(name => normalizeUserName(name));
                    const dataUsername = normalizeUserName(data.username || '');
                    
                    if (conversationUsers.includes(dataUsername)) {
                      console.log(`[SSE] User ${dataUsername} status change in conversation ${conversation}:`, data.type);
                      sendEvent(data);
                    }
                  }
                  
                } catch (error) {
                  console.error('[SSE] Error parsing Redis message:', error);
                }
              });

              subscriber.on('error', (error: any) => {
                console.error('[SSE] Redis subscriber error:', error);
              });
              
              // Heartbeat pentru a menține conexiunea
              heartbeatInterval = setInterval(() => {
                try {
                  sendEvent({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString()
                  });
                } catch (error) {
                  console.error('[SSE] Heartbeat error:', error);
                  clearInterval(heartbeatInterval);
                }
              }, 30000); // La fiecare 30 de secunde
              
            } else {
              console.warn('[SSE] Redis subscriber not available');
              sendEvent({
                type: 'error',
                message: 'Real-time messaging not available'
              });
            }
            
          } catch (error) {
            console.error('[SSE] Error initializing subscriber:', error);
            sendEvent({
              type: 'error',
              message: 'Failed to connect to real-time service'
            });
          }
        };

        // Cleanup când se închide conexiunea
        const cleanup = () => {
          console.log(`[SSE] Cleaning up connection for user ${normalizedUser} in conversation ${conversation}`);
          
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          
          if (subscriber) {
            try {
              subscriber.unsubscribe();
              subscriber.quit();
            } catch (error) {
              console.error('[SSE] Error cleaning up subscriber:', error);
            }
          }
          
          try {
            controller.close();
          } catch (error) {
            console.error('[SSE] Error closing controller:', error);
          }
        };

        // Event listener pentru închiderea conexiunii
        req.signal?.addEventListener('abort', cleanup);
        
        // Inițializează subscriber-ul
        initSubscriber();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('[SSE] Error in events endpoint:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}