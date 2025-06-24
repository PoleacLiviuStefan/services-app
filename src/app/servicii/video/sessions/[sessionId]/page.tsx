"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

interface SessionInfo {
  sessionName: string;
  token:       string;
  userId:      string;
  startDate:   string;
  endDate:     string;
  provider:    { id: string; name: string };
  client:      { id: string; name: string };
}

export default function VideoSessionPage() {
  const { data: auth, status } = useSession();
  const params = useParams();
  const sessionId = params?.sessionId;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient]     = useState<any>(null);
  const [stream, setStream]     = useState<any>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError]       = useState<string>('');
  const [loading, setLoading]   = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // refs pentru elemente video și container remote
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);

  // Fetch session info
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/video/session-info/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setSessionInfo(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Countdown timer
  useEffect(() => {
    if (!sessionInfo?.endDate) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(sessionInfo.endDate).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('00:00');
        clearInterval(timer);
        return;
      }
      const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionInfo]);

  // Initialize Zoom + debug preview
  useEffect(() => {
    if (!sessionInfo) return;
    (async () => {
      try {
        // solicită permisiuni media
        const rawStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // atașează fluxul brut pentru test în video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = rawStream;
          localVideoRef.current.play().catch(console.warn);
        }

        const ZoomMod = await import('@zoom/videosdk');
        const ZoomVideo = (ZoomMod.default ?? ZoomMod) as any;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });

        // apel corect: token, topic, userName
        await c.join(
          sessionInfo.token,
          sessionInfo.sessionName,
          auth?.user?.name || sessionInfo.userId
        );

        setClient(c);
        const ms = c.getMediaStream();
        setStream(ms);

        // curăță video brut după inițializare
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        // pornește video Zoom
        if (!localVideoRef.current) throw new Error('Local video element not found');
        await ms.startVideo({ videoElement: localVideoRef.current });
        setVideoOn(true);
        await ms.startAudio();
        setAudioOn(true);

        // evenimente stream remote
        c.on('stream-updated', async (p: any, t: string) => {
          if (t !== 'video') return;
          const el = await ms.attachVideo(p.userId, 2);
          el.id = `remote-${p.userId}`;
          const container = remoteContainerRef.current;
          if (container) container.appendChild(el);
        });
        c.on('stream-removed', (p: any, t: string) => {
          if (t !== 'video') return;
          const container = remoteContainerRef.current;
          container?.querySelector(`#remote-${p.userId}`)?.remove();
        });
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, [sessionInfo, auth]);

  const toggleVideo = useCallback(async () => {
    if (!stream || !localVideoRef.current) return;
    if (isVideoOn) {
      await stream.stopVideo();
      setVideoOn(false);
    } else {
      await stream.startVideo({ videoElement: localVideoRef.current });
      setVideoOn(true);
    }
  }, [stream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!stream) return;
    if (isAudioOn) {
      await stream.stopAudio();
      setAudioOn(false);
    } else {
      await stream.startAudio();
      setAudioOn(true);
    }
  }, [stream, isAudioOn]);

  const leave = useCallback(async () => {
    if (!client) return;
    await client.leave();
    client.destroy();
    setClient(null);
    setStream(null);
    setSessionInfo(null);
  }, [client]);

  if (status === 'loading' || loading) return <p>Se încarcă sesiunea video...</p>;
  if (!auth?.user) return <p>Unauthorized</p>;
  if (!sessionId) return <p>ID sesiune invalid.</p>;
  if (!sessionInfo) return <p>Se pregătește sesiunea...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <div>
          <p className="font-medium">Client: {sessionInfo.client.name}</p>
          <p className="font-medium">Furnizor: {sessionInfo.provider.name}</p>
        </div>
        <p className="text-lg font-semibold">Timp rămas: {timeLeft}</p>
      </div>

      {/* afișare eroare */}
      {error && <p className="text-red-500">Eroare: {error}</p>}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Tu ({auth.user.name})</h3>
          <video
            ref={localVideoRef}
            className="w-full h-[350px] bg-black rounded"
            autoPlay
            playsInline
            muted
          />
          <div className="mt-2 flex space-x-2">
            <button onClick={toggleVideo} className="px-4 py-2 bg-blue-600 text-white rounded">
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button onClick={toggleAudio} className="px-4 py-2 bg-blue-600 text-white rounded">
              {isAudioOn ? 'Mute Microfon' : 'Unmute Microfon'}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Furnizor ({sessionInfo.provider.name})</h3>
          <div ref={remoteContainerRef} className="w-full h-[350px] bg-black rounded overflow-auto" />
        </div>
      </div>
      <button onClick={leave} className="px-4 py-2 bg-red-600 text-white rounded">
        Părăsește sesiunea
      </button>
    </div>
  );
}
