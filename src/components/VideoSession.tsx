'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { parseISO, differenceInMinutes } from 'date-fns';
import DailyIframe from '@daily-co/daily-js';

export default function VideoSession() {
  const { data: session, status } = useSession();
  const params = useSearchParams();                                    // :contentReference[oaicite:2]{index=2}
  const roomUrl = params.get('url') || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);
  const [minutesLeft, setMinutesLeft] = useState<number>(0);

  // Inițializează Daily iframe și intră în sesiune
  useEffect(() => {
    if (
      status !== 'authenticated' ||
      !roomUrl ||
      !containerRef.current
    ) return;
    if (frameRef.current) return;

    (async () => {
      const { default: Daily } = await import('@daily-co/daily-js');  // :contentReference[oaicite:3]{index=3}
      frameRef.current = Daily.createFrame(containerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: false,
      });
      await frameRef.current.join({
        url: roomUrl,
        userName: session.user?.name || 'Guest',
      });
    })();

    return () => {
      frameRef.current?.destroy();                                     // :contentReference[oaicite:4]{index=4}
      frameRef.current = null;
    };
  }, [status, session?.user, roomUrl]);

  // Timer de countdown până la endDate inclus în URL (ex: ?end=2025-07-10T12:00:00Z)
  useEffect(() => {
    const endParam = params.get('end');
    if (!endParam) return;
    const end = parseISO(endParam);                                   // :contentReference[oaicite:5]{index=5}
    function update() {
      const mins = Math.max(0, differenceInMinutes(end, new Date()));
      setMinutesLeft(mins);
    }
    update();
    const id = setInterval(update, 1000);                             // :contentReference[oaicite:6]{index=6}
    return () => clearInterval(id);
  }, [params]);

  if (status === 'loading') return <p>Se încarcă sesiunea…</p>;
  if (status !== 'authenticated') return <p>Autentificare necesară</p>;
  if (!roomUrl) return <p>URL-ul camerei lipsește din parametri</p>;

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />
      {params.get('end') && (
        <div className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-75 rounded-lg text-white font-mono">
          <span className="text-2xl font-bold mr-1">{minutesLeft}</span>
          <span>minute rămase</span>
        </div>
      )}
    </div>
  );
}
