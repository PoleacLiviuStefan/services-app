'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { parseISO, differenceInMinutes } from 'date-fns';
import DailyIframe from '@daily-co/daily-js';

export default function VideoSessionPage() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const roomUrl = params.get('url') || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);
  const [minutesLeft, setMinutesLeft] = useState<number>(0);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // 1. Dacă ai nevoie de endDate din API, ai putea:
  useEffect(() => {
    if (!roomUrl) return;
    // Opțional: fetch(`/api/video/session-info?url=${encodeURIComponent(roomUrl)}`)
    //   .then(res => res.json())
    //   .then(data => setEndDate(new Date(data.session.endDate)));
    // Dar dacă ai endDate deja pe front, setează-l direct.
  }, [roomUrl]);

  // 2. Initialize Daily și join
  useEffect(() => {
    if (status !== 'authenticated' || !roomUrl || !containerRef.current) return;
    if (frameRef.current) return;

    (async () => {
      try {
        const { default: Daily } = await import('@daily-co/daily-js');
        frameRef.current = Daily.createFrame(containerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        await frameRef.current.join({
          url: roomUrl,
          userName: session.user?.name || 'Guest',
        });
      } catch (e) {
        console.error('Eroare Daily:', e);
      }
    })();

    return () => {
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, [status, session?.user, roomUrl]);

  // 3. Timer pânã la endDate
  useEffect(() => {
    if (!endDate) return;
    const update = () => {
      const mins = Math.max(0, differenceInMinutes(endDate, new Date()));
      setMinutesLeft(mins);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (status === 'loading') return <p>Se încarcă sesiunea…</p>;
  if (status !== 'authenticated') return <p>Autentificare necesară</p>;
  if (!roomUrl) return <p>URL-ul camerei lipsește din parametri</p>;

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />
      {endDate && (
        <div className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-75 rounded-lg text-white font-mono">
          <span className="text-2xl font-bold mr-1">{minutesLeft}</span>
          <span>min rămase</span>
        </div>
      )}
    </div>
  );
}
