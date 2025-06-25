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
  userId: string;
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);

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

  // Clean up function
  const cleanup = useCallback(async () => {
    console.log('🧹 Starting cleanup...');
    
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
    
    // Clear refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.innerHTML = '';
    }
    
    setClient(null);
    setMediaStream(null);
    setVideoOn(false);
    setAudioOn(false);
    setParticipants([]);
    setConnectionStatus('disconnected');
  }, [client, mediaStream, isVideoOn, isAudioOn]);

  // Handle remote user video
  const handleRemoteVideo = useCallback(async (userId: string, action: 'start' | 'stop') => {
    if (!mediaStream || !remoteVideoRef.current) return;
    
    try {
      if (action === 'start') {
        console.log('🎥 Starting remote video for:', userId);
        await mediaStream.renderVideo(remoteVideoRef.current, userId);
        console.log('✅ Remote video rendered successfully');
      } else {
        console.log('🎥 Stopping remote video for:', userId);
        await mediaStream.stopRenderVideo(remoteVideoRef.current, userId);
        remoteVideoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('❌ Remote video error:', error);
    }
  }, [mediaStream]);

  // Handle remote user audio
  const handleRemoteAudio = useCallback(async (userId: string, action: 'start' | 'stop') => {
    if (!mediaStream || !remoteAudioRef.current) return;
    
    try {
      if (action === 'start') {
        console.log('🔊 Starting remote audio for:', userId);
        const audioElement = await mediaStream.attachAudio(userId);
        if (audioElement) {
          audioElement.id = `remote-audio-${userId}`;
          remoteAudioRef.current.appendChild(audioElement);
          console.log('✅ Remote audio attached successfully');
        }
      } else {
        console.log('🔊 Stopping remote audio for:', userId);
        const audioElement = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
        if (audioElement) {
          audioElement.remove();
        }
      }
    } catch (error) {
      console.error('❌ Remote audio error:', error);
    }
  }, [mediaStream]);

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!client) return;
    
    try {
      const allUsers = client.getAllUser();
      const currentUserId = client.getCurrentUserInfo()?.userId;
      
      console.log('👥 Updating participants:', {
        total: allUsers.length,
        currentUser: currentUserId
      });
      
      setParticipants(allUsers);
      
      // Handle remote video/audio for other participants
      const remoteUsers = allUsers.filter((user: ZoomUser) => user.userId !== currentUserId);
      remoteUsers.forEach((user: ZoomUser) => {
        if (user.bVideoOn) {
          handleRemoteVideo(user.userId, 'start');
        }
        if (user.bAudioOn) {
          handleRemoteAudio(user.userId, 'start');
        }
      });
      
    } catch (error) {
      console.error('❌ Error updating participants:', error);
    }
  }, [client, handleRemoteVideo, handleRemoteAudio]);

  // Initialize Zoom session
  useEffect(() => {
    if (!sessionInfo || !auth?.user || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const initializeZoom = async () => {
      try {
        console.log('🚀 Initializing Zoom session...');
        setConnectionStatus('connecting');
        
        // Create and initialize client
        const zmClient = ZoomVideo.createClient();
        await zmClient.init('en-US', 'Global', { patchJsMedia: true });
        
        // Join session
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || 'Unknown User',
          ''
        );
        
        console.log('✅ Successfully joined Zoom session');
        setClient(zmClient);
        setConnectionStatus('connected');
        
        const ms = zmClient.getMediaStream();
        setMediaStream(ms);
        
        // Start local video
        if (localVideoRef.current) {
          try {
            await ms.startVideo({ videoElement: localVideoRef.current });
            setVideoOn(true);
            console.log('✅ Local video started');
          } catch (videoError) {
            console.warn('⚠️ Local video failed:', videoError);
          }
        }
        
        // Start audio
        try {
          await ms.startAudio();
          setAudioOn(true);
          console.log('✅ Audio started');
        } catch (audioError) {
          console.warn('⚠️ Audio failed:', audioError);
        }
        
        // Set up event listeners
        zmClient.on('user-added', (payload: any) => {
          console.log('👤 User added:', payload);
          setTimeout(updateParticipants, 500);
        });
        
        zmClient.on('user-removed', (payload: any) => {
          console.log('👤 User removed:', payload);
          const { userId } = payload;
          
          // Clean up remote media
          if (remoteVideoRef.current) {
            handleRemoteVideo(userId, 'stop');
          }
          if (remoteAudioRef.current) {
            const audioEl = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
            if (audioEl) audioEl.remove();
          }
          
          updateParticipants();
        });
        
        zmClient.on('peer-video-state-change', (payload: any) => {
          console.log('🎥 Peer video state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start') {
            setTimeout(() => handleRemoteVideo(userId, 'start'), 300);
          } else if (action === 'Stop') {
            handleRemoteVideo(userId, 'stop');
          }
          
          updateParticipants();
        });
        
        zmClient.on('peer-audio-state-change', (payload: any) => {
          console.log('🔊 Peer audio state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start') {
            setTimeout(() => handleRemoteAudio(userId, 'start'), 300);
          } else if (action === 'Stop') {
            handleRemoteAudio(userId, 'stop');
          }
          
          updateParticipants();
        });
        
        zmClient.on('connection-change', (payload: any) => {
          console.log('🌐 Connection change:', payload);
          setConnectionStatus(payload.state || 'connected');
        });
        
        // Initial participant update
        setTimeout(updateParticipants, 1000);
        
      } catch (error: any) {
        console.error('❌ Zoom initialization error:', error);
        setError(`Eroare la conectarea la sesiune: ${error.message}`);
        setConnectionStatus('failed');
        initializationRef.current = false;
      }
    };
    
    initializeZoom();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [sessionInfo, auth, updateParticipants, handleRemoteVideo, handleRemoteAudio, cleanup]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !localVideoRef.current) return;
    
    try {
      if (isVideoOn) {
        await mediaStream.stopVideo();
        setVideoOn(false);
        console.log('📹 Video stopped');
      } else {
        await mediaStream.startVideo({ videoElement: localVideoRef.current });
        setVideoOn(true);
        console.log('📹 Video started');
      }
    } catch (error: any) {
      console.error('❌ Toggle video error:', error);
      setError(`Eroare video: ${error.message}`);
    }
  }, [mediaStream, isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (!mediaStream) return;
    
    try {
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
        console.log('🔇 Audio muted');
      } else {
        await mediaStream.startAudio();
        setAudioOn(true);
        console.log('🔊 Audio unmuted');
      }
    } catch (error: any) {
      console.error('❌ Toggle audio error:', error);
      setError(`Eroare audio: ${error.message}`);
    }
  }, [mediaStream, isAudioOn]);

  const leave = useCallback(async () => {
    await cleanup();
    window.location.href = '/dashboard';
  }, [cleanup]);

  const debugInfo = useCallback(() => {
    if (!client) return;
    
    const allUsers = client.getAllUser();
    const currentUser = client.getCurrentUserInfo();
    
    console.log('=== 🔍 DEBUG INFO ===');
    console.log('Connection Status:', connectionStatus);
    console.log('Total Participants:', allUsers.length);
    console.log('Current User:', currentUser);
    console.log('All Users:', allUsers);
    console.log('Local Video On:', isVideoOn);
    console.log('Local Audio On:', isAudioOn);
    console.log('Local Video Element:', localVideoRef.current);
    console.log('Remote Video Element:', remoteVideoRef.current);
    console.log('Media Stream:', mediaStream);
    console.log('=== END DEBUG ===');
  }, [client, connectionStatus, isVideoOn, isAudioOn, mediaStream]);

  // Determine user role and other participant
  const isProvider = sessionInfo && auth?.user && sessionInfo.provider.id === auth.user.id;
  const otherParticipant = isProvider ? sessionInfo?.client : sessionInfo?.provider;
  const currentUserId = client?.getCurrentUserInfo()?.userId;
  const remoteParticipants = participants.filter(p => p.userId !== currentUserId);

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
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Sesiune Video</h2>
            <p><strong>Client:</strong> {sessionInfo.client.name}</p>
            <p><strong>Furnizor:</strong> {sessionInfo.provider.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {connectionStatus === 'connected' ? 'Conectat' : 
                 connectionStatus === 'connecting' ? 'Se conectează...' : 'Deconectat'}
              </span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-2xl font-bold text-blue-600">⏰ {timeLeft}</p>
            <p className="text-sm text-gray-600">
              {new Date(sessionInfo.startDate).toLocaleTimeString()} - {new Date(sessionInfo.endDate).toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500">
              Participanți: {participants.length} | Conectați: {remoteParticipants.filter(p => p.bVideoOn || p.bAudioOn).length + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              📹 Tu ({auth.user.name})
              <span className="text-sm font-normal text-gray-600 ml-2">
                {isProvider ? '(Furnizor)' : '(Client)'}
              </span>
            </h3>
            <div className="flex gap-2">
              <span className={`w-3 h-3 rounded-full ${isVideoOn ? 'bg-green-500' : 'bg-red-500'}`} title={isVideoOn ? 'Video pornit' : 'Video oprit'} />
              <span className={`w-3 h-3 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-red-500'}`} title={isAudioOn ? 'Audio pornit' : 'Audio oprit'} />
            </div>
          </div>
          
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3">
            <video 
              ref={localVideoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={toggleVideo} 
              disabled={!mediaStream}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isVideoOn 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isVideoOn ? '📹 Oprește Video' : '📹 Pornește Video'}
            </button>
            <button 
              onClick={toggleAudio} 
              disabled={!mediaStream}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isAudioOn 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAudioOn ? '🔇 Mute' : '🔊 Unmute'}
            </button>
          </div>
        </div>

        {/* Remote Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              👤 {otherParticipant?.name || 'Participant'}
              <span className="text-sm font-normal text-gray-600 ml-2">
                {isProvider ? '(Client)' : '(Furnizor)'}
              </span>
            </h3>
            {remoteParticipants.length > 0 && (
              <div className="flex gap-2">
                <span className={`w-3 h-3 rounded-full ${remoteParticipants[0]?.bVideoOn ? 'bg-green-500' : 'bg-red-500'}`} title="Video" />
                <span className={`w-3 h-3 rounded-full ${remoteParticipants[0]?.bAudioOn ? 'bg-green-500' : 'bg-red-500'}`} title="Audio" />
              </div>
            )}
          </div>
          
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
            {remoteParticipants.length === 0 ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">⏳</div>
                <p>Așteptăm ca {otherParticipant?.name} să se conecteze...</p>
              </div>
            ) : !remoteParticipants[0]?.bVideoOn ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📹</div>
                <p>{remoteParticipants[0]?.displayName || 'Participantul'} nu și-a pornit camera</p>
              </div>
            ) : (
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={debugInfo}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              🔍 Debug Info
            </button>
            <span className="text-sm text-gray-500 self-center">
              Sesiune ID: {sessionId}
            </span>
          </div>
          <button 
            onClick={leave}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            🚪 Părăsește sesiunea
          </button>
        </div>
      </div>

      {/* Hidden audio container */}
      <div ref={remoteAudioRef} className="hidden" />
    </div>
  );
}