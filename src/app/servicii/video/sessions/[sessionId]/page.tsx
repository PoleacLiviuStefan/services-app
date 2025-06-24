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
    
    // Remote streams handling - moved outside to be accessible by all functions
    const remoteVideos: Record<string, HTMLVideoElement> = {};
    
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

        // Function to render remote video with improved error handling
        const renderRemoteVideo = async (userId: string, forceRender = false) => {
          if (!remoteContainerRef.current) {
            console.log('Remote container not available');
            return;
          }
          
          if (remoteVideos[userId] && !forceRender) {
            console.log('Video already rendered for user:', userId);
            return;
          }
          
          try {
            console.log('Attempting to render remote video for user:', userId);
            
            // Clear existing video for this user if forcing re-render
            if (remoteVideos[userId]) {
              const existingWrapper = remoteVideos[userId].parentElement;
              if (existingWrapper) {
                existingWrapper.remove();
              }
              delete remoteVideos[userId];
            }
            
            const videoEl = document.createElement('video');
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.muted = false; // Allow audio from remote
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            videoEl.id = `remote-video-${userId}`;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'flex-1 bg-black rounded overflow-hidden relative';
            wrapper.id = `remote-wrapper-${userId}`;
            
            const label = document.createElement('div');
            label.className = 'absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm z-10';
            
            // Get user info for better labeling
            const userInfo = zmClient.getAllUser().find((u: any) => u.userId === userId);
            label.textContent = userInfo?.displayName || `User ${userId.slice(0, 8)}`;
            
            wrapper.appendChild(videoEl);
            wrapper.appendChild(label);
            
            // Clear container first, then add new video
            remoteContainerRef.current.innerHTML = '';
            remoteContainerRef.current.appendChild(wrapper);
            remoteVideos[userId] = videoEl;
            
            // Try multiple render methods
            let renderSuccess = false;
            
            // Method 1: Direct video element
            try {
              await ms.renderVideo(videoEl, userId);
              console.log('✅ Remote video rendered successfully (method 1) for user:', userId);
              renderSuccess = true;
            } catch (renderError1) {
              console.log('❌ Method 1 failed:', renderError1);
              
              // Method 2: Object with parameters
              try {
                await ms.renderVideo({ userId, videoElement: videoEl });
                console.log('✅ Remote video rendered successfully (method 2) for user:', userId);
                renderSuccess = true;
              } catch (renderError2) {
                console.log('❌ Method 2 failed:', renderError2);
                
                // Method 3: Try with canvas as fallback
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = 640;
                  canvas.height = 480;
                  canvas.style.width = '100%';
                  canvas.style.height = '100%';
                  canvas.style.objectFit = 'cover';
                  
                  wrapper.removeChild(videoEl);
                  wrapper.appendChild(canvas);
                  
                  await ms.renderVideo(canvas, userId);
                  console.log('✅ Remote video rendered successfully (method 3 - canvas) for user:', userId);
                  renderSuccess = true;
                } catch (renderError3) {
                  console.log('❌ Method 3 failed:', renderError3);
                }
              }
            }
            
            if (!renderSuccess) {
              // Show error message in video container
              const errorMsg = document.createElement('div');
              errorMsg.className = 'flex items-center justify-center h-full text-white text-center p-4';
              errorMsg.innerHTML = `
                <div>
                  <p>Nu se poate afișa video-ul pentru ${userInfo?.displayName || 'utilizator'}</p>
                  <p class="text-sm mt-2">Încercăm să reconectăm...</p>
                </div>
              `;
              wrapper.appendChild(errorMsg);
            }
            
          } catch (error) {
            console.error('Failed to render remote video:', error);
            
            // Show error in UI
            if (remoteContainerRef.current) {
              const errorDiv = document.createElement('div');
              errorDiv.className = 'flex items-center justify-center h-full text-white bg-red-900 bg-opacity-50 rounded';
              errorDiv.textContent = 'Eroare la afișarea video-ului';
              remoteContainerRef.current.appendChild(errorDiv);
            }
          }
        };

        // Set up participant tracking and video rendering
        const updateParticipants = async () => {
          const allUsers = zmClient.getAllUser();
          const currentUserId = zmClient.getCurrentUserInfo().userId;
          console.log('🔄 Updating participants:', {
            total: allUsers.length,
            currentUser: currentUserId,
            users: allUsers.map((u: any) => ({
              id: u.userId,
              name: u.displayName,
              video: u.bVideoOn,
              audio: u.bAudioOn
            }))
          });
          
          setParticipants(allUsers);
          
          // Find remote participants with video
          const remoteParticipants = allUsers.filter((user: any) => 
            user.userId !== currentUserId && user.bVideoOn
          );
          
          console.log('📹 Remote participants with video:', remoteParticipants.length);
          
          // Render video for each remote participant
          for (const user of remoteParticipants) {
            console.log('🎥 Attempting to render video for:', user.displayName, user.userId);
            await renderRemoteVideo(user.userId);
          }
          
          // Clean up videos for users who left or turned off video
          Object.keys(remoteVideos).forEach(userId => {
            const userStillHasVideo = remoteParticipants.some((u: any) => u.userId === userId);
            if (!userStillHasVideo) {
              console.log('🧹 Cleaning up video for user who left or turned off video:', userId);
              const videoEl = remoteVideos[userId];
              if (videoEl?.parentElement) {
                videoEl.parentElement.remove();
              }
              delete remoteVideos[userId];
            }
          });
        };

        // Initial participant list and video check
        await updateParticipants();
        
        // Multiple checks to ensure we catch all participants
        setTimeout(async () => {
          console.log('🔄 Second participant check...');
          await updateParticipants();
        }, 1000);
        
        setTimeout(async () => {
          console.log('🔄 Third participant check...');
          await updateParticipants();
        }, 3000);
        
        setTimeout(async () => {
          console.log('🔄 Final participant check...');
          await updateParticipants();
        }, 5000);

        // Listen for participant changes
        zmClient.on('user-added', async (payload: any) => {
          console.log('👤 User added:', payload);
          setTimeout(async () => {
            await updateParticipants();
          }, 500); // Small delay to ensure user is fully loaded
        });

        zmClient.on('user-removed', async (payload: any) => {
          console.log('👤 User removed:', payload);
          await updateParticipants();
          
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

        // Local video setup with improved error handling
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
            
            // Start local video
            await ms.startVideo({ videoElement: videoEl });
            setVideoOn(true);
            console.log('✅ Local video started successfully');
            
            // Force a participant update after local video starts
            setTimeout(async () => {
              console.log('🔄 Updating participants after local video start...');
              await updateParticipants();
            }, 1000);
            
          } catch (videoError) {
            console.warn('❌ Failed to start local video:', videoError);
            
            // Show error in local video container
            if (localContainerRef.current) {
              const errorDiv = document.createElement('div');
              errorDiv.className = 'flex items-center justify-center h-full text-white bg-red-900 bg-opacity-50 rounded';
              errorDiv.textContent = 'Camera indisponibilă';
              localContainerRef.current.appendChild(errorDiv);
            }
          }
        }

        // Start audio
        try {
          await ms.startAudio();
          setAudioOn(true);
          console.log('✅ Audio started successfully');
        } catch (audioError) {
          console.warn('❌ Failed to start audio:', audioError);
        }

        // Listen for when participants start/stop video - IMPROVED
        zmClient.on('peer-video-state-change', async (payload: any) => {
          console.log('🎥 Peer video state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start') {
            console.log('📹 Participant started video:', userId);
            // Force re-render with a small delay
            setTimeout(async () => {
              await renderRemoteVideo(userId, true);
            }, 500);
          }
          
          if (action === 'Stop') {
            console.log('📹 Participant stopped video:', userId);
            const videoEl = remoteVideos[userId];
            if (videoEl && videoEl.parentElement) {
              videoEl.parentElement.remove();
              delete remoteVideos[userId];
              console.log('✅ Remote video removed for user:', userId);
            }
          }
        });

        // Listen for audio changes - IMPROVED
        zmClient.on('peer-audio-state-change', async (payload: any) => {
          console.log('🔊 Peer audio state change:', payload);
          const { userId, action } = payload;
          
          if (action === 'Start' && remoteAudioRef.current) {
            try {
              // Try multiple methods to attach audio
              let audioEl;
              
              try {
                audioEl = await ms.attachAudio(userId);
              } catch (e) {
                console.log('First audio attach method failed, trying alternative...');
                audioEl = await ms.attachAudio({ userId });
              }
              
              if (audioEl) {
                audioEl.autoplay = true;
                audioEl.id = `remote-audio-${userId}`;
                audioEl.volume = 1.0; // Ensure volume is at maximum
                remoteAudioRef.current.appendChild(audioEl);
                console.log('✅ Remote audio attached for user:', userId);
              }
            } catch (audioError) {
              console.error('❌ Failed to attach remote audio:', audioError);
            }
          }
          
          if (action === 'Stop' && remoteAudioRef.current) {
            const audioEl = remoteAudioRef.current.querySelector(`#remote-audio-${userId}`);
            if (audioEl) {
              audioEl.remove();
              console.log('✅ Remote audio removed for user:', userId);
            }
          }
        });

        // Enhanced stream-updated event as fallback
        zmClient.on('stream-updated', async (payload: any) => {
          console.log('🔄 Stream updated (fallback):', payload);
          
          // Force participant update on any stream change
          setTimeout(async () => {
            await updateParticipants();
          }, 300);
        });

        // Additional event listeners for better connectivity
        zmClient.on('connection-change', (payload: any) => {
          console.log('🌐 Connection change:', payload);
        });
        
        zmClient.on('media-stream-change', async (payload: any) => {
          console.log('📺 Media stream change:', payload);
          // Re-check participants when media streams change
          setTimeout(async () => {
            await updateParticipants();
          }, 500);
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
    const currentUser = client.getCurrentUserInfo();
    
    console.log('=== 🔍 DEBUG PARTICIPANTS ===');
    console.log('📊 Total participants:', allUsers.length);
    console.log('👤 Current user:', {
      userId: currentUser?.userId,
      displayName: currentUser?.displayName,
      video: currentUser?.bVideoOn,
      audio: currentUser?.bAudioOn
    });
    
    allUsers.forEach((user: any, index: number) => {
      const isCurrentUser = user.userId === currentUser?.userId;
      console.log(`${isCurrentUser ? '👤' : '🧑‍💼'} Participant ${index + 1}${isCurrentUser ? ' (YOU)' : ''}:`, {
        userId: user.userId,
        displayName: user.displayName,
        bVideoOn: user.bVideoOn,
        bAudioOn: user.bAudioOn,
        isHost: user.isHost,
        isManager: user.isManager
      });
    });
    
    // Check DOM elements
    const localVideo = document.querySelector('#local-video, video');
    const remoteVideos = document.querySelectorAll('[id^="remote-video-"]');
    const remoteAudios = document.querySelectorAll('[id^="remote-audio-"]');
    
    console.log('🖥️ DOM State:');
    console.log('- Local video element:', localVideo ? '✅ Found' : '❌ Missing');
    console.log('- Remote video elements:', remoteVideos.length);
    console.log('- Remote audio elements:', remoteAudios.length);
    
    if (remoteVideos.length > 0) {
      remoteVideos.forEach((video, i) => {
        const videoEl = video as HTMLVideoElement;
        console.log(`  📹 Remote video ${i + 1}:`, {
          id: videoEl.id,
          readyState: videoEl.readyState,
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight,
          paused: videoEl.paused,
          muted: videoEl.muted
        });
      });
    }
    
    console.log('=== END DEBUG ===');
    
    // Try to force a participant update
    console.log('🔄 Forcing participant update...');
    setTimeout(() => {
      const ms = client.getMediaStream();
      if (ms) {
        const allUsers = client.getAllUser();
        const currentUserId = client.getCurrentUserInfo().userId;
        const remoteUsers = allUsers.filter((u: any) => u.userId !== currentUserId && u.bVideoOn);
        
        console.log('🎯 Found remote users with video:', remoteUsers.length);
        remoteUsers.forEach(async (user: any) => {
          console.log('🔄 Attempting to re-render video for:', user.displayName);
          // This would need access to renderRemoteVideo function
          // For now, just log the attempt
        });
      }
    }, 100);
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