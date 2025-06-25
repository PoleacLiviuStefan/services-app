'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import ZoomVideo, { MediaStream, VideoClient } from '@zoom/videosdk';

interface SessionInfo {
  sessionName: string;
  token: string;
  userId: string;
  startDate: string;
  endDate: string;
  provider: { id: string; name: string };
  client: { id: string; name: string };
}

interface ZoomUser {
  userId: number | string;
  displayName: string;
  bVideoOn: boolean;
  bAudioOn: boolean;
  isHost?: boolean;
}

export default function VideoSessionPage() {
  const { data: auth, status } = useSession();
  const { sessionId } = useParams();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient] = useState<VideoClient | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [participants, setParticipants] = useState<ZoomUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [isMediaReady, setIsMediaReady] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  const activeRemoteVideo = useRef<string | null>(null);

  //
  // CLEANUP: make sure this is declared *before* any useEffect that references it
  //
  const cleanup = useCallback(async () => {
    console.log('🧹 Cleaning up...');
    if (mediaStream) {
      try {
        if (isVideoOn) await mediaStream.stopVideo();
        if (isAudioOn) await mediaStream.stopAudio();
      } catch (e) {
        console.warn('Cleanup media error:', e);
      }
    }

    if (client) {
      try {
        await client.leave();
        ZoomVideo.destroyClient();
      } catch (e) {
        console.warn('Cleanup client error:', e);
      }
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.innerHTML = '';

    activeRemoteVideo.current = null;
    setClient(null);
    setMediaStream(null);
    setVideoOn(false);
    setAudioOn(false);
    setParticipants([]);
    setConnectionStatus('disconnected');
    setIsMediaReady(false);
  }, [client, mediaStream, isVideoOn, isAudioOn]);

  //
  // 1) FETCH session info
  //
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

  //
  // 2) COUNTDOWN timer
  //
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

  //
  // HANDLERS for remote media
  //
  const handleRemoteVideo = useCallback(
    async (userId: string, action: 'start' | 'stop') => {
      if (!mediaStream || !remoteVideoRef.current) return;
      try {
        if (action === 'start') {
          // stop any previous
          if (activeRemoteVideo.current && activeRemoteVideo.current !== userId) {
            await mediaStream.stopRenderVideo(remoteVideoRef.current, activeRemoteVideo.current);
          }
          await mediaStream.renderVideo(remoteVideoRef.current, userId);
          activeRemoteVideo.current = userId;
        } else if (activeRemoteVideo.current === userId) {
          await mediaStream.stopRenderVideo(remoteVideoRef.current, userId);
          remoteVideoRef.current.srcObject = null;
          activeRemoteVideo.current = null;
        }
      } catch (e) {
        console.error('Remote video error', e);
      }
    },
    [mediaStream]
  );

  const handleRemoteAudio = useCallback(
    async (userId: string, action: 'start' | 'stop') => {
      if (!mediaStream || !remoteAudioRef.current) return;
      try {
        if (action === 'start') {
          // avoid duplicates
          if (!remoteAudioRef.current.querySelector(`#remote-audio-${userId}`)) {
            const audioEl = await mediaStream.attachAudio(userId);
            if (audioEl) {
              audioEl.id = `remote-audio-${userId}`;
              remoteAudioRef.current.appendChild(audioEl);
            }
          }
        } else {
          const existing = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
          if (existing) existing.remove();
        }
      } catch (e) {
        console.error('Remote audio error', e);
      }
    },
    [mediaStream]
  );

  const updateParticipants = useCallback(() => {
    if (!client) return;
    try {
      const all = client.getAllUser();
      const me = client.getCurrentUserInfo()?.userId?.toString();
      setParticipants(all);

      const others = all.filter(u => u.userId.toString() !== me);
      if (others[0]) {
        const u = others[0];
        if (u.bVideoOn) handleRemoteVideo(u.userId.toString(), 'start');
        if (u.bAudioOn) handleRemoteAudio(u.userId.toString(), 'start');
      }
    } catch (e) {
      console.error('Error updating participants', e);
    }
  }, [client, handleRemoteVideo, handleRemoteAudio]);

  //
  // 3) ZOOM initialization
  //
  useEffect(() => {
    if (!sessionInfo || !auth?.user || initializationRef.current) return;
    initializationRef.current = true;

    (async () => {
      try {
        setConnectionStatus('connecting');
        const zmClient = ZoomVideo.createClient();
        await zmClient.init('en-US', 'Global', { patchJsMedia: true });
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || 'Unknown',
          ''
        );
        setClient(zmClient);
        setConnectionStatus('connected');

        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Listeners
        zmClient.on('user-added', () => setTimeout(updateParticipants, 500));
        zmClient.on('user-removed', ({ userId }) => {
          handleRemoteVideo(userId.toString(), 'stop');
          handleRemoteAudio(userId.toString(), 'stop');
          setTimeout(updateParticipants, 500);
        });
        zmClient.on('peer-video-state-change', ({ userId, action }) => {
          setTimeout(() => {
            handleRemoteVideo(userId.toString(), action === 'Start' ? 'start' : 'stop');
            setTimeout(updateParticipants, 500);
          }, action === 'Start' ? 2000 : 0);
        });
        zmClient.on('peer-audio-state-change', ({ userId, action }) => {
          setTimeout(() => {
            handleRemoteAudio(userId.toString(), action === 'Start' ? 'start' : 'stop');
            setTimeout(updateParticipants, 500);
          }, 500);
        });
        zmClient.on('connection-change', ({ state }) => state && setConnectionStatus(state));

        // Start local video
        try {
          const tempV = document.createElement('video');
          tempV.muted = true;
          tempV.playsInline = true;
          await ms.startVideo({ videoElement: tempV });
          if (tempV.srcObject && localVideoRef.current) {
            localVideoRef.current.srcObject = tempV.srcObject;
            setVideoOn(true);
          }
        } catch {}

        // Start audio
        try {
          await ms.startAudio();
          setAudioOn(true);
        } catch {}

        setIsMediaReady(true);
        setTimeout(updateParticipants, 1000);
      } catch (e: any) {
        console.error('Zoom init error', e);
        setError(`Eroare la conectare: ${e.message}`);
        setConnectionStatus('failed');
        initializationRef.current = false;
      }
    })();

    return () => {
      cleanup();
    };
  }, [
    sessionInfo,
    auth,
    updateParticipants,
    handleRemoteVideo,
    handleRemoteAudio,
    cleanup,
  ]);

  //
  // TOGGLES, LEAVE & DEBUG
  //
  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !localVideoRef.current) return;
    try {
      if (isVideoOn) {
        await mediaStream.stopVideo();
        localVideoRef.current.srcObject = null;
        setVideoOn(false);
      } else {
        const tempV = document.createElement('video');
        tempV.muted = true;
        tempV.playsInline = true;
        await mediaStream.startVideo({ videoElement: tempV });
        if (tempV.srcObject) localVideoRef.current.srcObject = tempV.srcObject;
        setVideoOn(true);
      }
    } catch (e: any) {
      setError(`Video error: ${e.message}`);
    }
  }, [mediaStream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!mediaStream) return;
    try {
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
      } else {
        await mediaStream.startAudio();
        setAudioOn(true);
      }
    } catch (e: any) {
      setError(`Audio error: ${e.message}`);
    }
  }, [mediaStream, isAudioOn]);

  const leave = useCallback(async () => {
    await cleanup();
    window.location.href = '/dashboard';
  }, [cleanup]);

  const debugInfo = useCallback(() => {
    if (!client) return;
    console.log('🔍 DEBUG:', {
      connectionStatus,
      isMediaReady,
      participants: client.getAllUser(),
      me: client.getCurrentUserInfo(),
      localVideoOn: isVideoOn,
      localAudioOn: isAudioOn,
      activeRemoteVideo: activeRemoteVideo.current,
    });
  }, [
    client,
    connectionStatus,
    isMediaReady,
    isVideoOn,
    isAudioOn,
  ]);

  //
  // RENDER
  //
  const isProvider = sessionInfo?.provider.id === auth?.user?.id;
  const other = isProvider ? sessionInfo?.client : sessionInfo?.provider;
  const meId = client?.getCurrentUserInfo()?.userId.toString();
  const remote = participants.filter(p => p.userId.toString() !== meId);

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64">Se încarcă sesiunea...</div>;
  }
  if (!auth?.user) {
    return <div className="text-red-500">Acces neautorizat</div>;
  }
  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        <p className="font-semibold">Eroare:</p>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
          Reîncarcă pagina
        </button>
      </div>
    );
  }
  if (!sessionInfo) {
    return <div className="flex items-center justify-center h-64">Se pregătește sesiunea...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between">
        <div>
          <h2 className="text-xl font-bold">Sesiune Video</h2>
          <p><strong>Client:</strong> {sessionInfo.client.name}</p>
          <p><strong>Furnizor:</strong> {sessionInfo.provider.name}</p>
          <div className="mt-1">
            <span>Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected'
                ? 'Conectat'
                : connectionStatus === 'connecting'
                ? 'Se conectează...'
                : 'Deconectat'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">⏰ {timeLeft}</p>
          <p className="text-sm text-gray-600">
            {new Date(sessionInfo.startDate).toLocaleTimeString()} – {new Date(sessionInfo.endDate).toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-500">
            Participanți: {participants.length} | Conectați: {remote.filter(p => p.bVideoOn || p.bAudioOn).length + 1}
          </p>
        </div>
      </div>

      {/* VIDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">📹 Tu ({auth.user.name}) <span className="text-sm text-gray-600">{isProvider ? '(Furnizor)' : '(Client)'}</span></h3>
            <div className="flex gap-2">
              <span className={`w-3 h-3 rounded-full ${isVideoOn ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`w-3 h-3 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <button onClick={toggleVideo} disabled={!isMediaReady || connectionStatus!=='connected'} className={`flex-1 px-4 py-2 rounded-lg text-white ${isVideoOn ? 'bg-red-600' : 'bg-green-600'}`}>
              {isVideoOn ? '📹 Oprește Video' : '📹 Pornește Video'}
            </button>
            <button onClick={toggleAudio} disabled={!isMediaReady || connectionStatus!=='connected'} className={`flex-1 px-4 py-2 rounded-lg text-white ${isAudioOn ? 'bg-red-600' : 'bg-green-600'}`}>
              {isAudioOn ? '🔇 Mute' : '🔊 Unmute'}
            </button>
          </div>
        </div>

        {/* Remote */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">👤 {other?.name || 'Participant'} <span className="text-sm text-gray-600">{isProvider ? '(Client)' : '(Furnizor)'}</span></h3>
            {remote[0] && (
              <div className="flex gap-2">
                <span className={`w-3 h-3 rounded-full ${remote[0].bVideoOn ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`w-3 h-3 rounded-full ${remote[0].bAudioOn ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            )}
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
            {remote.length === 0 ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">⏳</div>
                <p>Așteptăm ca {other?.name} să se conecteze…</p>
              </div>
            ) : !remote[0].bVideoOn ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📹</div>
                <p>{remote[0].displayName} nu și-a pornit camera</p>
              </div>
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={debugInfo} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">🔍 Debug Info</button>
          <span className="text-sm text-gray-500 self-center">Sesiune ID: {sessionId}</span>
        </div>
        <button onClick={leave} className="px-6 py-2 bg-red-600 text-white rounded-lg">🚪 Părăsește sesiunea</button>
      </div>

      {/* Hidden audio */}
      <div ref={remoteAudioRef} className="hidden" />
    </div>
  );
}
