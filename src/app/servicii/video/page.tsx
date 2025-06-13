// File: components/VideoSessionPage.tsx

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ZoomClient, ZoomMediaStream, ZoomVideoSDK, Participant } from '@zoom/videosdk';

interface SessionInfo {
  sessionName: string;
  token: string;
  userId: string;
}

export default function VideoSessionPage() {
  const { data: auth, status } = useSession();
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient] = useState<ZoomClient | null>(null);
  const [stream, setStream] = useState<ZoomMediaStream | null>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Extract consultingSessionId from URL
  const { pathname } = useRouter();
  const match = pathname.match(/sessions\/(.+)$/);
  const sessionId = match ? match[1] : null;

  // Fetch Zoom credentials for this session
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/consulting-sessions/${sessionId}/zoom-credentials`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      // data = { sessionName, token, userId }
      setSessionInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initialize Zoom SDK when sessionInfo arrives
  useEffect(() => {
    if (!sessionInfo) return;
    (async () => {
      try {
        const ZoomMod = (await import('@zoom/videosdk')) as { default?: ZoomVideoSDK } & ZoomVideoSDK;
        const ZoomVideo = ZoomMod.default ?? ZoomMod;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });
        await c.join(sessionInfo.sessionName, sessionInfo.token, sessionInfo.userId);
        setClient(c);

        const ms = c.getMediaStream();
        setStream(ms);

        const localEl = document.getElementById('local-video') as HTMLVideoElement;
        if (ms.isRenderSelfViewWithVideoElement?.()) {
          await ms.startVideo({ videoElement: localEl });
        } else {
          await ms.startVideo();
          const vaulted = await ms.attachVideo(sessionInfo.userId, 2);
          localEl.replaceWith(vaulted);
        }
        setVideoOn(true);

        await ms.startAudio();
        setAudioOn(true);

        c.on('stream-updated', async (participant: Participant, type) => {
          if (type !== 'video') return;
          const remote = await ms.attachVideo(participant.userId, 2);
          remote.id = `remote-${participant.userId}`;
          document.getElementById('remote-videos')?.appendChild(remote);
        });
        c.on('stream-removed', (participant: Participant, type) => {
          if (type !== 'video') return;
          document.getElementById(`remote-${participant.userId}`)?.remove();
        });
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [sessionInfo]);

  const joinSession = useCallback(() => {
    if (!sessionInfo) fetchSession();
  }, [sessionInfo, fetchSession]);

  const toggleVideo = useCallback(async () => {
    if (!stream) return;
    try {
      if (isVideoOn) {
        await stream.stopVideo();
        setVideoOn(false);
      } else {
        const localEl = document.getElementById('local-video') as HTMLVideoElement;
        if (stream.isRenderSelfViewWithVideoElement?.()) {
          await stream.startVideo({ videoElement: localEl });
        } else {
          await stream.startVideo();
          const attached = await stream.attachVideo(sessionInfo!.userId, 2);
          localEl.replaceWith(attached);
        }
        setVideoOn(true);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [stream, isVideoOn, sessionInfo]);

  const toggleAudio = useCallback(async () => {
    if (!stream) return;
    try {
      if (isAudioOn) {
        await stream.stopAudio();
        setAudioOn(false);
      } else {
        await stream.startAudio();
        setAudioOn(true);
      }
    } catch {}
  }, [stream, isAudioOn]);

  const leaveSession = useCallback(async () => {
    if (!client) return;
    await client.leave();
    client.destroy();
    setClient(null);
    setSessionInfo(null);
  }, [client]);

  // Render
  if (status === 'loading' || loading) return <p>Se încarcă...</p>;
  if (!auth?.user) return <p>Unauthorized</p>;

  return (
    <div className="p-6">
      {error && <p className="text-red-500">{error}</p>}
      {!sessionInfo ? (
        <button
          onClick={joinSession}
          className="px-4 py-2 bg-primaryColor text-white rounded"
        >
          Intră în sesiunea Zoom
        </button>
      ) : (
        <>
          <div className="space-x-4 mb-4">
            <button onClick={toggleVideo} className="px-3 py-1 bg-gray-200 rounded">
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button onClick={toggleAudio} className="px-3 py-1 bg-gray-200 rounded">
              {isAudioOn ? 'Dezactivează Microfon' : 'Activează Microfon'}
            </button>
            <button onClick={leaveSession} className="px-3 py-1 bg-red-500 text-white rounded">
              Părăsește sesiunea
            </button>
          </div>
          <div className="flex gap-6">
            <div>
              <h3 className="font-semibold">Self-view</h3>
              <video
                id="local-video"
                width={320}
                height={240}
                autoPlay
                playsInline
                muted
                className="bg-black object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold">Remote-view</h3>
              <div id="remote-videos" className="bg-black w-[320px] h-[240px] overflow-auto" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
