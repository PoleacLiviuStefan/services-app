'use client';

import { useEffect, useState, useCallback } from 'react';
import type {
  ZoomClient,
  ZoomMediaStream,
  ZoomVideoSDK,
  Participant,
} from '@zoom/videosdk';

// --- Session Info -----------------------------
interface SessionInfo {
  sessionName: string;
  token:       string;
  userId:      string;
}

export default function VideoSessionPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [client, setClient]   = useState<ZoomClient | null>(null);
  const [stream, setStream]   = useState<ZoomMediaStream | null>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError]       = useState<string>('');

  // Create session for two users ('alice' and 'bob')
  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/video/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: ['furnizor', 'client'] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setSession({ sessionName: data.sessionName, token: data.tokens.alice, userId: 'alice' });
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Initialize SDK and join session
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        // Optional: if TensorFlow.js is loaded, force CPU backend to avoid WebGL errors
        if (typeof (window as any).tf !== 'undefined') {
          (window as any).tf.setBackend('cpu').catch(() => {});
        }

        const ZoomMod = (await import('@zoom/videosdk')) as { default?: ZoomVideoSDK } & ZoomVideoSDK;
        const ZoomVideo = ZoomMod.default ?? ZoomMod;
        const c = ZoomVideo.createClient();
        await c.init('en-US', 'Global', { patchJsMedia: true });
        await c.join(session.sessionName, session.token, session.userId);
        setClient(c);

        const ms = c.getMediaStream();
        setStream(ms);

        // Start local video using recommended API
        const localVideoEl = document.getElementById('local-video') as HTMLVideoElement;
        try {
          if (ms.isRenderSelfViewWithVideoElement?.()) {
            await ms.startVideo({ videoElement: localVideoEl });
          } else {
            await ms.startVideo();
            const actual = await ms.attachVideo(session.userId, 2);
            localVideoEl.replaceWith(actual);
          }
          setVideoOn(true);
        } catch (err: any) {
          setError(err.name === 'NotAllowedError'
            ? 'Permisiune cameră refuzată.'
            : `Eroare cameră: ${err.message}`);
          return;
        }

        // Start local audio
        try {
          await ms.startAudio();
          setAudioOn(true);
        } catch {
          // ignore audio errors
        }

        // Handle remote video streams
        c.on('stream-updated', async (participant: Participant, type) => {
          if (type !== 'video') return;
          try {
            const remoteEl = await ms.attachVideo(participant.userId, 2);
            remoteEl.id = `remote-${participant.userId}`;
            document.getElementById('remote-videos')?.appendChild(remoteEl);
          } catch {
            // ignore
          }
        });

        c.on('stream-removed', (participant: Participant, type) => {
          if (type !== 'video') return;
          document.getElementById(`remote-${participant.userId}`)?.remove();
        });
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [session]);

  // Toggle video on/off
  const toggleVideo = useCallback(async () => {
    if (!stream || !session) return;
    try {
      const localVideoEl = document.getElementById('local-video') as HTMLVideoElement;
      if (isVideoOn) {
        await stream.stopVideo();
        setVideoOn(false);
      } else {
        if (stream.isRenderSelfViewWithVideoElement?.()) {
          await stream.startVideo({ videoElement: localVideoEl });
        } else {
          await stream.startVideo();
          const actual = await stream.attachVideo(session.userId, 2);
          localVideoEl.replaceWith(actual);
        }
        setVideoOn(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [stream, isVideoOn, session]);

  // Toggle audio on/off
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
    } catch (err: any) {
      setError(err.message);
    }
  }, [stream, isAudioOn]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!client) return;
    await client.leave();
    client.destroy();
    setClient(null);
    setSession(null);
  }, [client]);

  return (
    <div style={{ padding: 16 }}>
      {error && <pre style={{ color: 'red' }}>{error}</pre>}
      {!session ? (
        <button onClick={createSession}>
          Creează &amp; intră într-o sesiune cu 2 useri
        </button>
      ) : (
        <>
          <div style={{ margin: '1rem 0' }}>
            <button onClick={toggleVideo}>
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button onClick={toggleAudio} style={{ marginLeft: 8 }}>
              {isAudioOn ? 'Dezactivează Microfon' : 'Activează Microfon'}
            </button>
            <button onClick={leaveSession} style={{ marginLeft: 8 }}>
              Părăsește sesiunea
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <h3>Self-view</h3>
              <video
                id="local-video"
                width={320}
                height={240}
                autoPlay
                playsInline
                muted
                style={{ backgroundColor: '#000', objectFit: 'cover' }}
              />
            </div>
            <div>
              <h3>Remote-view</h3>
              <div
                id="remote-videos"
                style={{ width: 320, height: 240, backgroundColor: '#000', overflow: 'auto' }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
