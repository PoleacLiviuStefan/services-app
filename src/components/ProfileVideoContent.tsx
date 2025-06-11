'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SessionInfo {
  sessionName: string;
  token:       string;
  userId:      string;
  startDate:   string; // ISO date
  endDate:     string; // ISO date
}

/**
 * Componentă care afișează un buton de conectare la sesiunea video
 * doar în intervalul dintre startDate și endDate.
 *
 * Așteaptă un endpoint API: /api/video/session-info
 * care returnează JSON de forma:
 * { sessionName, token, userId, startDate, endDate }
 */
export default function ProfileVideoConnect() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [canJoin, setCanJoin]   = useState(false);
  const [error, setError]       = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/video/session-info');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        setSession(data);
        const now   = new Date();
        const start = new Date(data.startDate);
        const end   = new Date(data.endDate);
        setCanJoin(now >= start && now <= end);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchSession();
  }, []);

  const joinSession = useCallback(() => {
    if (!session) return;
    router.push(
      `/video-session?sessionName=${encodeURIComponent(
        session.sessionName
      )}&token=${encodeURIComponent(session.token)}&userId=${encodeURIComponent(
        session.userId
      )}`
    );
  }, [session, router]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!session) return <p>Se încarcă sesiunea video...</p>;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3>Conectare la sesiunea video</h3>
      <p>
        Întâlnire: {new Date(session.startDate).toLocaleString()} –{' '}
        {new Date(session.endDate).toLocaleString()}
      </p>
      <button
        onClick={joinSession}
        disabled={!canJoin}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          cursor: canJoin ? 'pointer' : 'not-allowed',
          opacity: canJoin ? 1 : 0.5
        }}
      >
        {canJoin ? 'Intră în sesiune' : 'În afara intervalului de conectare'}
      </button>
    </div>
  );
}

/**
 * Pentru integrare, în fișierul de profil (de ex. app/profile/page.tsx):
 *
 * import ProfileVideoConnect from '@/components/ProfileVideoConnect';
 *
 * export default function ProfilePage() {
 *   return (
 *     <div>
 *       {/* Conținut profil... * /}
 *       <ProfileVideoConnect />
 *     </div>
 *   );
 * }
 */
