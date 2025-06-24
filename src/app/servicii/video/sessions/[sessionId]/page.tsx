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
  const [participants, setParticipants] = useState<any[]>([]);

  const localContainerRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
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
    
    const initializeZoom = async () => {
      try {
        console.log('Initializing Zoom with:', {
          sessionName: sessionInfo.sessionName,
          userId: sessionInfo.userId,
          userName: auth.user.name
        });

        const zmClient = ZoomVideo.createClient();
        await zmClient.init('en-US', 'Global', { patchJsMedia: true });
        
        // Join with the correct user identity
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || 'Unknown User',
          ''
        );
        
        console.log('Successfully joined Zoom session');
        setClient(zmClient);

        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Remote streams handling
        const remoteVideos: Record<string, HTMLVideoElement> = {};

        // Set up participant tracking and video rendering
        const updateParticipants = async () => {
          const allUsers = zmClient.getAllUser();
          console.log('Current participants:', allUsers);
          setParticipants(allUsers);
          
          // Check if any participants have video on and render it
          for (const user of allUsers) {
            if (user.userId !== zmClient.getCurrentUserInfo().userId && user.bVideoOn && !remoteVideos[user.userId]) {
              console.log('Found participant with video on:', user);
              await renderRemoteVideo(user.userId);
            }
          }
        };

        // Function to render remote video
        const renderRemoteVideo = async (userId: string) => {
          if (!remoteContainerRef.current || remoteVideos[userId]) return;
          
          try {
            const videoEl = document.createElement('video');
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            videoEl.id = `remote-video-${userId}`;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'flex-1 bg-black rounded overflow-hidden relative';
            
            const label = document.createElement('div');
            label.className = 'absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm z-10';
            label.textContent = `User ${userId.slice(0, 8)}`;
            
            wrapper.appendChild(videoEl);
            wrapper.appendChild(label);
            remoteContainerRef.current.appendChild(wrapper);
            remoteVideos[userId] = videoEl;
            
            // Try different render methods
            try {
              await ms.renderVideo(videoEl, userId);
              console.log('Remote video rendered successfully for user:', userId);
            } catch (renderError) {
              console.log('First render method failed, trying alternative:', renderError);
              // Alternative method
              await ms.renderVideo({ userId, videoElement: videoEl });
            }
          } catch (error) {
            console.error('Failed to render remote video:', error);
          }
        };

        // Initial participant list and video check
        await updateParticipants();
        
        // Also check after a small delay to ensure all participants are loaded
        setTimeout(async () => {
          await updateParticipants();
        }, 2000);

        // Listen for participant changes
        zmClient.on('user-added', async (payload: any) => {
          console.log('User added:', payload);
          await updateParticipants();
        });

        zmClient.on('user-removed', (payload: any) => {
          console.log('User removed:', payload);
          updateParticipants();
          
          // Clean up video and audio for removed user
          const { userId } = payload;
          const videoEl = remoteVideos[userId];
          if (videoEl && videoEl.parentElement) {
            videoEl.parentElement.remove();
            delete remoteVideos[userId];
          }
          
          if (remoteAudioRef.current) {
            const audioEl = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
            if (audioEl) {
              audioEl.remove();
            }
          }
        });

        // Local video setup
        if (localContainerRef.current) {
          try {
            const videoEl = document.createElement('video');
            videoEl.muted = true;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            
            localContainerRef.current.innerHTML = '';
            localContainerRef.current.appendChild(videoEl);
            
            await ms.startVideo({ videoElement: videoEl });
            setVideoOn(true);
            console.log('Local video started');
          } catch (videoError) {
            console.warn('Failed to start local video:', videoError);
          }
        }

        // Start audio
        try {
          await ms.startAudio();
          setAudioOn(true);
          console.log('Audio started');
        } catch (audioError) {
          console.warn('Failed to start audio:', audioError);
        }

        // Listen for when participants start/stop video
        zmClient.on('peer-video-state-change', async (payload: any) => {
          console.log('Peer video state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start' && remoteContainerRef.current && !remoteVideos[userId]) {
            try {
              const videoEl = document.createElement('video');
              videoEl.autoplay = true;
              videoEl.playsInline = true;
              videoEl.style.width = '100%';
              videoEl.style.height = '100%';
              videoEl.style.objectFit = 'cover';
              videoEl.id = `remote-video-${userId}`;
              
              const wrapper = document.createElement('div');
              wrapper.className = 'flex-1 bg-black rounded overflow-hidden relative';
              
              const label = document.createElement('div');
              label.className = 'absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm';
              label.textContent = `User ${userId.slice(0, 8)}`;
              
              wrapper.appendChild(videoEl);
              wrapper.appendChild(label);
              remoteContainerRef.current.appendChild(wrapper);
              remoteVideos[userId] = videoEl;
              
              // Use the correct method for rendering remote video
              await ms.renderVideo(videoEl, userId);
              console.log('Remote video rendered for user:', userId);
            } catch (renderError) {
              console.error('Failed to render remote video:', renderError);
            }
          }
          
          if (action === 'Stop') {
            const videoEl = remoteVideos[userId];
            if (videoEl && videoEl.parentElement) {
              videoEl.parentElement.remove();
              delete remoteVideos[userId];
              console.log('Remote video removed for user:', userId);
            }
          }
        });

        // Listen for audio changes
        zmClient.on('peer-audio-state-change', async (payload: any) => {
          console.log('Peer audio state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start' && remoteAudioRef.current) {
            try {
              const audioEl = await ms.attachAudio(userId);
              if (audioEl) {
                audioEl.autoplay = true;
                audioEl.id = `remote-audio-${userId}`;
                remoteAudioRef.current.appendChild(audioEl);
                console.log('Remote audio attached for user:', userId);
              }
            } catch (audioError) {
              console.error('Failed to attach remote audio:', audioError);
            }
          }
          
          if (action === 'Stop' && remoteAudioRef.current) {
            const audioEl = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
            if (audioEl) {
              audioEl.remove();
              console.log('Remote audio removed for user:', userId);
            }
          }
        });

        // Also listen for the general stream-updated event as fallback
        zmClient.on('stream-updated', async (payload: any) => {
          console.log('Stream updated (fallback):', payload);
          // This is a fallback in case the specific events don't work
        });

        // Handle user leaving (cleanup)
        zmClient.on('user-removed', (payload: any) => {
          const { userId } = payload;
          console.log('Cleaning up for removed user:', userId);
          
          // Clean up video
          const videoEl = remoteVideos[userId];
          if (videoEl && videoEl.parentElement) {
            videoEl.parentElement.remove();
            delete remoteVideos[userId];
          }
          
          // Clean up audio
          if (remoteAudioRef.current) {
            const audioEl = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
            if (audioEl) {
              audioEl.remove();
            }
          }
        });

      } catch (e: any) {
        console.error('Zoom initialization error:', e);
        setError(`Eroare la conectarea la sesiune: ${e.message}`);
      }
    };

    initializeZoom();

    // Cleanup function
    return () => {
      if (client) {
        client.leave().catch(console.error);
        client.destroy();
      }
    };
  }, [sessionInfo, auth]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !localContainerRef.current) return;
    try {
      if (isVideoOn) {
        await mediaStream.stopVideo();
        setVideoOn(false);
      } else {
        const videoEl = localContainerRef.current.querySelector('video');
        if (videoEl) {
          await mediaStream.startVideo({ videoElement: videoEl });
          setVideoOn(true);
        }
      }
    } catch (e: any) {
      console.error('Toggle video error:', e);
      setError(`Eroare video: ${e.message}`);
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
      console.error('Toggle audio error:', e);
      setError(`Eroare audio: ${e.message}`);
    }
  }, [mediaStream, isAudioOn]);

  const debugParticipants = useCallback(() => {
    if (!client) return;
    
    const allUsers = client.getAllUser();
    console.log('=== DEBUG PARTICIPANTS ===');
    console.log('Total participants:', allUsers.length);
    console.log('Current user:', client.getCurrentUserInfo());
    
    allUsers.forEach((user: any, index: number) => {
      console.log(`Participant ${index + 1}:`, {
        userId: user.userId,
        displayName: user.displayName,
        bVideoOn: user.bVideoOn,
        bAudioOn: user.bAudioOn,
        isHost: user.isHost,
        isManager: user.isManager
      });
    });
    
    console.log('=== END DEBUG ===');
  }, [client]);

  const leave = useCallback(async () => {
    if (!client) return;
    try {
      await client.leave();
      client.destroy();
      setClient(null);
      setMediaStream(null);
      setSessionInfo(null);
      // Redirect or show success message
      window.location.href = '/dashboard';
    } catch (e) {
      console.error('Error leaving session:', e);
    }
  }, [client]);

  // Determine if current user is provider or client
  const isProvider = sessionInfo && auth?.user && sessionInfo.provider.id === auth.user.id;
  const otherParticipant = isProvider ? sessionInfo?.client : sessionInfo?.provider;

  if (status === 'loading' || loading) return <p>Se încarcă sesiunea...</p>;
  if (!auth?.user) return <p>Unauthorized</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;
  if (!sessionInfo) return <p>Se pregătește sesiunea...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p><strong>Client:</strong> {sessionInfo.client.name}</p>
          <p><strong>Furnizor:</strong> {sessionInfo.provider.name}</p>
          <p><strong>Participanți activi:</strong> {participants.length}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Timp rămas: {timeLeft}</p>
          <p className="text-sm text-gray-600">
            Sesiune: {new Date(sessionInfo.startDate).toLocaleTimeString()} - {new Date(sessionInfo.endDate).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-96">
        {/* Local video */}
        <div className="flex-1 flex flex-col">
          <h3 className="mb-2 font-semibold">
            Tu ({auth.user.name}) {isProvider ? '(Furnizor)' : '(Client)'}
          </h3>
          <div ref={localContainerRef} className="flex-1 bg-black rounded overflow-hidden" />
          <div className="mt-2 flex space-x-2">
            <button 
              onClick={toggleVideo} 
              disabled={!mediaStream} 
              className={`px-4 py-2 rounded-lg shadow text-white ${
                isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isVideoOn ? 'Oprește Video' : 'Pornește Video'}
            </button>
            <button 
              onClick={toggleAudio} 
              disabled={!mediaStream} 
              className={`px-4 py-2 rounded-lg shadow text-white ${
                isAudioOn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
            </button>
            <button 
              onClick={debugParticipants} 
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow text-sm"
            >
              Debug
            </button>
          </div>
        </div>

        {/* Remote video */}
        <div className="flex-1 flex flex-col">
          <h3 className="mb-2 font-semibold">
            {otherParticipant?.name} {isProvider ? '(Client)' : '(Furnizor)'}
          </h3>
          <div ref={remoteContainerRef} className="flex-1 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
            {participants.length <= 1 && (
              <p className="text-white text-center">
                Așteptăm ca {otherParticipant?.name} să se conecteze...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio container for remote audio */}
      <div ref={remoteAudioRef} className="hidden" />

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Sesiune ID: {sessionId}
        </div>
        <button 
          onClick={leave} 
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow font-semibold"
        >
          Părăsește sesiunea
        </button>
      </div>
    </div>
  );
}