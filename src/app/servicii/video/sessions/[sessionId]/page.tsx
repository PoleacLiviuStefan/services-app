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
  const [browserCapabilities, setBrowserCapabilities] = useState<any>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(true);
  const clientRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced logging
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[${timestamp}] [VideoSession] ${message}`, data || "");
  };

  const logError = (message: string, error?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.error(`[${timestamp}] [VideoSession ERROR] ${message}`, error || "");
  };

  // Check browser capabilities
  const checkBrowserCapabilities = useCallback(() => {
    const capabilities = {
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      hasWebGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      isSecureContext: window.isSecureContext,
      userAgent: navigator.userAgent,
      // Zoom-specific capabilities
      useVideoElement: mediaStream ? (
        typeof mediaStream.isRenderSelfViewWithVideoElement === 'function' 
          ? mediaStream.isRenderSelfViewWithVideoElement() 
          : false
      ) : false,
      supportsMultiple: mediaStream ? (
        typeof mediaStream.isSupportMultipleVideos === 'function' 
          ? mediaStream.isSupportMultipleVideos() 
          : false
      ) : false
    };
    
    setBrowserCapabilities(capabilities);
    log("🔍 Browser Capabilities:", capabilities);
    return capabilities;
  }, [mediaStream]);

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

  // Cleanup function
  const cleanup = useCallback(async () => {
    log("🧹 Cleaning up...");
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

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

  // Initialize local video with proper SDK detection
  const initializeLocalVideo = useCallback(async () => {
    if (!mediaStream || !localVideoRef.current || !isVideoOn) return false;

    try {
      const videoElement = localVideoRef.current;
      const capabilities = browserCapabilities || checkBrowserCapabilities();
      
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
  }, [mediaStream, isVideoOn, client, browserCapabilities, checkBrowserCapabilities]);

  // Enhanced remote video rendering with browser-specific fixes
  const renderRemoteVideo = useCallback(async (user: ZoomUser) => {
    if (!mediaStream || !user.bVideoOn) return false;

    try {
      log(`🎬 Browser-specific rendering for ${user.displayName} (${user.userId})`);
      
      const capabilities = browserCapabilities || checkBrowserCapabilities();
      
      // Step 1: Always subscribe first (critical for remote video)
      if (client && typeof client.subscribe === 'function') {
        try {
          log(`📡 Subscribing to video for user ${user.userId}...`);
          await client.subscribe(user.userId, 'video');
          log(`✅ Successfully subscribed to ${user.displayName}`);
          
          // Longer wait for non-SAB browsers
          const waitTime = capabilities.hasSharedArrayBuffer ? 1500 : 3000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } catch (subError) {
          logError(`❌ Subscription failed for ${user.displayName}`, subError);
          // Continue anyway - some SDK versions don't require explicit subscription
        }
      }

      // Step 2: Choose rendering method based on browser capabilities
      if (capabilities.hasSharedArrayBuffer && capabilities.supportsMultiple && remoteCanvasRef.current) {
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
            log(`✅ Canvas renderVideo succeeded for ${user.displayName}`);
            setRemoteVideoReady(true);
            setActiveRemoteUser(user);
            return true;
          }
        } catch (canvasError) {
          logError(`❌ Canvas renderVideo failed for ${user.displayName}`, canvasError);
        }
      }

      // Method B: For non-SharedArrayBuffer browsers, try alternative methods
      if (!capabilities.hasSharedArrayBuffer) {
        log(`🔧 Non-SAB browser detected - using alternative video rendering`);
        
        // Try startReceiveVideo (if available)
        if (typeof mediaStream.startReceiveVideo === 'function') {
          try {
            log(`📺 Attempting startReceiveVideo for ${user.displayName}`);
            const result = await mediaStream.startReceiveVideo(user.userId);
            
            if (result !== undefined) {
              log(`✅ startReceiveVideo succeeded for ${user.displayName}`);
              
              // Now try to get the video stream and attach it manually
              if (typeof mediaStream.getVideoStream === 'function') {
                const videoStream = mediaStream.getVideoStream(user.userId);
                if (videoStream && remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = videoStream;
                  await remoteVideoRef.current.play();
                  
                  setRemoteVideoReady(true);
                  setActiveRemoteUser(user);
                  log(`✅ Manual video stream attachment succeeded for ${user.displayName}`);
                  return true;
                }
              }
            }
          } catch (receiveError) {
            log(`⚠️ startReceiveVideo failed:`, receiveError);
          }
        }

        // Try individual video elements (new SDK approach)
        if (typeof client.renderVideoToElement === 'function') {
          try {
            log(`🆕 Attempting renderVideoToElement for ${user.displayName}`);
            const element = await client.renderVideoToElement(user.userId, {
              width: 640,
              height: 360,
              quality: 1
            });
            
            if (element && remoteVideoRef.current?.parentElement) {
              const container = remoteVideoRef.current.parentElement;
              container.replaceChild(element, remoteVideoRef.current);
              element.className = "w-full h-full object-cover";
              remoteVideoRef.current = element;
              setRemoteVideoReady(true);
              setActiveRemoteUser(user);
              log(`✅ renderVideoToElement succeeded for ${user.displayName}`);
              return true;
            }
          } catch (createError) {
            log(`⚠️ renderVideoToElement failed:`, createError);
          }
        }

        // Manual WebRTC track extraction
        const attemptManualExtraction = async () => {
          try {
            // Get the raw WebRTC peer connection if possible
            if (typeof client.getWebRTCManager === 'function') {
              const manager = client.getWebRTCManager();
              if (manager && typeof manager.getRemoteStream === 'function') {
                const stream = manager.getRemoteStream(user.userId);
                if (stream && stream.getVideoTracks().length > 0) {
                  log(`🎯 Found WebRTC stream for ${user.displayName}`);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                    await remoteVideoRef.current.play();
                    setRemoteVideoReady(true);
                    setActiveRemoteUser(user);
                    log(`✅ Manual WebRTC extraction succeeded!`);
                    return true;
                  }
                }
              }
            }
            
            // Try getting streams from the media manager
            if (typeof mediaStream.getActiveStreams === 'function') {
              const streams = mediaStream.getActiveStreams();
              const userStream = streams.find((s: any) => s.userId === user.userId || s.participantId === user.userId);
              
              if (userStream && userStream.mediaStream && remoteVideoRef.current) {
                log(`🎯 Found stream in active streams for ${user.displayName}`);
                remoteVideoRef.current.srcObject = userStream.mediaStream;
                await remoteVideoRef.current.play();
                setRemoteVideoReady(true);
                setActiveRemoteUser(user);
                log(`✅ Active streams extraction succeeded!`);
                return true;
              }
            }

            // Try getting video track directly
            if (typeof mediaStream.getRemoteVideoTrack === 'function') {
              const track = mediaStream.getRemoteVideoTrack(user.userId);
              if (track && remoteVideoRef.current) {
                const stream = new MediaStream([track]);
                remoteVideoRef.current.srcObject = stream;
                await remoteVideoRef.current.play();
                setRemoteVideoReady(true);
                setActiveRemoteUser(user);
                log(`✅ getRemoteVideoTrack succeeded!`);
                return true;
              }
            }
          } catch (e) {
            log(`❌ Manual extraction failed:`, e);
          }
          return false;
        };

        // Try manual extraction
        const manualSuccess = await attemptManualExtraction();
        if (manualSuccess) return true;

        // Enhanced event-driven approach for non-SAB browsers
        log(`👂 Setting up enhanced event listeners for non-SAB browser...`);
        
        const setupAdvancedEventHandling = () => {
          if (!client) return;

          const eventHandler = async (payload: any) => {
            if (payload.userId === user.userId && mountedRef.current && !remoteVideoReady) {
              log(`📹 Advanced event for ${user.displayName}:`, payload);
              
              // Wait for streams to stabilize
              setTimeout(async () => {
                if (!mountedRef.current || remoteVideoReady) return;
                
                // Try manual extraction again after event
                const success = await attemptManualExtraction();
                if (success) {
                  // Clean up listeners on success
                  const events = ['peer-video-state-change', 'video-active-change', 'media-sdk-change', 
                                'stream-added', 'track-added', 'remote-stream-update'];
                  events.forEach(event => {
                    client.off?.(event, eventHandler);
                  });
                }
              }, 2000);
            }
          };

          // Listen to multiple event types
          const events = [
            'peer-video-state-change',
            'video-active-change', 
            'media-sdk-change',
            'stream-added',
            'track-added',
            'remote-stream-update'
          ];

          events.forEach(event => {
            if (typeof client.on === 'function') {
              client.on(event, eventHandler);
            }
          });

          // Auto cleanup after 20 seconds
          setTimeout(() => {
            events.forEach(event => {
              client.off?.(event, eventHandler);
            });
          }, 20000);
        };

        setupAdvancedEventHandling();

        // Periodic retry for stubborn browsers
        let retryCount = 0;
        const retryInterval = setInterval(async () => {
          if (retryCount >= 8 || remoteVideoReady || !mountedRef.current) {
            clearInterval(retryInterval);
            return;
          }
          
          retryCount++;
          log(`🔄 Retry attempt ${retryCount} for ${user.displayName}`);
          
          const success = await attemptManualExtraction();
          if (success) {
            clearInterval(retryInterval);
          }
        }, 4000);

        // Cleanup interval after 35 seconds
        setTimeout(() => clearInterval(retryInterval), 35000);
      }
      
      // Method C: Standard video element rendering (fallback for SAB browsers)
      if (capabilities.hasSharedArrayBuffer && remoteVideoRef.current && typeof mediaStream.attachVideo === 'function') {
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

      // Method D: Try renderVideo with video element (some SDK versions support this)
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

      log(`⏳ Remote video setup completed for ${user.displayName} - waiting for streams...`);
      return true; // Return true to indicate setup was attempted

    } catch (error) {
      logError(`❌ Remote video rendering failed for ${user.displayName}`, error);
      return false;
    }
  }, [mediaStream, client, browserCapabilities, checkBrowserCapabilities, remoteVideoReady]);

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

        if (typeof mediaStream.stopReceiveVideo === 'function') {
          await mediaStream.stopReceiveVideo(activeRemoteUser.userId);
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

  // Debug SDK methods
  const debugSDKMethods = useCallback(() => {
    if (!client || !mediaStream) {
      log("❌ No client or mediaStream available");
      return;
    }

    log("🔍 DEBUGGING YOUR SPECIFIC SDK INSTANCE:");
    
    // Check client methods
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter(prop => typeof client[prop] === 'function')
      .filter(name => name.toLowerCase().includes('video') || name.toLowerCase().includes('render') || name.toLowerCase().includes('stream'));
    
    log("📱 Client video-related methods:", clientMethods);
    
    // Check mediaStream methods  
    const streamMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(mediaStream))
      .filter(prop => typeof mediaStream[prop] === 'function')
      .filter(name => name.toLowerCase().includes('video') || name.toLowerCase().includes('render') || name.toLowerCase().includes('stream'));
      
    log("🎥 MediaStream video-related methods:", streamMethods);
    
    // Check for newer methods that might work
    const testMethods = [
      'renderVideoToElement',
      'getVideoElementForUser', 
      'getWebRTCManager',
      'getActiveStreams',
      'getRemoteStreams',
      'createVideoElement',
      'attachVideoToElement',
      'startReceiveVideo',
      'getVideoStream',
      'getRemoteVideoTrack'
    ];
    
    const availableAlternatives = testMethods.filter(method => 
      typeof client[method] === 'function' || typeof mediaStream[method] === 'function'
    );
    
    log("🆕 Available alternative methods:", availableAlternatives);
    
    // Test what happens when we try renderVideo
    if (typeof mediaStream.renderVideo === 'function' && remoteVideoRef.current) {
      const testUserId = participants.find(p => p.bVideoOn)?.userId;
      if (testUserId) {
        mediaStream.renderVideo(remoteVideoRef.current, testUserId, 640, 360, 0, 0, 1)
          .then(result => log("🧪 renderVideo test result:", result))
          .catch(error => log("🧪 renderVideo test error:", error));
      }
    }

    // Show current capabilities
    const caps = checkBrowserCapabilities();
    log("🔍 Current browser capabilities:", caps);
  }, [client, mediaStream, participants, checkBrowserCapabilities]);

  // Manual render remote video
  const manualRenderVideo = useCallback(async () => {
    const videoUser = participants.find(p => p.bVideoOn && p.userId !== client?.getCurrentUserInfo?.()?.userId);
    if (videoUser) {
      log(`🔧 Manual render attempt for ${videoUser.displayName}`);
      await renderRemoteVideo(videoUser);
    } else {
      log(`❌ No participant with video found`);
    }
  }, [participants, client, renderRemoteVideo]);

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

  // Main Zoom initialization
  useEffect(() => {
    if (!sessionInfo || !auth?.user || isInitialized) return;

    log("🚀 Initializing Zoom Video SDK");
    
    // Prevent multiple initializations
    let initializationAborted = false;

    (async () => {
      try {
        setConnectionStatus("connecting");
        setError("");

        // Clean up any existing client with longer delay
        try {
          if (typeof ZoomVideo.destroyClient === "function") {
            ZoomVideo.destroyClient();
          }
          // Longer delay to ensure cleanup
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          log("Cleanup warning:", e);
        }

        if (initializationAborted || !mountedRef.current) return;

        // Create and initialize client
        const zmClient = ZoomVideo.createClient();
        clientRef.current = zmClient;

        // Initialize with safer settings for problematic browsers
        await zmClient.init("en-US", "Global", {
          patchJsMedia: true,
          stayAwake: true,
          enforceMultipleVideos: false, // Disable for stability
          logLevel: "error", // Reduce log noise
          // Add browser-specific stability options
          enableLogUpload: false,
          enableDebugLogs: false,
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

        // Set up event listeners BEFORE any other operations
        zmClient.on("connection-change", (payload: any) => {
          log("🔗 Connection change", payload);
          if (payload.state && mountedRef.current) {
            setConnectionStatus(payload.state);
            
            // Handle unexpected disconnections
            if (payload.state === 'Closed' || payload.state === 'Reconnecting') {
              log("⚠️ Unexpected disconnection detected");
              setError("Connection lost. Please refresh the page.");
            }
          }
        });

        zmClient.on("user-added", () => {
          if (!mountedRef.current) return;
          log("👤 User added");
          setTimeout(() => mountedRef.current && updateParticipants(), 1000);
        });

        zmClient.on("user-removed", () => {
          if (!mountedRef.current) return;
          log("👤 User removed");
          setTimeout(() => mountedRef.current && updateParticipants(), 500);
        });

        zmClient.on("peer-video-state-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("📹 Peer video state change", payload);
          setTimeout(() => mountedRef.current && updateParticipants(), 500);
        });

        zmClient.on("video-active-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("🎥 Video active change", payload);
          setTimeout(() => mountedRef.current && updateParticipants(), 500);
        });

        // Add error event handler to catch SDK errors
        zmClient.on("error", (error: any) => {
          logError("❌ Zoom SDK Error:", error);
          if (error.message && error.message.includes("EmptyError")) {
            log("🔧 Detected EmptyError - implementing workaround");
            setError("SDK compatibility issue detected. Some features may be limited.");
          }
        });

        // Wait longer before checking capabilities
        setTimeout(() => {
          if (!mountedRef.current || !ms) return;
          
          try {
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
          } catch (capError) {
            logError("Error checking capabilities:", capError);
          }
        }, 3000);

        // DON'T start audio automatically - this seems to cause the EmptyError
        // Let user start audio manually to avoid the sequence error
        log("⏸️ Audio will be started manually to avoid SDK errors");

        // Initial participants update with longer delay
        setTimeout(() => {
          if (mountedRef.current && zmClient) {
            updateParticipants();
          }
        }, 4000);

      } catch (e: any) {
        if (!mountedRef.current || initializationAborted) return;
        logError("❌ Zoom initialization failed", e);
        
        // More specific error handling
        if (e.message && e.message.includes("EmptyError")) {
          setError("Browser compatibility issue. Please try refreshing or use a different browser.");
        } else if (e.message && e.message.includes("WebGL")) {
          setError("Graphics acceleration issue. Video calls may be limited.");
        } else {
          setError(`Connection failed: ${e.message}`);
        }
        setConnectionStatus("failed");
      }
    })();

    return () => {
      initializationAborted = true;
      cleanup();
    };
  }, [sessionInfo, auth?.user, isInitialized, updateParticipants, cleanup]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    log("🔄 Manual reconnection attempt");
    setConnectionStatus("connecting");
    setError("");
    setIsInitialized(false);
    
    // Force cleanup first
    await cleanup();
    
    // Wait before reinitializing
    setTimeout(() => {
      if (mountedRef.current) {
        // Trigger re-initialization by updating a dependency
        setIsInitialized(false);
      }
    }, 2000);
  }, [cleanup]);

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
        
        const capabilities = browserCapabilities || checkBrowserCapabilities();
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
  }, [mediaStream, isVideoOn, connectionStatus, browserCapabilities, checkBrowserCapabilities]);

  // Toggle audio with enhanced error handling
  const toggleAudio = useCallback(async () => {
    if (!mediaStream || connectionStatus !== "connected") return;

    try {
      if (isAudioOn) {
        await mediaStream.stopAudio();
        setAudioOn(false);
        log("🔇 Audio stopped");
      } else {
        log("🎤 Starting audio...");
        
        // Add delay to prevent EmptyError
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try starting audio with error handling
        try {
          await mediaStream.startAudio();
          setAudioOn(true);
          log("🔊 Audio started");
        } catch (audioError: any) {
          logError("Audio start failed", audioError);
          
          // Handle specific audio errors
          if (audioError.message && audioError.message.includes("EmptyError")) {
            log("🔧 EmptyError detected in audio - retrying with delay");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              await mediaStream.startAudio();
              setAudioOn(true);
              log("🔊 Audio started on retry");
            } catch (retryError) {
              logError("Audio retry also failed", retryError);
              setError("Audio initialization failed. Microphone may not be available.");
            }
          } else {
            setError(`Audio error: ${audioError.message}`);
          }
        }
      }
    } catch (e: any) {
      logError("Audio toggle error", e);
      setError(`Audio error: ${e.message}`);
    }
  }, [mediaStream, isAudioOn, connectionStatus]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    log("🔄 Manual reconnection attempt");
    setConnectionStatus("connecting");
    setError("");
    setIsInitialized(false);
    
    // Force cleanup first
    await cleanup();
    
    // Wait before reinitializing
    setTimeout(() => {
      if (mountedRef.current) {
        // Trigger re-initialization by updating a dependency
        setIsInitialized(false);
      }
    }, 2000);
  }, [cleanup]);
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
    const isEmptyError = error.includes("EmptyError") || error.includes("compatibility issue");
    const isConnectionError = error.includes("Connection lost") || error.includes("Connection failed");
    
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <p className="font-semibold">
          {isEmptyError ? "Browser Compatibility Issue" : 
           isConnectionError ? "Connection Problem" : "Error"}:
        </p>
        <p className="mt-2">{error}</p>
        
        {isEmptyError && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Possible solutions:</strong>
            </p>
            <ul className="text-xs text-yellow-700 mt-2 list-disc ml-5">
              <li>Try refreshing the page</li>
              <li>Use Chrome or Firefox if possible</li>
              <li>Enable hardware acceleration in browser settings</li>
              <li>Close other video applications</li>
            </ul>
          </div>
        )}
        
        <div className="mt-4 space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
          {(isConnectionError || isEmptyError) && (
            <button
              onClick={reconnect}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Try Reconnect
            </button>
          )}
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
              {useVideoElement && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  Video Element Mode
                </span>
              )}
              {browserCapabilities && !browserCapabilities.hasSharedArrayBuffer && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                  Non-SAB Browser
                </span>
              )}
              {browserCapabilities && !browserCapabilities.hasWebGL && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  Software WebGL
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

      {/* Audio Start Notice */}
      {connectionStatus === "connected" && !isAudioOn && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-blue-600 text-xl mr-3">🎤</div>
            <div className="flex-1">
              <h3 className="text-blue-800 font-medium">Audio Ready</h3>
              <p className="text-sm text-blue-700 mt-1">
                Click "🔊 Unmute" below to start your microphone. Audio is disabled by default to prevent connection issues.
              </p>
            </div>
          </div>
        </div>
      )}

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
              style={{ display: remoteVideoReady && browserCapabilities?.supportsMultiple ? "block" : "none" }}
            />
            
            {/* Video element fallback */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: remoteVideoReady && !browserCapabilities?.supportsMultiple ? "block" : "none" }}
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
                    <div className="text-center mt-3">
                      <p className="text-yellow-400 text-sm">
                        Setting up video connection...
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
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => updateParticipants()}
              disabled={connectionStatus !== "connected"}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
            
            <button
              onClick={debugSDKMethods}
              className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              🔍 Debug SDK
            </button>
            
            <button
              onClick={manualRenderVideo}
              disabled={connectionStatus !== "connected" || !participants.some(p => p.bVideoOn)}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              🎬 Manual Video Render
            </button>
            
            <button
              onClick={checkBrowserCapabilities}
              className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              🔍 Check Capabilities
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