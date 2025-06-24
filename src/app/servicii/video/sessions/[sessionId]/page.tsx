// File: app/(protected)/video/[sessionId]/page.tsx

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import ZoomVideo, { MediaStream } from '@zoom/videosdk';

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
  const { sessionId } = useParams();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const localContainerRef = useRef<HTMLDivElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);

  // Fetch session info
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/video/session-info/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.sessionName) throw new Error(data.error || 'Invalid session');
        setSessionInfo(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!sessionInfo?.endDate) return;
    const interval = setInterval(() => {
      const diff = new Date(sessionInfo.endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
        return;
      }
      const m = String(Math.floor(diff / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo]);

  // Initialize and join Zoom session
  useEffect(() => {
    if (!sessionInfo || !auth?.user) return;
    (async () => {
      try {
        const zmClient = ZoomVideo.createClient();
        await zmClient.init('en-US', 'Global', { patchJsMedia: true });
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name,
          ''
        );
        setClient(zmClient);

        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Local video preview
        if (localContainerRef.current) {
          const videoEl = document.createElement('video');
          videoEl.muted = true;
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          localContainerRef.current.innerHTML = '';
          localContainerRef.current.appendChild(videoEl);
          await ms.startVideo({ videoElement: videoEl });
          setVideoOn(true);
        }

        // Start audio
        await ms.startAudio();
        setAudioOn(true);

        // Remote streams
        zmClient.on('stream-updated', async (payload: any, track: string) => {
          if (track === 'video' && remoteContainerRef.current) {
            const { userId } = payload;
            const videoEl = document.createElement('video');
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            remoteContainerRef.current.innerHTML = '';
            remoteContainerRef.current.appendChild(videoEl);
            await ms.renderVideo({ userId, videoElement: videoEl });
          }
        });

        zmClient.on('stream-removed', (_payload: any, track: string) => {
          if (track === 'video' && remoteContainerRef.current) {
            remoteContainerRef.current.innerHTML = '';
          }
        });

      } catch (e: any) {
        console.error('Zoom init error:', e);
        setError(e.message);
      }
    })();
  }, [sessionInfo, auth]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !localContainerRef.current) return;
    try {
      if (isVideoOn) {
        await mediaStream.stopVideo();
      } else {
        const videoEl = localContainerRef.current.querySelector('video');
        if (videoEl) {
          await mediaStream.startVideo({ videoElement: videoEl });
        }
      }
      setVideoOn(v => !v);
    } catch (e: any) {
      setError(e.message);
    }
  }, [mediaStream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!mediaStream) return;
    try {
      if (isAudioOn) await mediaStream.stopAudio();
      else await mediaStream.startAudio();
      setAudioOn(a => !a);
    } catch (e: any) {
      setError(e.message);
    }
  }, [mediaStream, isAudioOn]);

  const leave = useCallback(async () => {
    if (!client) return;
    await client.leave().catch(() => {});
    client.destroy();
    setClient(null);
    setMediaStream(null);
    setSessionInfo(null);
  }, [client]);

  if (status === 'loading' || loading) return <p>Se încarcă sesiunea...</p>;
  if (!auth?.user) return <p>Unauthorized</p>;
  if (!sessionInfo) return <p>Se pregătește sesiunea...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between">
        <div>
          <p>Client: {sessionInfo.client.name}</p>
          <p>Furnizor: {sessionInfo.provider.name}</p>
        </div>
        <p>Timp rămas: {timeLeft}</p>
      </div>
      {error && <p className="text-red-500">Eroare: {error}</p>}
      <div className="flex gap-4 h-80">
        <div className="flex-1 flex flex-col">
          <h3>Tu ({auth.user.name})</h3>
          <div ref={localContainerRef} className="flex-1 bg-black rounded overflow-hidden" />
          <div className="mt-2 flex space-x-2">
            <button onClick={toggleVideo} disabled={!mediaStream} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow">
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button onClick={toggleAudio} disabled={!mediaStream} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow">
              {isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <h3>Furnizor ({sessionInfo.provider.name})</h3>
          <div ref={remoteContainerRef} className="flex-1 bg-black rounded overflow-hidden" />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={leave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow">
          Părăsește sesiunea
        </button>
      </div>
    </div>
  );
}
