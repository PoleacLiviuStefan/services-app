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

  // Video state - simplified
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [activeRemoteUser, setActiveRemoteUser] = useState<ZoomUser | null>(null);

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

  // Token validation
  const validateToken = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  };

  // FIXED: Simplified remote video rendering
  const renderRemoteVideo = useCallback(async (user: ZoomUser) => {
    if (!mediaStream || !user.bVideoOn || !mountedRef.current) {
      log(`❌ Cannot render video for ${user.displayName} - missing requirements`);
      return false;
    }

    try {
      log(`🎬 Starting video render for ${user.displayName} (${user.userId})`);
      
      // Method 1: Try attachVideo first (as SDK suggested)
      if (remoteVideoRef.current && typeof mediaStream.attachVideo === 'function') {
        try {
          log(`📺 Trying attachVideo for ${user.displayName}`);
          await mediaStream.attachVideo(remoteVideoRef.current, user.userId);
          
          // Wait a bit and check if video is playing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (remoteVideoRef.current.videoWidth > 0) {
            log(`✅ attachVideo succeeded for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (attachError) {
          logError(`❌ attachVideo failed for ${user.displayName}`, attachError);
        }
      }

      // Method 2: Try canvas rendering if available
      if (remoteCanvasRef.current && typeof mediaStream.renderVideo === 'function') {
        try {
          log(`🎨 Trying canvas renderVideo for ${user.displayName}`);
          const result = await mediaStream.renderVideo(
            remoteCanvasRef.current,
            user.userId,
            640, 360, 0, 0, 1
          );
          
          if (result === "" || result === undefined) {
            log(`✅ Canvas renderVideo succeeded for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (canvasError) {
          logError(`❌ Canvas renderVideo failed for ${user.displayName}`, canvasError);
        }
      }

      // Method 3: Try startReceiveVideo
      if (typeof mediaStream.startReceiveVideo === 'function') {
        try {
          log(`📡 Trying startReceiveVideo for ${user.displayName}`);
          await mediaStream.startReceiveVideo(user.userId);
          
          // Wait longer for stream to arrive
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try to get the stream
          if (typeof mediaStream.getVideoStream === 'function') {
            const stream = mediaStream.getVideoStream(user.userId);
            if (stream && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              await remoteVideoRef.current.play();
              
              if (remoteVideoRef.current.videoWidth > 0) {
                log(`✅ startReceiveVideo + getVideoStream succeeded for ${user.displayName}`);
                setRemoteVideoReady(true);
                setActiveRemoteUser(user);
                return true;
              }
            }
          }
        } catch (receiveError) {
          logError(`❌ startReceiveVideo failed for ${user.displayName}`, receiveError);
        }
      }

      // Method 4: Subscribe and wait for events
      if (client && typeof client.subscribe === 'function') {
        try {
          log(`📬 Subscribing to video events for ${user.displayName}`);
          await client.subscribe(user.userId, 'video');
          
          // Set up event listener for video streams
          const handleVideoStreamChange = async () => {
            if (!mountedRef.current || remoteVideoReady) return;
            
            // Try getting stream again after event
            if (typeof mediaStream.getVideoStream === 'function') {
              const stream = mediaStream.getVideoStream(user.userId);
              if (stream && remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                await remoteVideoRef.current.play();
                
                if (remoteVideoRef.current.videoWidth > 0) {
                  log(`✅ Event-driven stream succeeded for ${user.displayName}`);
                  setRemoteVideoReady(true);
                  setActiveRemoteUser(user);
                  
                  // Clean up listeners
                  client.off?.('video-active-change', handleVideoStreamChange);
                  client.off?.('peer-video-state-change', handleVideoStreamChange);
                  return true;
                }
              }
            }
          };

          // Listen for video events
          client.on?.('video-active-change', handleVideoStreamChange);
          client.on?.('peer-video-state-change', handleVideoStreamChange);
          
          // Auto cleanup after 15 seconds
          setTimeout(() => {
            client.off?.('video-active-change', handleVideoStreamChange);
            client.off?.('peer-video-state-change', handleVideoStreamChange);
          }, 15000);
          
          // Try immediately as well
          await handleVideoStreamChange();
          
        } catch (subscribeError) {
          logError(`❌ Subscribe failed for ${user.displayName}`, subscribeError);
        }
      }

      log(`⏳ Video setup completed for ${user.displayName} - waiting for stream`);
      return false;

    } catch (error) {
      logError(`❌ Video render completely failed for ${user.displayName}`, error);
      return false;
    }
  }, [mediaStream, client, remoteVideoReady]);

  // FIXED: Simplified local video initialization
  const initializeLocalVideo = useCallback(async () => {
    if (!mediaStream || !localVideoRef.current || !isVideoOn) return false;

    try {
      log("🎥 Initializing local video");

      // SDK recommends using video element directly for self view
      if (localVideoRef.current.srcObject) {
        log("✅ Local video already has stream");
        setLocalVideoReady(true);
        return true;
      }

      // Try to get current user's stream
      if (typeof mediaStream.getMediaStream === 'function') {
        const stream = mediaStream.getMediaStream();
        if (stream && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play();
          log("✅ Local video using MediaStream");
          setLocalVideoReady(true);
          return true;
        }
      }

      // For self view, the video element should be set automatically by startVideo
      // Just wait a bit and check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (localVideoRef.current.videoWidth > 0) {
        log("✅ Local video auto-initialized");
        setLocalVideoReady(true);
        return true;
      }

      log("❌ Could not initialize local video");
      return false;

    } catch (error) {
      logError("Local video initialization failed", error);
      return false;
    }
  }, [mediaStream, isVideoOn]);

  // Stop remote video
  const stopRemoteVideo = useCallback(async () => {
    try {
      if (activeRemoteUser && mediaStream) {
        // Try multiple stop methods
        if (typeof mediaStream.detachVideo === 'function' && remoteVideoRef.current) {
          await mediaStream.detachVideo(remoteVideoRef.current);
        }
        
        if (typeof mediaStream.stopReceiveVideo === 'function') {
          await mediaStream.stopReceiveVideo(activeRemoteUser.userId);
        }
        
        if (typeof mediaStream.stopRenderVideo === 'function') {
          if (remoteCanvasRef.current) {
            await mediaStream.stopRenderVideo(remoteCanvasRef.current, activeRemoteUser.userId);
          }
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

  // Update participants with improved logic
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
          }, 1500);
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

  // Reconnect function
  const reconnect = useCallback(async () => {
    if (connectionStatus === "connecting") {
      log("🚫 Reconnection already in progress");
      return;
    }
    
    log("🔄 Manual reconnection attempt");
    setConnectionStatus("connecting");
    setError("");
    
    await cleanup();
    clientRef.current = null;
    
    if (isInitialized) {
      setIsInitialized(false);
      log("✅ Reconnection setup complete");
    }
  }, [cleanup, connectionStatus, isInitialized]);

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
        if (!validateToken(data.token)) {
          throw new Error("Session token has expired");
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

  // FIXED: Main Zoom initialization - simplified and more robust
  useEffect(() => {
    if (!sessionInfo || !auth?.user || isInitialized || 
        connectionStatus === "connecting" || connectionStatus === "connected") {
      return;
    }

    log("🚀 Initializing Zoom Video SDK");
    
    let initializationAborted = false;

    (async () => {
      try {
        setConnectionStatus("connecting");
        setError("");

        // Clean up any existing client
        try {
          if (typeof ZoomVideo.destroyClient === "function") {
            ZoomVideo.destroyClient();
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          log("Cleanup warning:", e);
        }

        if (initializationAborted || !mountedRef.current) return;

        // Create and initialize client with minimal config
        const zmClient = ZoomVideo.createClient();
        clientRef.current = zmClient;

        await zmClient.init("en-US", "Global", {
          patchJsMedia: true,
          enforceMultipleVideos: true, // Enable this for better multi-video support
          logLevel: "error",
        });

        if (initializationAborted || !mountedRef.current) {
          await zmClient.leave();
          return;
        }

        // Join session
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || "User",
          ""
        );

        if (initializationAborted || !mountedRef.current) {
          await zmClient.leave();
          return;
        }

        log("✅ Successfully joined session");
        setClient(zmClient);
        setConnectionStatus("connected");
        setIsInitialized(true);

        const ms = zmClient.getMediaStream();
        setMediaStream(ms);

        // Set up essential event listeners only
        zmClient.on("connection-change", (payload: any) => {
          log("🔗 Connection change", payload);
          if (payload.state && mountedRef.current) {
            setConnectionStatus(payload.state);
            
            if (payload.state === 'Closed' && isInitialized) {
              log("⚠️ Connection lost - manual reconnect required");
              setError("Connection lost. Click 'Reconnect' below.");
            }
          }
        });

        // Simplified participant event handlers
        const handleParticipantChange = () => {
          if (!mountedRef.current) return;
          setTimeout(() => {
            if (mountedRef.current && clientRef.current) {
              updateParticipants();
            }
          }, 1000);
        };

        zmClient.on("user-added", handleParticipantChange);
        zmClient.on("user-removed", handleParticipantChange);
        zmClient.on("peer-video-state-change", handleParticipantChange);

        // Initial participants update
        setTimeout(() => {
          if (mountedRef.current && zmClient) {
            updateParticipants();
          }
        }, 2000);

      } catch (e: any) {
        if (!mountedRef.current || initializationAborted) return;
        logError("❌ Zoom initialization failed", e);
        setError(`Connection failed: ${e.message}`);
        setConnectionStatus("failed");
      }
    })();

    return () => {
      initializationAborted = true;
      if (!mountedRef.current) {
        cleanup();
      }
    };
  }, [sessionInfo, auth?.user, isInitialized, connectionStatus]);

  // Handle local video initialization when video is turned on
  useEffect(() => {
    if (isVideoOn && mediaStream && !localVideoReady) {
      setTimeout(async () => {
        if (mountedRef.current) {
          await initializeLocalVideo();
        }
      }, 1000);
    }
  }, [isVideoOn, mediaStream, localVideoReady, initializeLocalVideo]);

  // FIXED: Toggle video with proper self-view handling
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
        // Start video with video element for self view
        log("📹 Starting video...");
        
        const startVideoOptions: any = {
          videoQuality: "360p",
          facingMode: "user",
        };

        // Use video element for self view (recommended)
        if (localVideoRef.current) {
          startVideoOptions.videoElement = localVideoRef.current;
          log("📺 Using videoElement for self view");
        }

        await mediaStream.startVideo(startVideoOptions);
        setVideoOn(true);
        log("✅ Video started");
        
        // Auto-initialize local video after a short delay
        setTimeout(() => {
          if (mountedRef.current) {
            initializeLocalVideo();
          }
        }, 1500);
      }
    } catch (e: any) {
      logError("Video toggle error", e);
      if (e.type === "INSUFFICIENT_PRIVILEGES") {
        setError("Camera access denied. Please allow camera access.");
      } else {
        setError(`Video error: ${e.message}`);
      }
    }
  }, [mediaStream, isVideoOn, connectionStatus, initializeLocalVideo]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!mediaStream || connectionStatus !== "connected") return;

    try {
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
        log("🔇 Audio stopped");
      } else {
        log("🎤 Starting audio...");
        await new Promise(resolve => setTimeout(resolve, 500));
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

  // Manual render remote video function
  const manualRenderVideo = useCallback(async () => {
    const videoUser = participants.find(p => p.bVideoOn && p.userId !== client?.getCurrentUserInfo?.()?.userId);
    if (videoUser) {
      log(`🔧 Manual render attempt for ${videoUser.displayName}`);
      setRemoteVideoReady(false); // Reset state
      await renderRemoteVideo(videoUser);
    } else {
      log(`❌ No participant with video found`);
    }
  }, [participants, client, renderRemoteVideo]);

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
            Reload Page
          </button>
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Try Reconnect
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
            <div className="mt-2 flex items-center gap-4 flex-wrap">
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
            {/* Canvas for rendering (hidden by default) */}
            <canvas
              ref={remoteCanvasRef}
              width={640}
              height={360}
              className="w-full h-full object-cover absolute inset-0"
              style={{ display: remoteVideoReady && remoteCanvasRef.current?.width ? "block" : "none" }}
            />
            
            {/* Video element for attachVideo method */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: remoteVideoReady && !remoteCanvasRef.current?.width ? "block" : "none" }}
            />
            
            <div className={`absolute inset-0 flex items-center justify-center text-gray-400 ${
              remoteVideoReady ? "hidden" : "bg-gray-900"
            }`}>
              {participants.length === 0 ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Waiting for {other?.name} to join...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p>{participants.length} participant(s) connected</p>
                  <div className="text-sm mt-2 space-y-1">
                    {participants.map(p => (
                      <div key={p.userId} className="text-xs">
                        <strong>{p.displayName}</strong> - 
                        Video: <span className={p.bVideoOn ? "text-green-400" : "text-red-400"}>
                          {p.bVideoOn ? "ON" : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {participants.some(p => p.bVideoOn) && (
                    <div className="text-center mt-3">
                      <p className="text-yellow-400 text-sm">
                        Setting up remote video...
                      </p>
                      <button
                        onClick={manualRenderVideo}
                        className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                      >
                        🔧 Manual Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={updateParticipants}
              disabled={connectionStatus !== "connected"}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
            
            <button
              onClick={manualRenderVideo}
              disabled={connectionStatus !== "connected" || !participants.some(p => p.bVideoOn)}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              🎬 Retry Remote Video
            </button>
            
            {(connectionStatus === "failed" || connectionStatus === "disconnected") && (
              <button
                onClick={reconnect}
                className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                🔄 Reconnect
              </button>
            )}
            
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
    </div>
  );
}