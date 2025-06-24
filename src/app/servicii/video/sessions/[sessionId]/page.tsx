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
  const { sessionId } = useParams();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient]           = useState<any>(null);
  const [stream, setStream]           = useState<any>(null);
  const [isVideoOn, setVideoOn]       = useState(false);
  const [isAudioOn, setAudioOn]       = useState(false);
  const [error, setError]             = useState<string>('');
  const [loading, setLoading]         = useState(false);
  const [timeLeft, setTimeLeft]       = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteRef     = useRef<HTMLDivElement>(null);

  // Fetch session info
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/video/session-info/${sessionId}`)
      .then(res => res.json().then(data => {
        if (!res.ok) throw new Error(data.error || res.statusText);
        setSessionInfo(data);
      }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Countdown
  useEffect(() => {
    if (!sessionInfo?.endDate) return;
    const interval = setInterval(() => {
      const diff = new Date(sessionInfo.endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('00:00'); clearInterval(interval); return; }
      const m = String(Math.floor(diff / 60000)).padStart(2,'0');
      const s = String(Math.floor((diff % 60000)/1000)).padStart(2,'0');
      setTimeLeft(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo]);

  // Initialize Zoom
  useEffect(() => {
    if (!sessionInfo || !auth?.user) return;
    (async () => {
      try {
        // Local preview
        const raw = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = raw;
          await localVideoRef.current.play();
        }

        const ZoomMod = await import('@zoom/videosdk');
        const ZoomVideo = (ZoomMod.default ?? ZoomMod) as any;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });

        // Join Zoom session: signature (JWT), sessionName (topic), userName
        await c.join(
          sessionInfo.sessionName, // topic (must be <200 chars)
          sessionInfo.token,       // signature (JWT)
          auth.user.name || sessionInfo.userId // userName
         || sessionInfo.userId
        );

        setClient(c);
        const ms = c.getMediaStream();
        setStream(ms);

        // Remove preview
        if (localVideoRef.current) localVideoRef.current.srcObject = null;

        // Start video & audio
        await ms.startVideo({ videoElement: localVideoRef.current! });
        setVideoOn(true);
        await ms.startAudio();
        setAudioOn(true);

        // Remote streams
        c.on('stream-updated', async (p:any, t:string) => {
          if (t !== 'video') return;
          const el = await ms.attachVideo(p.userId, 2);
          el.id = `remote-${p.userId}`;
          remoteRef.current?.appendChild(el);
        });
        c.on('stream-removed', (p:any, t:string) => {
          if (t !== 'video') return;
          remoteRef.current?.querySelector(`#remote-${p.userId}`)?.remove();
        });
      } catch (e:any) {
        console.error('Zoom init error:', e);
        setError(e.message);
      }
    })();
  }, [sessionInfo, auth]);

  const toggleVideo = useCallback(async () => {
    if (!stream) return;
    try {
      if (isVideoOn) await stream.stopVideo();
      else await stream.startVideo({ videoElement: localVideoRef.current! });
      setVideoOn(v => !v);
    } catch(e:any) { setError(e.message); }
  }, [stream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!stream) return;
    try {
      if (isAudioOn) await stream.stopAudio();
      else await stream.startAudio();
      setAudioOn(a => !a);
    } catch(e:any) { setError(e.message); }
  }, [stream, isAudioOn]);

  const leave = useCallback(async () => {
    if (!client) return;
    await client.leave().catch(()=>{});
    client.destroy();
    setClient(null);
    setStream(null);
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

      <div className="flex gap-4">
        <div className="flex-1">
          <h3>Tu ({auth.user.name})</h3>
          <video ref={localVideoRef} className="w-full h-80 bg-black rounded" autoPlay playsInline muted />
          <div className="mt-2 flex gap-2">
            <button onClick={toggleVideo} disabled={!stream} className="btn">
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button onClick={toggleAudio} disabled={!stream} className="btn">
              {isAudioOn ? 'Mute Microfon' : 'Unmute Microfon'}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <h3>Furnizor ({sessionInfo.provider.name})</h3>
          <div ref={remoteRef} className="w-full h-80 bg-black rounded overflow-auto" />
        </div>
      </div>
      <button onClick={leave} className="btn btn-red">Părăsește sesiunea</button>
    </div>
  );
}
