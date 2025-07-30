// components/GlobalPresenceTracker.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export default function GlobalPresenceTracker() {
  const { data: session, status } = useSession()
  const isAuth = status === 'authenticated'
  const slugRef = useRef<string | null>(null)

  // Populează slugRef când apare numele în session
  useEffect(() => {
    if (session?.user?.name) {
      const userSlug = session.user.slug;
      slugRef.current = encodeURIComponent(userSlug)
    }
  }, [session?.user?.name])

  useEffect(() => {
    const slug = slugRef.current
    if (!isAuth || !slug) return

    const url = `/api/user/${slug}`
    const sendStatus = (online: boolean) => {
      const payload = JSON.stringify({ online })
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, payload)
      } else {
        fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(console.error)
      }
    }

    sendStatus(true)

    const handleUnload = () => sendStatus(false)
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      handleUnload()
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [isAuth])

  return null
}
