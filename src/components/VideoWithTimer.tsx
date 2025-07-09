'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  parseISO,
  differenceInMinutes,
} from 'date-fns';
import DailyIframe from '@daily-co/daily-js';

interface ConsultingSession {
  joinUrl: string;
  endDate: string;
}

export default function VideoWithTimer({ sessionId }: { sessionId: string }) {
  const { data: session, status } = useSession();
  const [sessionInfo, setSessionInfo] = useState<ConsultingSession | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);
  const [minutesLeft, setMinutesLeft] = useState<number>(0);

  // 1. Fetch session data (joinUrl + endDate)
  useEffect(() => {
    fetch(`/api/video/session-info/${sessionId}`, {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setSessionInfo({
          joinUrl: data.session.joinUrl,
          endDate: data.session.endDate,
        });
      })
      .catch(console.error);
  }, [sessionId]);

  // 2. Initialize Daily iframe & join
  useEffect(() => {
    if (
      status !== 'authenticated' ||
      !containerRef.current ||
      !sessionInfo?.joinUrl
    )
      return;
    if (frameRef.current) return;

    frameRef.current = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: false,
      showFullscreenButton: false,
    });
    frameRef.current.join({
      url: sessionInfo.joinUrl,
      userName: session.user?.name || 'Guest',
    });

    return () => {
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, [status, sessionInfo, session?.user]);

  // 3. Countdown timer până la endDate
  useEffect(() => {
    if (!sessionInfo?.endDate) return;
    const end = parseISO(sessionInfo.endDate);
    const update = () => {
      const mins = Math.max(0, differenceInMinutes(end, new Date()));
      setMinutesLeft(mins);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [sessionInfo]);

  if (status === 'loading') return <p>Se încarcă sesiunea...</p>;
  if (status !== 'authenticated') return <p>Autentificare necesară</p>;
  if (!sessionInfo) return <p>Se încarcă detaliile sesiunii...</p>;

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Container Daily */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay custom cu timer */}
      <div className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-75 rounded-lg text-white text-lg font-mono">
        <span className="mr-1">{minutesLeft}</span>
        <span>minute rămase</span>
      </div>
    </div>
  );
}
