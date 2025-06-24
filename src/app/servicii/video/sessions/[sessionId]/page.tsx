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
        // Local preview
        const raw = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = raw;
          await localVideoRef.current.play();
        }

        const ZoomMod = await import('@zoom/videosdk');
        const ZoomVideo = (ZoomMod.default ?? ZoomMod) as any;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });

        // Join Zoom session: signature, topic, userName
        // Correct join order: topic (sessionName), signature (token), userName
        console.log('Joining Zoom with topic:', sessionInfo.sessionName, 'token:', sessionInfo.token, 'user:', auth.user.name);
        await c.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name
        );

        setClient(c);
        const ms = c.getMediaStream();
        setStream(ms);

        // Remove local preview once Zoom stream starts
        if (localVideoRef.current) localVideoRef.current.srcObject = null;

        // Retry helper for camera
        const retryStartVideo = async (attempts = 5, delay = 500) => {
          for (let i = 0; i < attempts; i++) {
            try {
              await ms.startVideo({ videoElement: localVideoRef.current! });
              return;
            } catch (err: any) {
              if (err.errorCode === 6105 && i < attempts - 1) {
                await new Promise(res => setTimeout(res, delay));
                continue;
              }
              throw err;
            }
          }
        };

        await retryStartVideo();
        setVideoOn(true);

        // Remote streams: attach video and audio
        c.on('stream-updated', async (payload: any, type: string) => {
          if (type === 'video' && remoteVideoRef.current) {
            const el = await ms.attachVideo(payload.userId, 2);
            remoteVideoRef.current.srcObject = el.srcObject;
          }
          if (type === 'audio') {
            const audioEl = await ms.attachAudio(payload.userId);
            audioEl.id = `remote-audio-${payload.userId}`;
            document.body.appendChild(audioEl);
            setAudioOn(true);
          }
        });

        c.on('stream-removed', (payload: any, type: string) => {
          if (type === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          if (type === 'audio') {
            const audioEl = document.getElementById(`remote-audio-${payload.userId}`);
            audioEl?.remove();
            setAudioOn(false);
          }
        });
      } catch (e: any) {
        console.error('Zoom init error:', e);
        setError(e.message);
      }
    })();
  }, [sessionInfo, auth, sessionId]);

  // Toggle local video
  const toggleVideo = useCallback(async () => {
    if (!stream || !localVideoRef.current) return;
    try {
      if (isVideoOn) await stream.stopVideo();
      else await stream.startVideo({ videoElement: localVideoRef.current });
      setVideoOn(v => !v);
    } catch (e: any) {
      setError(e.message);
    }
  }, [stream, isVideoOn]);

  // Toggle remote audio mute
  const toggleAudio = useCallback(() => {
    document.querySelectorAll('audio#remote-audio').forEach((audio: HTMLAudioElement) => {
      audio.muted = !audio.muted;
    });
    setAudioOn(a => !a);
  }, []);

  // Leave session
  const leave = useCallback(async () => {
    if (!client) return;
    await client.leave().catch(() => {});
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
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p>Client: {sessionInfo.client.name}</p>
          <p>Furnizor: {sessionInfo.provider.name}</p>
        </div>
        <p>Timp rămas: {timeLeft}</p>
      </div>

      {/* Error */}
      {error && <p className="text-red-500">Eroare: {error}</p>}

      {/* Video Panels */}
      <div className="flex gap-4 h-80">
        {/* Local Video */}
        <div className="flex-1 flex flex-col">
          <h3>Tu ({auth.user.name})</h3>
          <video
            ref={localVideoRef}
            className="flex-1 bg-black rounded object-cover"
            autoPlay
            playsInline
            muted
          />
          <div className="mt-2 flex space-x-2">
            <button
              onClick={toggleVideo}
              disabled={!stream}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
            >
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button
              onClick={toggleAudio}
              disabled={!stream}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow"
            >
              {isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
            </button>
          </div>
        </div>

        {/* Remote Video */}
        <div className="flex-1 flex flex-col">
          <h3>Furnizor ({sessionInfo.provider.name})</h3>
          <video
            ref={remoteVideoRef}
            className="flex-1 bg-black rounded object-cover"
            autoPlay
            playsInline
          />
        </div>
      </div>

      {/* Leave Button */}
      <div className="flex justify-end">
        <button
          onClick={leave}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow"
        >
          Părăsește sesiunea
        </button>
      </div>
    </div>
  );
}
