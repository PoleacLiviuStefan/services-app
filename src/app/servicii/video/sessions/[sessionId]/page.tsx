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
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);

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

  // Initialize Zoom
  useEffect(() => {
    if (!sessionInfo || !auth?.user) return;
    (async () => {
      try {
        // local camera preview
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          await localVideoRef.current.play();
        }

        const ZoomMod = await import('@zoom/videosdk');
        const ZoomVideo = (ZoomMod.default ?? ZoomMod) as any;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });

        // join(topic, signature, userName)
        console.log('Joining Zoom with topic:', sessionInfo.sessionName);
        await c.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name
        );

        setClient(c);
        const ms = c.getMediaStream();
        setStream(ms);

        // start sending audio/video
        await ms.startVideo({ videoElement: localVideoRef.current! });
        await ms.startAudio();
        setVideoOn(true);
        setAudioOn(true);

        // remote video
        c.on('stream-updated', async (payload: any, type: string) => {
          if (type === 'video' && remoteVideoRef.current) {
            await ms.renderVideo({ userId: payload.userId, tagId: remoteVideoRef.current.id });
          }
          if (type === 'audio' && remoteAudioRef.current) {
            const audioEl = await ms.attachAudio(payload.userId);
            remoteAudioRef.current.innerHTML = '';
            remoteAudioRef.current.appendChild(audioEl);
          }
        });

        c.on('stream-removed', (payload: any, type: string) => {
          if (type === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          if (type === 'audio' && remoteAudioRef.current) {
            remoteAudioRef.current.innerHTML = '';
          }
        });
      } catch (e: any) {
        console.error('Zoom init error:', e);
        setError(e.message);
      }
    })();
  }, [sessionInfo, auth, sessionId]);

  const toggleVideo = useCallback(async () => {
    if (!stream || !localVideoRef.current) return;
    try { isVideoOn ? await stream.stopVideo() : await stream.startVideo({ videoElement: localVideoRef.current! });
      setVideoOn(v => !v);
    } catch(e:any){ setError(e.message); }
  }, [stream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!stream) return;
    try { isAudioOn ? await stream.stopAudio() : await stream.startAudio();
      setAudioOn(a => !a);
    } catch(e:any){ setError(e.message); }
  }, [stream, isAudioOn]);

  const leave = useCallback(async () => {
    if (!client) return;
    await client.leave().catch(()=>{});
    client.destroy();
    setClient(null);
    setStream(null);
    setSessionInfo(null);
  }, [client]);

  if (status==='loading'||loading) return <p>Se încarcă sesiunea...</p>;
  if (!auth?.user) return <p>Unauthorized</p>;
  if (!sessionInfo) return <p>Se pregătește sesiunea...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between">
        <div><p>Client: {sessionInfo.client.name}</p><p>Furnizor: {sessionInfo.provider.name}</p></div>
        <p>Timp rămas: {timeLeft}</p>
      </div>
      {error && <p className="text-red-500">Eroare: {error}</p>}
      <div className="flex gap-4 h-80">
        <div className="flex-1 flex flex-col">
          <h3>Tu ({auth.user.name})</h3>
          <video ref={localVideoRef} id="local-video" className="flex-1 bg-black rounded object-cover" autoPlay playsInline muted />
          <div className="mt-2 flex space-x-2">
            <button onClick={toggleVideo} disabled={!stream} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow">
              {isVideoOn?'Oprește Video':'Pornește Video'}
            </button>
            <button onClick={toggleAudio} disabled={!stream} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow">
              {isAudioOn?'Mute Audio':'Unmute Audio'}
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <h3>Furnizor ({sessionInfo.provider.name})</h3>
          <video ref={remoteVideoRef} id="remote-video" className="flex-1 bg-black rounded object-cover" autoPlay playsInline />
          <div ref={remoteAudioRef} id="remote-audio" />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={leave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow">Părăsește sesiunea</button>
      </div>
    </div>
  );
}
