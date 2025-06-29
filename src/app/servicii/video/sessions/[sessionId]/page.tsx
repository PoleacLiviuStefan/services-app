"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import ZoomVideo from "@zoom/videosdk";

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

  // Core state
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [client, setClient] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [isVideoOn, setVideoOn] = useState(false);
  const [isAudioOn, setAudioOn] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [participants, setParticipants] = useState<ZoomUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [isInitialized, setIsInitialized] = useState(false);

  // Video state
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [activeRemoteUser, setActiveRemoteUser] = useState<ZoomUser | null>(null);
  const [useVideoElement, setUseVideoElement] = useState<boolean>(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(true);
  const clientRef = useRef<any>(null);

  // Enhanced logging
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[${timestamp}] [VideoSession] ${message}`, data || "");
  };

  const logError = (message: string, error?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.error(`[${timestamp}] [VideoSession ERROR] ${message}`, error || "");
  };

  // Check SDK capabilities
  const checkSDKCapabilities = useCallback(() => {
    if (!mediaStream) return { useVideoElement: false, supportsMultiple: false };
    
    const capabilities = {
      useVideoElement: typeof mediaStream.isRenderSelfViewWithVideoElement === 'function' 
        ? mediaStream.isRenderSelfViewWithVideoElement() 
        : false,
      supportsMultiple: typeof mediaStream.isSupportMultipleVideos === 'function' 
        ? mediaStream.isSupportMultipleVideos() 
        : false,
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
    };
    
    log("SDK Capabilities:", capabilities);
    return capabilities;
  }, [mediaStream]);

  // Initialize local video with proper SDK detection
  const initializeLocalVideo = useCallback(async () => {
    if (!mediaStream || !localVideoRef.current || !isVideoOn) return false;

    try {
      const videoElement = localVideoRef.current;
      const capabilities = checkSDKCapabilities();
      
      log("🎥 Initializing local video with capabilities:", capabilities);

      if (capabilities.useVideoElement) {
        // SDK recommends using videoElement for this browser
        log("✅ Using videoElement rendering method");
        setLocalVideoReady(true);
        return true;
      } else if (capabilities.supportsMultiple) {
        // Use canvas rendering for multiple video support
        log("📊 Using canvas rendering method");
        
        const currentUser = client?.getCurrentUserInfo?.();
        if (currentUser) {
          try {
            // For self-view, we might need to use renderVideo on a canvas
            // But since we don't have a canvas for local video, try attachVideo
            if (typeof mediaStream.attachVideo === 'function') {
              await mediaStream.attachVideo(videoElement);
              log("✅ Local video attached via attachVideo");
              setLocalVideoReady(true);
              return true;
            }
          } catch (attachError) {
            log("⚠️ attachVideo failed, trying fallback", attachError);
          }
        }
      }

      // Fallback: try to get MediaStream directly
      if (typeof mediaStream.getMediaStream === 'function') {
        const stream = mediaStream.getMediaStream();
        if (stream && stream.getVideoTracks().length > 0) {
          videoElement.srcObject = stream;
          await videoElement.play();
          log("✅ Local video using direct MediaStream");
          setLocalVideoReady(true);
          return true;
        }
      }

      log("❌ Could not initialize local video");
      return false;

    } catch (error) {
      logError("Local video initialization failed", error);
      return false;
    }
  }, [mediaStream, isVideoOn, client, checkSDKCapabilities]);

  // Enhanced remote video rendering with proper subscription and fallbacks
  const renderRemoteVideo = useCallback(async (user: ZoomUser) => {
    if (!mediaStream || !user.bVideoOn) return false;

    try {
      log(`🎬 Starting remote video render for ${user.displayName} (${user.userId})`);
      
      const capabilities = checkSDKCapabilities();
      
      // Step 1: Always subscribe first (critical for remote video)
      if (client && typeof client.subscribe === 'function') {
        try {
          log(`📡 Subscribing to video for user ${user.userId}...`);
          await client.subscribe(user.userId, 'video');
          log(`✅ Successfully subscribed to ${user.displayName}`);
          
          // Give subscription time to establish
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (subError) {
          logError(`❌ Subscription failed for ${user.displayName}`, subError);
          // Continue anyway - some SDK versions don't require explicit subscription
        }
      }

      // Step 2: Choose rendering method based on capabilities
      if (capabilities.supportsMultiple && remoteCanvasRef.current) {
        // Method A: Canvas rendering (preferred for multiple video support)
        log(`🎨 Attempting canvas renderVideo for ${user.displayName}`);
        
        try {
          const canvas = remoteCanvasRef.current;
          const result = await mediaStream.renderVideo(
            canvas,
            user.userId,
            640,    // width
            360,    // height
            0,      // x
            0,      // y
            1       // quality (1=low, 2=medium, 3=high)
          );
          
          if (result === "" || result === undefined) {
            // Empty string or undefined can both indicate success in some SDK versions
            log(`✅ Canvas renderVideo initiated for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (canvasError) {
          logError(`❌ Canvas renderVideo failed for ${user.displayName}`, canvasError);
        }
      }
      
      // Method B: Video element rendering (fallback)
      if (remoteVideoRef.current && typeof mediaStream.attachVideo === 'function') {
        log(`📺 Attempting video element attach for ${user.displayName}`);
        
        try {
          const result = await mediaStream.attachVideo(remoteVideoRef.current, user.userId);
          
          if (result === "" || result === undefined) {
            log(`✅ Video element attach succeeded for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (attachError) {
          logError(`❌ Video element attach failed for ${user.displayName}`, attachError);
        }
      }

      // Method C: Try renderVideo with video element (some SDK versions support this)
      if (remoteVideoRef.current && typeof mediaStream.renderVideo === 'function') {
        log(`🔄 Attempting renderVideo with video element for ${user.displayName}`);
        
        try {
          const result = await mediaStream.renderVideo(
            remoteVideoRef.current,
            user.userId,
            640, 360, 0, 0, 1
          );
          
          if (result === "" || result === undefined) {
            log(`✅ Video element renderVideo succeeded for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (videoRenderError) {
          logError(`❌ Video element renderVideo failed for ${user.displayName}`, videoRenderError);
        }
      }

      // Method D: Event-based approach - set up listeners and wait
      log(`👂 Setting up event-based video rendering for ${user.displayName}`);
      
      if (client && typeof client.on === 'function') {
        const handleVideoReady = async (payload: any) => {
          if (payload.userId === user.userId && payload.action === 'Start') {
            log(`📹 Video stream ready event for ${user.displayName}`);
            
            // Try rendering again now that stream is confirmed ready
            setTimeout(async () => {
              if (!mountedRef.current) return;
              
              // Retry canvas method
              if (capabilities.supportsMultiple && remoteCanvasRef.current) {
                try {
                  const result = await mediaStream.renderVideo(
                    remoteCanvasRef.current,
                    user.userId,
                    640, 360, 0, 0, 1
                  );
                  
                  if (result === "" || result === undefined) {
                    log(`✅ Event-triggered canvas render succeeded for ${user.displayName}`);
                    setRemoteVideoReady(true);
                    setActiveRemoteUser(user);
                    
                    // Clean up event listener
                    client.off('peer-video-state-change', handleVideoReady);
                    client.off('active-video-change', handleVideoReady);
                  }
                } catch (eventError) {
                  logError(`❌ Event-triggered render failed for ${user.displayName}`, eventError);
                }
              }
            }, 1000);
          }
        };

        client.on('peer-video-state-change', handleVideoReady);
        client.on('active-video-change', handleVideoReady);
        
        // Clean up after 15 seconds
        setTimeout(() => {
          if (client && typeof client.off === 'function') {
            client.off('peer-video-state-change', handleVideoReady);
            client.off('active-video-change', handleVideoReady);
          }
        }, 15000);
      }

      log(`⏳ Remote video setup completed for ${user.displayName} - waiting for stream...`);
      return true; // Return true to indicate setup was attempted

    } catch (error) {
      logError(`❌ Remote video rendering failed for ${user.displayName}`, error);
      return false;
    }
  }, [mediaStream, client, checkSDKCapabilities]);

  // Stop remote video
  const stopRemoteVideo = useCallback(async () => {
    try {
      if (activeRemoteUser && mediaStream) {
        // Try multiple stop methods
        if (typeof mediaStream.stopRenderVideo === 'function') {
          if (remoteCanvasRef.current) {
            await mediaStream.stopRenderVideo(remoteCanvasRef.current, activeRemoteUser.userId);
          }
          if (remoteVideoRef.current) {
            await mediaStream.stopRenderVideo(remoteVideoRef.current, activeRemoteUser.userId);
          }
        }
        
        if (typeof mediaStream.detachVideo === 'function' && remoteVideoRef.current) {
          await mediaStream.detachVideo(remoteVideoRef.current);
        }
      }
      
      // Clean up elements
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.load();
      }
      
      if (remoteCanvasRef.current) {
        const ctx = remoteCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, remoteCanvasRef.current.width, remoteCanvasRef.current.height);
        }
      }
      
      setRemoteVideoReady(false);
      setActiveRemoteUser(null);
      log("✅ Remote video stopped");
    } catch (error) {
      logError("Error stopping remote video", error);
    }
  }, [activeRemoteUser, mediaStream]);

  // Update participants
  const updateParticipants = useCallback(async () => {
    if (!client || !mountedRef.current) return;

    try {
      if (typeof client.getAllUser === "function") {
        const users = client.getAllUser();
        log("👥 Updating participants", { count: users.length });
        
        setParticipants(users);

        // Handle remote video
        const currentUserId = client.getCurrentUserInfo?.()?.userId;
        const remoteUsers = users.filter((u: ZoomUser) => u.userId !== currentUserId);
        const userWithVideo = remoteUsers.find((u: ZoomUser) => u.bVideoOn);

        if (userWithVideo && (!activeRemoteUser || activeRemoteUser.userId !== userWithVideo.userId)) {
          // Stop current remote video if different user
          if (activeRemoteUser) {
            await stopRemoteVideo();
          }
          
          // Start new remote video after a brief delay
          setTimeout(() => {
            if (mountedRef.current) {
              renderRemoteVideo(userWithVideo);
            }
          }, 1000);
        } else if (!userWithVideo && activeRemoteUser) {
          // No one has video anymore
          await stopRemoteVideo();
        }
      }
    } catch (error) {
      logError("Error updating participants", error);
    }
  }, [client, activeRemoteUser, renderRemoteVideo, stopRemoteVideo]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    log("🧹 Cleaning up...");
    
    try {
      if (mediaStream) {
        if (isVideoOn && typeof mediaStream.stopVideo === "function") {
          await mediaStream.stopVideo();
        }
        if (isAudioOn && typeof mediaStream.stopAudio === "function") {
          await mediaStream.stopAudio();
        }
      }

      if (clientRef.current && typeof clientRef.current.leave === "function") {
        await clientRef.current.leave();
      }

      // Clean video elements
      [localVideoRef, remoteVideoRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current.srcObject = null;
          ref.current.load();
        }
      });

      // Clean canvas
      if (remoteCanvasRef.current) {
        const ctx = remoteCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, remoteCanvasRef.current.width, remoteCanvasRef.current.height);
        }
      }

    } catch (e) {
      logError("Cleanup error", e);
    }

    // Reset state
    if (mountedRef.current) {
      setClient(null);
      setMediaStream(null);
      setVideoOn(false);
      setAudioOn(false);
      setLocalVideoReady(false);
      setRemoteVideoReady(false);
      setActiveRemoteUser(null);
      setParticipants([]);
      setConnectionStatus("disconnected");
      setIsInitialized(false);
    }

    clientRef.current = null;
  }, [mediaStream, isVideoOn, isAudioOn]);

  // Fetch session info
  useEffect(() => {
    if (!sessionId) return;

    log("Fetching session info", { sessionId });
    setLoading(true);
    setError("");

    fetch(`/api/video/session-info/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mountedRef.current) return;
        log("Session info received", data);
        if (!data.sessionName || !data.token) {
          throw new Error(data.error || "Invalid session data");
        }
        setSessionInfo(data);
      })
      .catch((e) => {
        if (!mountedRef.current) return;
        logError("Error fetching session info", e);
        setError(`Error loading session: ${e.message}`);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!sessionInfo?.endDate) return;

    const updateTimer = () => {
      const diff = new Date(sessionInfo.endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        return false;
      }
      const m = String(Math.floor(diff / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(`${m}:${s}`);
      return true;
    };

    updateTimer();
    const interval = setInterval(() => {
      if (!updateTimer()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionInfo?.endDate]);

  // Main Zoom initialization
  useEffect(() => {
    if (!sessionInfo || !auth?.user || isInitialized) return;

    log("🚀 Initializing Zoom Video SDK");

    (async () => {
      try {
        setConnectionStatus("connecting");
        setError("");

        // Clean up any existing client
        try {
          if (typeof ZoomVideo.destroyClient === "function") {
            ZoomVideo.destroyClient();
          }
        } catch (e) {
          // Ignore
        }

        // Create and initialize client
        const zmClient = ZoomVideo.createClient();
        clientRef.current = zmClient;

        await zmClient.init("en-US", "Global", {
          patchJsMedia: true,
          stayAwake: true,
          enforceMultipleVideos: true, // Enable multiple videos
          logLevel: "warn",
        });

        // Join session
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || "User",
          ""
        );

        if (!mountedRef.current) {
          await zmClient.leave();
          return;
        }

        log("✅ Successfully joined session");
        setClient(zmClient);
        setConnectionStatus("connected");
        setIsInitialized(true);

        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Check SDK capabilities after initialization
        const capabilities = {
          useVideoElement: typeof ms.isRenderSelfViewWithVideoElement === 'function' 
            ? ms.isRenderSelfViewWithVideoElement() 
            : false,
          supportsMultiple: typeof ms.isSupportMultipleVideos === 'function' 
            ? ms.isSupportMultipleVideos() 
            : false
        };
        
        setUseVideoElement(capabilities.useVideoElement);
        log("📊 SDK initialized with capabilities:", capabilities);

        // Set up event listeners
        zmClient.on("user-added", () => {
          log("👤 User added");
          setTimeout(() => mountedRef.current && updateParticipants(), 1000);
        });

        zmClient.on("user-removed", () => {
          log("👤 User removed");
          setTimeout(() => mountedRef.current && updateParticipants(), 500);
        });

        zmClient.on("peer-video-state-change", (payload: any) => {
          log("📹 Peer video state change", payload);
          setTimeout(() => mountedRef.current && updateParticipants(), 500);
        });

        zmClient.on("connection-change", (payload: any) => {
          log("🔗 Connection change", payload);
          if (payload.state && mountedRef.current) {
            setConnectionStatus(payload.state);
          }
        });

        // Start audio by default
        try {
          if (typeof ms.startAudio === "function") {
            await ms.startAudio();
            setAudioOn(true);
            log("✅ Audio started");
          }
        } catch (audioError) {
          logError("Audio start failed", audioError);
        }

        // Initial participants update
        setTimeout(() => {
          if (mountedRef.current) updateParticipants();
        }, 2000);

      } catch (e: any) {
        if (!mountedRef.current) return;
        logError("❌ Zoom initialization failed", e);
        setError(`Connection failed: ${e.message}`);
        setConnectionStatus("failed");
      }
    })();

    return () => {
      cleanup();
    };
  }, [sessionInfo, auth?.user, isInitialized, updateParticipants, cleanup]);

  // Handle local video initialization when video is turned on
  useEffect(() => {
    if (isVideoOn && mediaStream && !localVideoReady) {
      setTimeout(async () => {
        if (mountedRef.current) {
          await initializeLocalVideo();
        }
      }, 500);
    }
  }, [isVideoOn, mediaStream, localVideoReady, initializeLocalVideo]);

  // Toggle video with SDK capability detection
  const toggleVideo = useCallback(async () => {
    if (!mediaStream || connectionStatus !== "connected") return;

    try {
      if (isVideoOn) {
        // Stop video
        if (typeof mediaStream.stopVideo === "function") {
          await mediaStream.stopVideo();
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.load();
        }
        setVideoOn(false);
        setLocalVideoReady(false);
        log("📹 Video stopped");
      } else {
        // Start video
        log("📹 Starting video...");
        
        const capabilities = checkSDKCapabilities();
        const startVideoOptions: any = {
          videoQuality: "360p",
          facingMode: "user",
        };

        // Use videoElement if SDK recommends it
        if (capabilities.useVideoElement && localVideoRef.current) {
          startVideoOptions.videoElement = localVideoRef.current;
          log("📺 Using videoElement option for video start");
        }

        await mediaStream.startVideo(startVideoOptions);
        setVideoOn(true);
        log("✅ Video started");
      }
    } catch (e: any) {
      logError("Video toggle error", e);
      if (e.type === "INSUFFICIENT_PRIVILEGES") {
        setError("Camera access denied. Please allow camera access.");
      } else {
        setError(`Video error: ${e.message}`);
      }
    }
  }, [mediaStream, isVideoOn, connectionStatus, checkSDKCapabilities]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!mediaStream || connectionStatus !== "connected") return;

    try {
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
        log("🔇 Audio stopped");
      } else {
        await mediaStream.startAudio();
        setAudioOn(true);
        log("🔊 Audio started");
      }
    } catch (e: any) {
      logError("Audio toggle error", e);
      setError(`Audio error: ${e.message}`);
    }
  }, [mediaStream, isAudioOn, connectionStatus]);

  // Leave session
  const leave = useCallback(async () => {
    log("👋 Leaving session...");
    setConnectionStatus("disconnecting");
    await cleanup();
    window.location.href = "/dashboard";
  }, [cleanup]);

  // Component cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Render component
  const isProvider = sessionInfo?.provider.id === auth?.user?.id;
  const other = isProvider ? sessionInfo?.client : sessionInfo?.provider;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!auth?.user) {
    return <div className="text-red-500 p-4">Unauthorized access</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <p className="font-semibold">Error:</p>
        <p className="mt-2">{error}</p>
        <div className="mt-4 space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
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
          <p>Preparing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold mb-2">Video Session</h2>
            <p><strong>Client:</strong> {sessionInfo.client.name}</p>
            <p><strong>Provider:</strong> {sessionInfo.provider.name}</p>
            <div className="mt-2 flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === "connected" ? "bg-green-100 text-green-800" :
                connectionStatus === "connecting" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {connectionStatus === "connected" ? "✅ Connected" :
                 connectionStatus === "connecting" ? "🔄 Connecting..." :
                 "❌ " + connectionStatus}
              </span>
              <span className="text-sm text-gray-600">
                Participants: {participants.length}
              </span>
              {useVideoElement && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  Video Element Mode
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">⏰ {timeLeft}</p>
            <p className="text-sm text-gray-600">
              {new Date(sessionInfo.startDate).toLocaleTimeString()} –{" "}
              {new Date(sessionInfo.endDate).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              📹 You ({auth.user.name})
            </h3>
            <div className="flex gap-2">
              <span className={`w-3 h-3 rounded-full ${isVideoOn ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`w-3 h-3 rounded-full ${isAudioOn ? "bg-green-500" : "bg-red-500"}`} />
            </div>
          </div>
          
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3 relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                display: isVideoOn ? "block" : "none",
                transform: "scaleX(-1)" // Mirror for better UX
              }}
            />
            
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p>Camera is off</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleVideo}
              disabled={connectionStatus !== "connected"}
              className={`flex-1 px-4 py-2 rounded text-white transition-colors ${
                isVideoOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50`}
            >
              {isVideoOn ? "📹 Stop Video" : "📹 Start Video"}
            </button>
            <button
              onClick={toggleAudio}
              disabled={connectionStatus !== "connected"}
              className={`flex-1 px-4 py-2 rounded text-white transition-colors ${
                isAudioOn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50`}
            >
              {isAudioOn ? "🔇 Mute" : "🔊 Unmute"}
            </button>
          </div>
        </div>

        {/* Remote Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              👤 {other?.name || "Participant"}
            </h3>
            <div className="text-sm text-gray-500">
              {activeRemoteUser && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  📹 {activeRemoteUser.displayName}
                </span>
              )}
            </div>
          </div>
          
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {/* Canvas for multiple video support */}
            <canvas
              ref={remoteCanvasRef}
              width={640}
              height={360}
              className="w-full h-full object-cover"
              style={{ display: remoteVideoReady ? "block" : "none" }}
            />
            
            {/* Video element fallback */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover absolute inset-0"
              style={{ display: remoteVideoReady && !mediaStream?.isSupportMultipleVideos?.() ? "block" : "none" }}
            />
            
            <div className={`absolute inset-0 flex items-center justify-center text-gray-400 ${
              remoteVideoReady ? "bg-transparent pointer-events-none" : "bg-gray-900"
            }`}>
              {participants.length === 0 ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Waiting for {other?.name} to join...</p>
                </div>
              ) : !remoteVideoReady ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p>{participants.length} participant(s) connected</p>
                  <div className="text-sm mt-2">
                    {participants.map(p => (
                      <div key={p.userId} className="text-xs mb-1">
                        <strong>{p.displayName}</strong> - 
                        Video: <span className={p.bVideoOn ? "text-green-400" : "text-red-400"}>
                          {p.bVideoOn ? "ON" : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {participants.some(p => p.bVideoOn) && (
                    <p className="text-yellow-400 text-sm mt-2">
                      Setting up video connection...
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => updateParticipants()}
            disabled={connectionStatus !== "connected"}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
          <span className="text-sm text-gray-500">
            Session: {sessionId}
          </span>
        </div>
        <button
          onClick={leave}
          disabled={connectionStatus === "disconnecting"}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {connectionStatus === "disconnecting" ? "🔃 Leaving..." : "🚪 Leave"}
        </button>
      </div>
    </div>
  );
}