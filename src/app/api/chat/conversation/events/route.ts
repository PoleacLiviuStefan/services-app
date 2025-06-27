// app/api/chat/conversation/events/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { initRedisSubscriber, REDIS_CHANNELS } from '@/lib/redis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const conversationId = url.searchParams.get('conversationId')
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: 'Missing conversationId' },
      { status: 400 }
    )
  }

  // Optional: autentificare SSE
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const subscriber = await initRedisSubscriber()
  if (!subscriber) {
    console.error('[SSE] Redis subscriber unavailable')
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const handler = (raw: string) => {
        try {
          const payload = JSON.parse(raw)
          if (payload.conversationId !== conversationId) return
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
        } catch (err) {
          console.error('[SSE] Invalid JSON from Redis:', err)
        }
      }

      // Abonare corectă pentru redis@4.x
      await subscriber.subscribe(REDIS_CHANNELS.CHAT_EVENTS, handler)

      // Curățare la deconectare client
      req.signal.addEventListener('abort', async () => {
        await subscriber.unsubscribe(REDIS_CHANNELS.CHAT_EVENTS, handler)
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      Connection:          'keep-alive',
    },
  })
}
