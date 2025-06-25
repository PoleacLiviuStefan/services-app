'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import ZoomVideo from '@zoom/videosdk';

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

declare global {
  interface Window {
    __ZOOM_VIDEO_SESSION_DATA__?: {
      [key: string]: {
        client: any;
        mediaStream: any;
        isVideoOn: boolean;
        isAudioOn: boolean;
        connectionStatus: string;
      }
    }
  }
}

export default function VideoSessionPage() {
  const { data: auth, status } = useSession();
  const { sessionId } = useParams();

  // Core state
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [participants, setParticipants] = useState<ZoomUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Video attachment tracking
  const [localVideoAttached, setLocalVideoAttached] = useState(false);
  const [videoAttachmentMethod, setVideoAttachmentMethod] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
  const activeRemoteVideo = useRef<string | null>(null);

  // Session tracking
  const sessionKey = `${sessionInfo?.sessionName || ''}_${auth?.user?.id || ''}`;

  // Enhanced logging
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] [VideoSession] ${message}`, data || '');
  };

  const logError = (message: string, error?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.error(`[${timestamp}] [VideoSession ERROR] ${message}`, error || '');
  };

  // Global session data management (persists across hot reloads)
  const getGlobalSessionData = useCallback(() => {
    if (!window.__ZOOM_VIDEO_SESSION_DATA__) {
      window.__ZOOM_VIDEO_SESSION_DATA__ = {};
    }
    return window.__ZOOM_VIDEO_SESSION_DATA__[sessionKey];
  }, [sessionKey]);

  const setGlobalSessionData = useCallback((data: any) => {
    if (!window.__ZOOM_VIDEO_SESSION_DATA__) {
      window.__ZOOM_VIDEO_SESSION_DATA__ = {};
    }
    window.__ZOOM_VIDEO_SESSION_DATA__[sessionKey] = data;
  }, [sessionKey]);

  // Token validation
  const validateZoomToken = (token: string): { isValid: boolean; error?: string; expiresAt?: Date } => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(payload.exp * 1000);
      
      if (payload.exp < now) {
        return {
          isValid: false,
          error: `Token expirat la ${expiresAt.toISOString()}`,
          expiresAt
        };
      }
      
      return { isValid: true, expiresAt };
    } catch (e) {
      return { isValid: false, error: 'Token format invalid' };
    }
  };

  // Direct DOM video attachment (bypasses React ref issues)
  const attachLocalVideoDirectly = useCallback(async () => {
    return new Promise<boolean>((resolve) => {
      const attemptDirectAttachment = async (attempt = 1, maxAttempts = 5) => {
        log(`🎥 Direct video attachment attempt ${attempt}/${maxAttempts}`);
        
        // Get global session data
        const globalData = getGlobalSessionData();
        if (!globalData?.mediaStream) {
          log('MediaStream not available in global data');
          if (attempt < maxAttempts) {
            setTimeout(() => attemptDirectAttachment(attempt + 1, maxAttempts), 500);
            return;
          } else {
            resolve(false);
            return;
          }
        }

        // Use direct DOM query instead of React ref
        const videoElement = document.querySelector('#local-video-element') as HTMLVideoElement;
        if (!videoElement) {
          log('Video element not found in DOM, retrying...');
          if (attempt < maxAttempts) {
            setTimeout(() => attemptDirectAttachment(attempt + 1, maxAttempts), 500);
            return;
          } else {
            logError('Video element never found in DOM');
            resolve(false);
            return;
          }
        }

        try {
          log('🎥 Both global data and DOM element ready, attaching video');
          
          // Clear existing video
          if (videoElement.srcObject) {
            videoElement.srcObject = null;
            videoElement.load();
          }

          let success = false;
          let method = '';

          // Try attachVideo
          if (typeof globalData.mediaStream.attachVideo === 'function') {
            try {
              await globalData.mediaStream.attachVideo(videoElement);
              success = true;
              method = 'attachVideo';
              log('✅ Local video attached using attachVideo (direct DOM)');
            } catch (e: any) {
              logError('Direct attachVideo failed', e);
            }
          }

          // Try renderVideo as fallback
          if (!success && typeof globalData.mediaStream.renderVideo === 'function' && globalData.client) {
            try {
              const currentUser = globalData.client.getCurrentUserInfo();
              if (currentUser && currentUser.userId) {
                await globalData.mediaStream.renderVideo(videoElement, currentUser.userId);
                success = true;
                method = 'renderVideo';
                log('✅ Local video attached using renderVideo (direct DOM)');
              }
            } catch (e: any) {
              logError('Direct renderVideo failed', e);
            }
          }

          if (success) {
            setLocalVideoAttached(true);
            setVideoAttachmentMethod(method);
            setRetryCount(0);
            log('✅ Direct video attachment successful', { method });
          } else {
            setLocalVideoAttached(false);
            setVideoAttachmentMethod('');
            logError('❌ All direct video attachment methods failed');
          }

          resolve(success);
        } catch (e: any) {
          logError('Critical error in direct video attachment', e);
          resolve(false);
        }
      };

      attemptDirectAttachment();
    });
  }, [getGlobalSessionData]);

  // Enhanced cleanup function
  const cleanup = useCallback(async () => {
    log('🧹 Starting cleanup...');
    
    try {
      const globalData = getGlobalSessionData();
      
      if (globalData) {
        // Stop media streams
        if (globalData.mediaStream) {
          try {
            if (globalData.isVideoOn && typeof globalData.mediaStream.stopVideo === 'function') {
              await globalData.mediaStream.stopVideo();
            }
            if (globalData.isAudioOn && typeof globalData.mediaStream.stopAudio === 'function') {
              await globalData.mediaStream.stopAudio();
            }
          } catch (e: any) {
            logError('Error stopping media streams', e);
          }
        }

        // Clean up client
        if (globalData.client) {
          try {
            if (typeof globalData.client.off === 'function') {
              globalData.client.off('user-added');
              globalData.client.off('user-removed');
              globalData.client.off('peer-video-state-change');
              globalData.client.off('peer-audio-state-change');
              globalData.client.off('connection-change');
            }
            if (typeof globalData.client.leave === 'function') {
              await globalData.client.leave();
            }
          } catch (e: any) {
            logError('Error during client cleanup', e);
          }
        }

        // Destroy client
        try {
          if (typeof ZoomVideo.destroyClient === 'function') {
            ZoomVideo.destroyClient();
          }
        } catch (e: any) {
          logError('Error destroying client', e);
        }

        // Clear global session data
        delete window.__ZOOM_VIDEO_SESSION_DATA__![sessionKey];
      }

      // Clean up DOM elements directly
      const localVideo = document.querySelector('#local-video-element') as HTMLVideoElement;
      const remoteVideo = document.querySelector('#remote-video-element') as HTMLVideoElement;
      
      if (localVideo) {
        localVideo.pause();
        localVideo.srcObject = null;
        localVideo.load();
      }
      
      if (remoteVideo) {
        remoteVideo.pause();
        remoteVideo.srcObject = null;
        remoteVideo.load();
      }

      // Reset state
      setClient(null);
      setMediaStream(null);
      setVideoOn(false);
      setAudioOn(false);
      setLocalVideoAttached(false);
      setVideoAttachmentMethod('');
      setRetryCount(0);
      setParticipants([]);
      setConnectionStatus('disconnected');
      setIsMediaReady(false);
      setIsInitialized(false);
      
      log('✅ Cleanup completed');
    } catch (e: any) {
      logError('Error during cleanup', e);
    }
  }, [getGlobalSessionData, sessionKey]);

  // Fetch session info
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
          throw new Error(data.error || 'Invalid session data');
        }
        setSessionInfo(data);
      })
      .catch(e => {
        logError('Error fetching session info', e);
        setError(`Eroare la încărcarea sesiunii: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Countdown timer
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
  }, [sessionInfo?.endDate]);

  // Restore state from global data on mount/remount
  useEffect(() => {
    const globalData = getGlobalSessionData();
    if (globalData) {
      log('🔄 Restoring state from global data', globalData);
      setClient(globalData.client);
      setMediaStream(globalData.mediaStream);
      setVideoOn(globalData.isVideoOn);
      setAudioOn(globalData.isAudioOn);
      setConnectionStatus(globalData.connectionStatus);
      setIsMediaReady(!!globalData.mediaStream);
      setIsInitialized(!!globalData.client);

      // Try to reattach video if it was on
      if (globalData.isVideoOn) {
        setTimeout(async () => {
          const attached = await attachLocalVideoDirectly();
          if (!attached) {
            setRetryCount(prev => prev + 1);
          }
        }, 1000);
      }
    }
  }, [getGlobalSessionData, attachLocalVideoDirectly]);

  // Main Zoom initialization with global persistence
  useEffect(() => {
    if (!sessionInfo || !auth?.user || isInitialized) {
      return;
    }

    // Check if already initialized globally
    const globalData = getGlobalSessionData();
    if (globalData && globalData.client) {
      log('Using existing global session data');
      return;
    }

    log('🚀 Starting NEW Zoom initialization', { sessionKey });

    (async () => {
      try {
        setConnectionStatus('connecting');
        setError('');
        
        // Validate token
        const tokenValidation = validateZoomToken(sessionInfo.token);
        if (!tokenValidation.isValid) {
          throw new Error(`Token invalid: ${tokenValidation.error}`);
        }
        
        // Clean slate
        try {
          if (typeof ZoomVideo.destroyClient === 'function') {
            ZoomVideo.destroyClient();
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          // Ignore
        }
        
        // Create client
        const zmClient = ZoomVideo.createClient();
        
        // Initialize
        await zmClient.init('en-US', 'Global', { 
          patchJsMedia: true,
          stayAwake: true
        });
        
        // Join
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || 'Unknown User',
          ''
        );
        
        log('✅ Successfully joined session');
        setClient(zmClient);
        setConnectionStatus('connected');
        setIsInitialized(true);

        // Get media stream
        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Store in global data
        const newGlobalData = {
          client: zmClient,
          mediaStream: ms,
          isVideoOn: false,
          isAudioOn: false,
          connectionStatus: 'connected'
        };
        setGlobalSessionData(newGlobalData);

        // Set up event listeners
        zmClient.on('user-added', (payload: any) => {
          log('👤 User added', payload);
          setTimeout(() => {
            if (zmClient && typeof zmClient.getAllUser === 'function') {
              setParticipants(zmClient.getAllUser());
            }
          }, 1000);
        });
        
        zmClient.on('user-removed', (payload: any) => {
          log('👤 User removed', payload);
          setTimeout(() => {
            if (zmClient && typeof zmClient.getAllUser === 'function') {
              setParticipants(zmClient.getAllUser());
            }
          }, 500);
        });
        
        zmClient.on('connection-change', (payload: any) => {
          log('🔗 Connection state change', payload);
          if (payload.state) {
            setConnectionStatus(payload.state);
            // Update global data
            const currentGlobalData = getGlobalSessionData();
            if (currentGlobalData) {
              currentGlobalData.connectionStatus = payload.state;
              setGlobalSessionData(currentGlobalData);
            }
          }
        });

        // Start media
        try {
          if (typeof ms.startVideo === 'function') {
            await ms.startVideo();
            setVideoOn(true);
            log('✅ Video started');
            
            // Update global data
            const currentGlobalData = getGlobalSessionData();
            if (currentGlobalData) {
              currentGlobalData.isVideoOn = true;
              setGlobalSessionData(currentGlobalData);
            }
            
            // Enhanced video attachment with longer delay for DOM readiness
            setTimeout(async () => {
              log('🎥 Starting direct video attachment process...');
              const attached = await attachLocalVideoDirectly();
              if (!attached) {
                logError('Initial direct video attachment failed');
                setRetryCount(prev => prev + 1);
              }
            }, 2000);
          }
        } catch (e: any) {
          logError('Video start failed', e);
        }

        try {
          if (typeof ms.startAudio === 'function') {
            await ms.startAudio();
            setAudioOn(true);
            log('✅ Audio started');
            
            // Update global data
            const currentGlobalData = getGlobalSessionData();
            if (currentGlobalData) {
              currentGlobalData.isAudioOn = true;
              setGlobalSessionData(currentGlobalData);
            }
          }
        } catch (e: any) {
          logError('Audio start failed', e);
        }

        setIsMediaReady(true);
        
        // Update participants
        setTimeout(() => {
          if (zmClient && typeof zmClient.getAllUser === 'function') {
            setParticipants(zmClient.getAllUser());
          }
        }, 2000);
        
      } catch (e: any) {
        logError('❌ Zoom initialization failed', e);
        setError(`Eroare la conectare: ${e.message}`);
        setConnectionStatus('failed');
        setIsInitialized(false);
      }
    })();

    // Cleanup on unmount
    return () => {
      log('Component unmounting...');
      // Don't cleanup global data immediately - let it persist for hot reloads
    };
  }, [
    sessionInfo?.sessionName,
    sessionInfo?.token, 
    auth?.user?.name,
    auth?.user?.id,
    sessionKey,
    isInitialized,
    getGlobalSessionData,
    setGlobalSessionData,
    attachLocalVideoDirectly
  ]);

  // Video toggle with global data sync
  const toggleVideo = useCallback(async () => {
    const globalData = getGlobalSessionData();
    if (!globalData?.mediaStream || !isMediaReady || connectionStatus !== 'connected') {
      return;
    }
    
    try {
      if (isVideoOn) {
        if (typeof globalData.mediaStream.stopVideo === 'function') {
          await globalData.mediaStream.stopVideo();
        }
        const localVideo = document.querySelector('#local-video-element') as HTMLVideoElement;
        if (localVideo) {
          localVideo.srcObject = null;
          localVideo.load();
        }
        setVideoOn(false);
        setLocalVideoAttached(false);
        setVideoAttachmentMethod('');
        
        // Update global data
        globalData.isVideoOn = false;
        setGlobalSessionData(globalData);
      } else {
        if (typeof globalData.mediaStream.startVideo === 'function') {
          await globalData.mediaStream.startVideo();
          setVideoOn(true);
          
          // Update global data
          globalData.isVideoOn = true;
          setGlobalSessionData(globalData);
          
          // Try to attach with direct DOM
          setTimeout(async () => {
            const attached = await attachLocalVideoDirectly();
            if (!attached) {
              setRetryCount(prev => prev + 1);
            }
          }, 1000);
        }
      }
    } catch (e: any) {
      logError('Video toggle error', e);
      setError(`Eroare video: ${e.message}`);
    }
  }, [isVideoOn, isMediaReady, connectionStatus, getGlobalSessionData, setGlobalSessionData, attachLocalVideoDirectly]);

  // Audio toggle with global data sync
  const toggleAudio = useCallback(async () => {
    const globalData = getGlobalSessionData();
    if (!globalData?.mediaStream || !isMediaReady || connectionStatus !== 'connected') {
      return;
    }
    
    try {
      if (isAudioOn) {
        if (typeof globalData.mediaStream.stopAudio === 'function') {
          await globalData.mediaStream.stopAudio();
          setAudioOn(false);
          globalData.isAudioOn = false;
          setGlobalSessionData(globalData);
        }
      } else {
        if (typeof globalData.mediaStream.startAudio === 'function') {
          await globalData.mediaStream.startAudio();
          setAudioOn(true);
          globalData.isAudioOn = true;
          setGlobalSessionData(globalData);
        }
      }
    } catch (e: any) {
      logError('Audio toggle error', e);
      setError(`Eroare audio: ${e.message}`);
    }
  }, [isAudioOn, isMediaReady, connectionStatus, getGlobalSessionData, setGlobalSessionData]);

  // Leave session
  const leave = useCallback(async () => {
    log('User leaving session...');
    setConnectionStatus('disconnecting');
    await cleanup();
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  }, [cleanup]);

  // Manual video retry with direct DOM
  const retryVideoAttachment = useCallback(async () => {
    if (!isVideoOn) return;
    
    log('🔄 Manual direct video attachment retry...');
    setRetryCount(prev => prev + 1);
    
    const result = await attachLocalVideoDirectly();
    if (!result) {
      setError('Nu s-a putut reconecta video-ul. Încercați să reîncărcați pagina.');
    }
  }, [isVideoOn, attachLocalVideoDirectly]);

  // Debug info
  const debugInfo = useCallback(() => {
    const globalData = getGlobalSessionData();
    console.log('🔍 HOT RELOAD FRIENDLY DEBUG INFO:', {
      timestamp: new Date().toISOString(),
      connectionStatus,
      isVideoOn,
      isAudioOn,
      localVideoAttached,
      videoAttachmentMethod,
      retryCount,
      isMediaReady,
      isInitialized,
      participants: participants.length,
      sessionKey,
      globalData: globalData ? {
        hasClient: !!globalData.client,
        hasMediaStream: !!globalData.mediaStream,
        isVideoOn: globalData.isVideoOn,
        isAudioOn: globalData.isAudioOn,
        connectionStatus: globalData.connectionStatus
      } : null,
      domElements: {
        localVideo: !!document.querySelector('#local-video-element'),
        remoteVideo: !!document.querySelector('#remote-video-element'),
        localVideoReady: (() => {
          const el = document.querySelector('#local-video-element') as HTMLVideoElement;
          return el ? {
            readyState: el.readyState,
            videoWidth: el.videoWidth,
            videoHeight: el.videoHeight,
            paused: el.paused
          } : null;
        })()
      }
    });
  }, [connectionStatus, isVideoOn, isAudioOn, localVideoAttached, videoAttachmentMethod, retryCount, isMediaReady, isInitialized, participants.length, sessionKey, getGlobalSessionData]);

  // Render logic
  const isProvider = sessionInfo?.provider.id === auth?.user?.id;
  const other = isProvider ? sessionInfo?.client : sessionInfo?.provider;
  
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
    return <div className="text-red-500 p-4">Acces neautorizat</div>;
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
            Reîncarcă
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Dashboard
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
          <h2 className="text-xl font-bold">Sesiune Video HMR-Friendly</h2>
          <p><strong>Client:</strong> {sessionInfo.client.name}</p>
          <p><strong>Furnizor:</strong> {sessionInfo.provider.name}</p>
          <div className="mt-1">
            <span>Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : connectionStatus === 'disconnecting'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected'
                ? 'Conectat'
                : connectionStatus === 'connecting'
                ? 'Se conectează...'
                : connectionStatus === 'disconnecting'
                ? 'Se deconectează...'
                : connectionStatus === 'failed'
                ? 'Conexiune eșuată'
                : 'Deconectat'}
            </span>
            {isMediaReady && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Media Ready
              </span>
            )}
            {localVideoAttached && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Video OK ({videoAttachmentMethod})
              </span>
            )}
            {retryCount > 0 && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Retry: {retryCount}
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
            Participanți: {participants.length}
          </p>
        </div>
      </div>

      {/* VIDEO ATTACHMENT WARNING */}
      {isVideoOn && !localVideoAttached && connectionStatus === 'connected' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-orange-600">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-orange-800">
                  Video-ul este pornit dar nu se afișează corect (Direct DOM). 
                  {retryCount > 3 && ' Încercați să reîncărcați pagina.'}
                </p>
              </div>
            </div>
            <button
              onClick={retryVideoAttachment}
              disabled={retryCount > 5}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {retryCount > 5 ? 'Prea multe încercări' : 'Reconectează Video'}
            </button>
          </div>
        </div>
      )}

      {/* VIDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video - Using direct DOM ID */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              📹 Tu ({auth.user.name}) 
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? '(Furnizor)' : '(Client)'}
              </span>
            </h3>
            <div className="flex gap-2 items-center">
              <span 
                className={`w-3 h-3 rounded-full ${isVideoOn ? 'bg-green-500' : 'bg-red-500'}`}
                title={isVideoOn ? 'Video pornit' : 'Video oprit'}
              />
              <span 
                className={`w-3 h-3 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-red-500'}`}
                title={isAudioOn ? 'Audio pornit' : 'Audio oprit'}
              />
              <span 
                className={`w-3 h-3 rounded-full ${localVideoAttached ? 'bg-blue-500' : 'bg-gray-400'}`}
                title={localVideoAttached ? `Video attached (${videoAttachmentMethod})` : 'Video not attached'}
              />
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3 relative">
            {isVideoOn && localVideoAttached ? (
              <video 
                id="local-video-element"
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
                  {!isVideoOn ? (
                    <p>Camera oprită</p>
                  ) : !localVideoAttached ? (
                    <div>
                      <p>Camera pornită dar nu se afișează</p>
                      <p className="text-xs mt-1">Încercări: {retryCount}</p>
                      <button
                        onClick={retryVideoAttachment}
                        disabled={retryCount > 5}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {retryCount > 5 ? 'Prea multe încercări' : 'Reconectează (DOM)'}
                      </button>
                    </div>
                  ) : (
                    <p>Se încarcă...</p>
                  )}
                  {/* Hidden video element for DOM attachment when not displaying */}
                  {(!isVideoOn || !localVideoAttached) && (
                    <video 
                      id="local-video-element"
                      ref={localVideoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ display: 'none' }}
                    />
                  )}
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

        {/* Remote Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              👤 {other?.name || 'Participant'} 
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? '(Client)' : '(Furnizor)'}
              </span>
            </h3>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            <video 
              id="remote-video-element"
              ref={remoteVideoRef}
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
              style={{ display: 'none' }}
            />
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <p>Așteptăm ca {other?.name} să se conecteze…</p>
              <p className="text-sm mt-1">Status: {connectionStatus}</p>
              {participants.length > 0 && (
                <p className="text-xs mt-1">Participanți: {participants.length}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button 
            onClick={debugInfo} 
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            🔍 Debug HMR-Friendly
          </button>
          <span className="text-sm text-gray-500">Sesiune: {sessionId}</span>
          <span className="text-xs bg-green-100 px-2 py-1 rounded text-green-800">
            HMR Compatible
          </span>
        </div>
        <button 
          onClick={leave} 
          disabled={connectionStatus === 'disconnecting'}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {connectionStatus === 'disconnecting' ? '🔃 Se deconectează...' : '🚪 Părăsește'}
        </button>
      </div>

      {/* Hidden audio container */}
      <div ref={remoteAudioRef} className="hidden" />
    </div>
  );
}