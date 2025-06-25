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
  const [isInitialized, setIsInitialized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  const activeRemoteVideo = useRef<string | null>(null);
  const cleanupRef = useRef<boolean>(false);

  // Enhanced logging
  const log = (message: string, data?: any) => {
    console.log(`[VideoSession] ${message}`, data || '');
  };

  const logError = (message: string, error?: any) => {
    console.error(`[VideoSession ERROR] ${message}`, error || '');
  };

  // Token validation helper
  const validateZoomToken = (token: string): { isValid: boolean; error?: string; expiresAt?: Date } => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(payload.exp * 1000);
      
      log('Token validation', {
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: expiresAt.toISOString(),
        currentTime: new Date().toISOString(),
        timeUntilExpiry: Math.round((payload.exp - now) / 60) + ' minutes'
      });
      
      if (payload.exp < now) {
        return {
          isValid: false,
          error: `Token expirat la ${expiresAt.toISOString()}. Timpul curent: ${new Date().toISOString()}`,
          expiresAt
        };
      }
      
      if (payload.exp - now < 300) { // Less than 5 minutes
        logError('⚠️ Token expiring soon!', { minutesLeft: Math.round((payload.exp - now) / 60) });
      }
      
      return { isValid: true, expiresAt };
    } catch (e) {
      return { isValid: false, error: 'Token format invalid' };
    }
  };

  //
  // CLEANUP: Enhanced cleanup with better error handling
  //
  const cleanup = useCallback(async () => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    
    log('🧹 Starting cleanup...');
    
    try {
      // Stop media streams first
      if (mediaStream) {
        try {
          if (isVideoOn) {
            await mediaStream.stopVideo();
            log('Local video stopped');
          }
          if (isAudioOn) {
            await mediaStream.stopAudio();
            log('Local audio stopped');
          }
        } catch (e) {
          logError('Error stopping media streams', e);
        }
      }

      // Clean up remote video
      if (activeRemoteVideo.current && mediaStream && remoteVideoRef.current) {
        try {
          await mediaStream.stopRenderVideo(remoteVideoRef.current, activeRemoteVideo.current);
        } catch (e) {
          logError('Error stopping remote video', e);
        }
      }

      // Leave client and destroy
      if (client) {
        try {
          await client.leave();
          log('Client left successfully');
        } catch (e) {
          logError('Error leaving client', e);
        }
      }

      // Destroy Zoom client with delay to prevent conflicts
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        ZoomVideo.destroyClient();
        log('Zoom client destroyed');
      } catch (e) {
        logError('Error destroying Zoom client', e);
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.load();
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.load();
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.innerHTML = '';
      }

      // Reset all state
      activeRemoteVideo.current = null;
      setClient(null);
      setMediaStream(null);
      setVideoOn(false);
      setAudioOn(false);
      setParticipants([]);
      setConnectionStatus('disconnected');
      setIsMediaReady(false);
      setIsInitialized(false);
      initializationRef.current = false;
      
      log('✅ Cleanup completed');
    } catch (e) {
      logError('Error during cleanup', e);
    } finally {
      cleanupRef.current = false;
    }
  }, [client, mediaStream, isVideoOn, isAudioOn]);

  //
  // 1) FETCH session info
  //
  useEffect(() => {
    if (!sessionId) return;
    
    log('Fetching session info', { sessionId });
    setLoading(true);
    setError('');
    
    fetch(`/api/video/session-info/${sessionId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        log('Session info received', data);
        if (!data.sessionName || !data.token) {
          throw new Error(data.error || 'Invalid session data - missing sessionName or token');
        }
        setSessionInfo(data);
      })
      .catch(e => {
        logError('Error fetching session info', e);
        setError(`Eroare la încărcarea sesiunii: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  //
  // 2) COUNTDOWN timer
  //
  useEffect(() => {
    if (!sessionInfo?.endDate) return;
    
    const updateTimer = () => {
      const diff = new Date(sessionInfo.endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        return false;
      }
      const m = String(Math.floor(diff / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
      return true;
    };
    
    updateTimer();
    const interval = setInterval(() => {
      if (!updateTimer()) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionInfo]);

  //
  // HANDLERS for remote media - Enhanced with better error handling
  //
  const handleRemoteVideo = useCallback(
    async (userId: string, action: 'start' | 'stop') => {
      if (!mediaStream || !remoteVideoRef.current) {
        log(`Cannot handle remote video - missing mediaStream or ref`, { userId, action });
        return;
      }
      
      try {
        log(`Handling remote video`, { userId, action, activeRemoteVideo: activeRemoteVideo.current });
        
        if (action === 'start') {
          // Stop any previous video
          if (activeRemoteVideo.current && activeRemoteVideo.current !== userId) {
            try {
              await mediaStream.stopRenderVideo(remoteVideoRef.current, activeRemoteVideo.current);
              log(`Stopped previous remote video`, { previousUserId: activeRemoteVideo.current });
            } catch (e) {
              logError('Error stopping previous remote video', e);
            }
          }
          
          // Start new video
          await mediaStream.renderVideo(remoteVideoRef.current, userId);
          activeRemoteVideo.current = userId;
          log(`Started remote video`, { userId });
          
        } else if (activeRemoteVideo.current === userId) {
          await mediaStream.stopRenderVideo(remoteVideoRef.current, userId);
          remoteVideoRef.current.srcObject = null;
          remoteVideoRef.current.load();
          activeRemoteVideo.current = null;
          log(`Stopped remote video`, { userId });
        }
      } catch (e) {
        logError(`Remote video ${action} error`, { userId, error: e });
      }
    },
    [mediaStream]
  );

  const handleRemoteAudio = useCallback(
    async (userId: string, action: 'start' | 'stop') => {
      if (!mediaStream || !remoteAudioRef.current) {
        log(`Cannot handle remote audio - missing mediaStream or ref`, { userId, action });
        return;
      }
      
      try {
        log(`Handling remote audio`, { userId, action });
        
        if (action === 'start') {
          const existingAudio = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
          if (!existingAudio) {
            const audioEl = await mediaStream.attachAudio(userId);
            if (audioEl) {
              audioEl.id = `remote-audio-${userId}`;
              audioEl.autoplay = true;
              remoteAudioRef.current.appendChild(audioEl);
              log(`Attached remote audio`, { userId });
            }
          }
        } else {
          const existing = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
          if (existing) {
            existing.remove();
            log(`Removed remote audio`, { userId });
          }
        }
      } catch (e) {
        logError(`Remote audio ${action} error`, { userId, error: e });
      }
    },
    [mediaStream]
  );

  const updateParticipants = useCallback(() => {
    if (!client) {
      log('Cannot update participants - no client');
      return;
    }
    
    try {
      const allUsers = client.getAllUser();
      const currentUser = client.getCurrentUserInfo();
      const meId = currentUser?.userId?.toString();
      
      log('Updating participants', { 
        allUsers, 
        currentUser, 
        meId,
        totalCount: allUsers.length 
      });
      
      setParticipants(allUsers);

      // Handle remote media for the first other participant
      const others = allUsers.filter(u => u.userId.toString() !== meId);
      if (others.length > 0) {
        const remoteUser = others[0];
        log('Processing remote user', { 
          userId: remoteUser.userId, 
          displayName: remoteUser.displayName,
          bVideoOn: remoteUser.bVideoOn, 
          bAudioOn: remoteUser.bAudioOn 
        });
        
        // Handle video
        if (remoteUser.bVideoOn && activeRemoteVideo.current !== remoteUser.userId.toString()) {
          handleRemoteVideo(remoteUser.userId.toString(), 'start');
        } else if (!remoteUser.bVideoOn && activeRemoteVideo.current === remoteUser.userId.toString()) {
          handleRemoteVideo(remoteUser.userId.toString(), 'stop');
        }
        
        // Handle audio
        if (remoteUser.bAudioOn) {
          handleRemoteAudio(remoteUser.userId.toString(), 'start');
        } else {
          handleRemoteAudio(remoteUser.userId.toString(), 'stop');
        }
      }
    } catch (e) {
      logError('Error updating participants', e);
    }
  }, [client, handleRemoteVideo, handleRemoteAudio]);

  //
  // 3) ZOOM initialization - Enhanced with better error handling and debugging
  //
  useEffect(() => {
    // Prevent hot-reload cycles in development
    if (process.env.NODE_ENV === 'development' && window.__DEVELOPMENT_HOT_RELOAD_BLOCK__) {
      log('⚠️ Hot-reload detected, skipping initialization to prevent loops');
      return;
    }
    
    if (!sessionInfo || !auth?.user || initializationRef.current || isInitialized) {
      log('Skipping Zoom initialization', { 
        hasSessionInfo: !!sessionInfo,
        hasAuth: !!auth?.user,
        isInitializationRef: initializationRef.current,
        isInitialized 
      });
      return;
    }
    
    // Set hot-reload block flag
    if (process.env.NODE_ENV === 'development') {
      window.__DEVELOPMENT_HOT_RELOAD_BLOCK__ = true;
    }
    
    initializationRef.current = true;
    
    log('🚀 Starting Zoom initialization', { 
      sessionName: sessionInfo.sessionName,
      userName: auth.user.name,
      hasToken: !!sessionInfo.token 
    });

    (async () => {
      try {
        setConnectionStatus('connecting');
        setError('');
        
        // VALIDATE TOKEN FIRST
        const tokenValidation = validateZoomToken(sessionInfo.token);
        if (!tokenValidation.isValid) {
          throw new Error(`Token invalid: ${tokenValidation.error}`);
        }
        
        log('✅ Token validation passed', { expiresAt: tokenValidation.expiresAt });
        
        // Ensure any existing client is properly destroyed first
        try {
          ZoomVideo.destroyClient();
          log('Destroyed any existing client');
        } catch (e) {
          // Ignore if no client exists
        }
        
        // Add small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create and initialize client
        log('Creating Zoom client...');
        const zmClient = ZoomVideo.createClient();
        
        log('Initializing Zoom client...');
        await zmClient.init('en-US', 'Global', { 
          patchJsMedia: true,
          stayAwake: true 
        });
        
        log('Joining session...');
        // Zoom Video SDK has a 10-character limit for password field
        // Use empty string for password (4th parameter)
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || 'Unknown User',
          '' // Empty password - Zoom Video SDK limit is 10 chars
        );
        
        log('✅ Successfully joined session');
        setClient(zmClient);
        setConnectionStatus('connected');
        setIsInitialized(true);

        // Get media stream
        const ms = zmClient.getMediaStream();
        setMediaStream(ms);
        log('Media stream obtained');

        // Set up event listeners with enhanced logging
        zmClient.on('user-added', (payload) => {
          log('👤 User added', payload);
          setTimeout(updateParticipants, 1000);
        });
        
        zmClient.on('user-removed', (payload) => {
          log('👤 User removed', payload);
          // Fix: Check if payload has userId before calling toString()
          if (payload && payload.userId !== undefined) {
            const userId = payload.userId.toString();
            handleRemoteVideo(userId, 'stop');
            handleRemoteAudio(userId, 'stop');
          }
          setTimeout(updateParticipants, 500);
        });
        
        zmClient.on('peer-video-state-change', (payload) => {
          log('📹 Peer video state change', payload);
          const userId = payload.userId.toString();
          const action = payload.action === 'Start' ? 'start' : 'stop';
          
          // Add delay for video start to ensure stream is ready
          setTimeout(() => {
            handleRemoteVideo(userId, action);
            setTimeout(updateParticipants, 500);
          }, action === 'start' ? 2000 : 0);
        });
        
        zmClient.on('peer-audio-state-change', (payload) => {
          log('🔊 Peer audio state change', payload);
          const userId = payload.userId.toString();
          const action = payload.action === 'Start' ? 'start' : 'stop';
          
          setTimeout(() => {
            handleRemoteAudio(userId, action);
            setTimeout(updateParticipants, 500);
          }, 500);
        });
        
        zmClient.on('connection-change', (payload) => {
          log('🔗 Connection state change', payload);
          if (payload.state) {
            setConnectionStatus(payload.state);
          }
        });

        // Initialize local media
        log('Initializing local media...');
        
        // Start local video
        try {
          log('Starting local video...');
          
          // Use the improved approach
          const tempV = document.createElement('video');
          tempV.muted = true;
          tempV.playsInline = true;
          await ms.startVideo({ videoElement: tempV });
          
          if (tempV.srcObject && localVideoRef.current) {
            localVideoRef.current.srcObject = tempV.srcObject;
            setVideoOn(true);
            log('✅ Local video started successfully');
          }
        } catch (videoError) {
          logError('Failed to start local video', videoError);
          // Don't fail the entire initialization for video errors
        }

        // Start local audio
        try {
          log('Starting local audio...');
          await ms.startAudio();
          setAudioOn(true);
          log('✅ Local audio started successfully');
        } catch (audioError) {
          logError('Failed to start local audio', audioError);
          // Don't fail the entire initialization for audio errors
        }

        setIsMediaReady(true);
        log('✅ Media ready, updating participants...');
        setTimeout(updateParticipants, 2000);
        
      } catch (e: any) {
        logError('❌ Zoom initialization failed', e);
        setError(`Eroare la conectarea la sesiune: ${e.message || 'Eroare necunoscută'}`);
        setConnectionStatus('failed');
        initializationRef.current = false;
        setIsInitialized(false);
      }
    })();

    // Cleanup on unmount
    return () => {
      log('Component unmounting, cleaning up...');
      // Clear hot-reload flag
      if (process.env.NODE_ENV === 'development') {
        window.__DEVELOPMENT_HOT_RELOAD_BLOCK__ = false;
      }
      cleanup();
    };
  }, [
    sessionInfo,
    auth,
    isInitialized,
    updateParticipants,
    handleRemoteVideo,
    handleRemoteAudio,
    cleanup,
  ]);

  //
  // TOGGLES - Enhanced with better error handling
  //
  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !isMediaReady || connectionStatus !== 'connected') {
      log('Cannot toggle video - not ready', { 
        hasMediaStream: !!mediaStream, 
        isMediaReady, 
        connectionStatus 
      });
      return;
    }
    
    try {
      log(`Toggling video from ${isVideoOn} to ${!isVideoOn}`);
      
      if (isVideoOn) {
        await mediaStream.stopVideo();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.load();
        }
        setVideoOn(false);
        log('✅ Video stopped');
      } else {
        const tempV = document.createElement('video');
        tempV.muted = true;
        tempV.playsInline = true;
        await mediaStream.startVideo({ videoElement: tempV });
        
        if (tempV.srcObject && localVideoRef.current) {
          localVideoRef.current.srcObject = tempV.srcObject;
        }
        setVideoOn(true);
        log('✅ Video started');
      }
    } catch (e: any) {
      logError('Video toggle error', e);
      setError(`Eroare video: ${e.message}`);
    }
  }, [mediaStream, isVideoOn, isMediaReady, connectionStatus]);

  const toggleAudio = useCallback(async () => {
    if (!mediaStream || !isMediaReady || connectionStatus !== 'connected') {
      log('Cannot toggle audio - not ready', { 
        hasMediaStream: !!mediaStream, 
        isMediaReady, 
        connectionStatus 
      });
      return;
    }
    
    try {
      log(`Toggling audio from ${isAudioOn} to ${!isAudioOn}`);
      
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
        log('✅ Audio stopped');
      } else {
        await mediaStream.startAudio();
        setAudioOn(true);
        log('✅ Audio started');
      }
    } catch (e: any) {
      logError('Audio toggle error', e);
      setError(`Eroare audio: ${e.message}`);
    }
  }, [mediaStream, isAudioOn, isMediaReady, connectionStatus]);

  const leave = useCallback(async () => {
    log('User leaving session...');
    await cleanup();
    window.location.href = '/dashboard';
  }, [cleanup]);

  const debugInfo = useCallback(() => {
    if (!client) {
      console.log('🔍 DEBUG: No client available');
      return;
    }
    
    const debugData = {
      connectionStatus,
      isMediaReady,
      isInitialized,
      participants: client.getAllUser(),
      me: client.getCurrentUserInfo(),
      localVideoOn: isVideoOn,
      localAudioOn: isAudioOn,
      activeRemoteVideo: activeRemoteVideo.current,
      hasMediaStream: !!mediaStream,
      sessionInfo: sessionInfo ? {
        sessionName: sessionInfo.sessionName,
        hasToken: !!sessionInfo.token,
        provider: sessionInfo.provider,
        client: sessionInfo.client
      } : null
    };
    
    console.log('🔍 DEBUG INFO:', debugData);
    
    // Also try to get more detailed info
    try {
      if (mediaStream) {
        console.log('📹 Media Stream Info:', {
          isVideoDecodeReady: mediaStream.isVideoDecodeReady?.(),
          isAudioDecodeReady: mediaStream.isAudioDecodeReady?.(),
        });
      }
    } catch (e) {
      console.log('Error getting media stream details:', e);
    }
  }, [
    client,
    connectionStatus,
    isMediaReady,
    isInitialized,
    isVideoOn,
    isAudioOn,
    mediaStream,
    sessionInfo
  ]);

  //
  // RENDER
  //
  const isProvider = sessionInfo?.provider.id === auth?.user?.id;
  const other = isProvider ? sessionInfo?.client : sessionInfo?.provider;
  const meId = client?.getCurrentUserInfo()?.userId.toString();
  const remote = participants.filter(p => p.userId.toString() !== meId);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Se încarcă sesiunea...</p>
        </div>
      </div>
    );
  }
  
  if (!auth?.user) {
    return <div className="text-red-500 p-4">Acces neautorizat - vă rugăm să vă autentificați</div>;
  }
  
  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <p className="font-semibold">Eroare:</p>
        <p className="mt-2">{error}</p>
        <div className="mt-4 space-x-2">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reîncarcă pagina
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Înapoi la Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (!sessionInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-pulse text-blue-600 text-xl mb-2">⚙️</div>
          <p>Se pregătește sesiunea...</p>
        </div>
      </div>
    );
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
                : connectionStatus === 'failed'
                ? 'Conexiune eșuată'
                : 'Deconectat'}
            </span>
            {isMediaReady && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Media Ready
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">⏰ {timeLeft}</p>
          <p className="text-sm text-gray-600">
            {new Date(sessionInfo.startDate).toLocaleTimeString()} – {new Date(sessionInfo.endDate).toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-500">
            Participanți: {participants.length} | Conectați: {remote.filter(p => p.bVideoOn || p.bAudioOn).length + (isVideoOn || isAudioOn ? 1 : 0)}
          </p>
        </div>
      </div>

      {/* CONNECTION STATUS & DEBUG INFO */}
      {connectionStatus !== 'connected' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-yellow-600">⚠️</div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                {connectionStatus === 'connecting' && 'Se conectează la sesiune...'}
                {connectionStatus === 'failed' && 'Conexiunea a eșuat. Verificați conexiunea la internet și reîncărcați pagina.'}
                {connectionStatus === 'disconnected' && 'Deconectat de la sesiune.'}
                {!['connecting', 'failed', 'disconnected'].includes(connectionStatus) && `Status: ${connectionStatus}`}
              </p>
              {!isMediaReady && connectionStatus === 'connected' && (
                <p className="text-sm text-yellow-700 mt-1">
                  Pregătirea media în curs...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              📹 Tu ({auth.user.name}) 
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? '(Furnizor)' : '(Client)'}
              </span>
            </h3>
            <div className="flex gap-2">
              <span 
                className={`w-3 h-3 rounded-full ${isVideoOn ? 'bg-green-500' : 'bg-red-500'}`}
                title={isVideoOn ? 'Video pornit' : 'Video oprit'}
              />
              <span 
                className={`w-3 h-3 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-red-500'}`}
                title={isAudioOn ? 'Audio pornit' : 'Audio oprit'}
              />
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3 relative">
            {isVideoOn ? (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p>Camera oprită</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleVideo} 
              disabled={!isMediaReady || connectionStatus !== 'connected'} 
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                isVideoOn 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isVideoOn ? '📹 Oprește Video' : '📹 Pornește Video'}
            </button>
            <button 
              onClick={toggleAudio} 
              disabled={!isMediaReady || connectionStatus !== 'connected'} 
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                isAudioOn 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAudioOn ? '🔇 Mute' : '🔊 Unmute'}
            </button>
          </div>
        </div>

        {/* Remote */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              👤 {other?.name || 'Participant'} 
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? '(Client)' : '(Furnizor)'}
              </span>
            </h3>
            {remote[0] && (
              <div className="flex gap-2">
                <span 
                  className={`w-3 h-3 rounded-full ${remote[0].bVideoOn ? 'bg-green-500' : 'bg-red-500'}`}
                  title={remote[0].bVideoOn ? 'Video pornit' : 'Video oprit'}
                />
                <span 
                  className={`w-3 h-3 rounded-full ${remote[0].bAudioOn ? 'bg-green-500' : 'bg-red-500'}`}
                  title={remote[0].bAudioOn ? 'Audio pornit' : 'Audio oprit'}
                />
              </div>
            )}
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            {remote.length === 0 ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">⏳</div>
                <p>Așteptăm ca {other?.name} să se conecteze…</p>
                <p className="text-sm mt-1">
                  Status conexiune: {connectionStatus}
                </p>
              </div>
            ) : !remote[0].bVideoOn ? (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📹</div>
                <p>{remote[0].displayName} nu și-a pornit camera</p>
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

      {/* CONTROLS */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button 
            onClick={debugInfo} 
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            🔍 Debug Info
          </button>
          <span className="text-sm text-gray-500">Sesiune ID: {sessionId}</span>
          {process.env.NODE_ENV === 'development' && (
            <div className="flex gap-1 text-xs">
              <span className={`px-2 py-1 rounded ${isInitialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Init: {isInitialized ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded ${isMediaReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Media: {isMediaReady ? '✓' : '✗'}
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={leave} 
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          🚪 Părăsește sesiunea
        </button>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-red-600">❌</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Eroare</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setError('')}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio container */}
      <div ref={remoteAudioRef} className="hidden" />
    </div>
  );
}