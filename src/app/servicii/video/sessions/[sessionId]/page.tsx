"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

interface SessionInfo {
  sessionName: string;
  token: string;
  userId: string;
  startDate: string;
  endDate: string;
  provider: { id: string; name: string };
  client: { id: string; name: string };
  sessionKey?: string;
}

interface Participant {
  userId: string;
  displayName: string;
  audio: string;
  muted: boolean;
  video: string;
  avatar: string;
}

export default function ZoomVideoSession() {
  const { data: auth, status } = useSession();
  const { sessionId } = useParams();
  const router = useRouter();

  // State management
  const [step, setStep] = useState<string>("idle");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [zoomClient, setZoomClient] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>({});
  const [isInSession, setIsInSession] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Connection state tracking
  const [connectionState, setConnectionState] = useState<string>("idle");
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [sessionClosed, setSessionClosed] = useState<boolean>(false);
  const [hasJoinedOnce, setHasJoinedOnce] = useState<boolean>(false);
  const [intentionalLeave, setIntentionalLeave] = useState<boolean>(false);

  // Video elements state
  const [elementsReady, setElementsReady] = useState<boolean>(false);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [videoStarting, setVideoStarting] = useState<boolean>(false);

  // Refs
  const mountedRef = useRef(true);
  const zoomSdkRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const selfVideoElRef = useRef<HTMLVideoElement>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedOnceRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const currentUserIdRef = useRef<string>("");
  const cleanupInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Add log function
  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || "");
    setLogs((prev) => [...prev.slice(-30), logEntry]);
  }, []);

  // System check - simplified for video elements only
  const checkSystem = useCallback(() => {
    const info = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecure: window.isSecureContext,
      isLocalhost:
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1",

      // Critical requirements
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      crossOriginIsolated: window.crossOriginIsolated,

      // Browser capabilities
      hasWebRTC: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),

      // Browser detection
      userAgent: navigator.userAgent,
      isChrome: /Chrome/.test(navigator.userAgent),
      isSafari:
        /Safari/.test(navigator.userAgent) &&
        !/Chrome/.test(navigator.userAgent),
      isFirefox: /Firefox/.test(navigator.userAgent),

      // SDK status
      sdkLoaded: !!zoomSdkRef.current,
    };

    setSystemInfo(info);
    addLog("🔍 System check completed - using video elements only", info);

    return info;
  }, [addLog]);

  // Load Zoom SDK
  const loadZoomSDK = useCallback(async () => {
    if (zoomSdkRef.current || !mountedRef.current) {
      return zoomSdkRef.current;
    }

    try {
      addLog("📦 Loading Zoom Video SDK...");

      let zoomSDK = null;

      // Try window object first
      if (typeof window !== "undefined" && (window as any).ZoomVideo) {
        addLog("✅ Found Zoom SDK on window object");
        zoomSDK = (window as any).ZoomVideo;
      } else {
        // Try dynamic import
        try {
          addLog("📥 Attempting dynamic import...");
          const zoomModule = await import("@zoom/videosdk");
          zoomSDK = zoomModule.default || zoomModule;
          addLog("✅ Zoom SDK loaded via dynamic import");
        } catch (importError) {
          addLog("❌ Dynamic import failed", importError);
          throw new Error(
            "Failed to load Zoom Video SDK - ensure @zoom/videosdk is installed"
          );
        }
      }

      if (!zoomSDK || typeof zoomSDK.createClient !== "function") {
        throw new Error("Invalid Zoom SDK - createClient method not found");
      }

      zoomSdkRef.current = zoomSDK;
      addLog("✅ Zoom SDK loaded successfully");

      return zoomSDK;
    } catch (error: any) {
      addLog("❌ Failed to load Zoom SDK", error);
      throw error;
    }
  }, [addLog]);

  // Fetch session info
  const fetchSessionInfo = useCallback(async () => {
    if (!sessionId) {
      throw new Error("No session ID provided");
    }

    setStep("fetching-session");
    addLog("📡 Fetching session info...");

    try {
      const response = await fetch(`/api/video/session-info/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      addLog("✅ Session info received", data);
      setSessionInfo(data);
      return data;
    } catch (error: any) {
      addLog("❌ Failed to fetch session info", error);
      throw error;
    }
  }, [sessionId, addLog]);

  // Safe cleanup of video elements
const cleanupVideoElements = useCallback(() => {
  const container = videoContainerRef.current;
  if (!container) return;

  [selfVideoElRef.current, remoteVideoElRef.current].forEach(videoEl => {
    if (videoEl && videoEl.parentNode === container) {
      container.removeChild(videoEl);
    }
  });

  selfVideoElRef.current = null;
  remoteVideoElRef.current = null;
  setElementsReady(false);
}, []);


  // Setup video elements with better error handling
  const setupVideoElements = useCallback((): boolean => {
    if (cleanupInProgressRef.current) {
      addLog("⚠️ Cleanup in progress, delaying setup...");
      return false;
    }

    addLog("🎥 Setting up video elements...");

    const container = videoContainerRef.current;
    if (!container) {
      addLog("❌ Video container ref not available");
      return false;
    }

    try {
      // Curățare inițială
      cleanupVideoElements();

      // Așteaptă puțin să termine cleanup
      setTimeout(() => {
        try {
          // --- ELEMENT SELF-VIDEO ---
          const selfVideo = document.createElement("video");
          selfVideo.id = "self-video";
          selfVideo.autoplay = true;
          selfVideo.playsInline = true;
          selfVideo.muted = true; // Self-view trebuie mutat
          selfVideo.controls = false;
          selfVideo.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          width: 200px;
          height: 150px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          object-fit: cover;
          background: #1f2937;
          z-index: 10;
        `;
          // Handlere de debug
          [
            "loadstart",
            "loadedmetadata",
            "canplay",
            "playing",
            "error",
            "abort",
            "stalled",
          ].forEach((evt) =>
            selfVideo.addEventListener(evt, () =>
              addLog(`Self video event: ${evt}`)
            )
          );

          // --- ELEMENT REMOTE-VIDEO ---
          const remoteVideo = document.createElement("video");
          remoteVideo.id = "remote-video";
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.muted = false; // Remote audio trebuie activ
          remoteVideo.controls = false;
          remoteVideo.style.cssText = `
          width: 100%;
          height: 100%;
          border-radius: 8px;
          object-fit: cover;
          background: #1f2937;
        `;
          [
            "loadstart",
            "loadedmetadata",
            "canplay",
            "playing",
            "error",
            "abort",
            "stalled",
          ].forEach((evt) =>
            remoteVideo.addEventListener(evt, () =>
              addLog(`Remote video event: ${evt}`)
            )
          );

          // Adaugă în container
          container.appendChild(remoteVideo);
          container.appendChild(selfVideo);

          // Salvează referințe
          remoteVideoElRef.current = remoteVideo;
          selfVideoElRef.current = selfVideo;
          setElementsReady(true);

          addLog("✅ Video elements created and appended");
        } catch (err) {
          addLog("❌ Error in delayed setup", err);
        }
      }, 100);

      return true;
    } catch (err) {
      addLog("❌ Error setting up video elements", err);
      return false;
    }
  }, [addLog, cleanupVideoElements]);

  

  // Initialize Zoom SDK with minimal config
  const initializeZoomSDK = useCallback(
    async (sessionData: SessionInfo) => {
      const zoomSDK = zoomSdkRef.current;

      if (!zoomSDK) {
        throw new Error("Zoom Video SDK not available");
      }

      setStep("sdk-init");
      addLog("🚀 Initializing Zoom Video SDK...");

      try {
        // Clean up any existing client
        try {
          if (typeof zoomSDK.destroyClient === "function") {
            await zoomSDK.destroyClient();
            addLog("🧹 Cleaned up existing client");
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        // Create new client
        addLog("📱 Creating Zoom client...");
        const client = zoomSDK.createClient();

        if (!client) {
          throw new Error("Failed to create Zoom client");
        }

        setZoomClient(client);
        setupEnhancedVideoEvents(client)
        // MINIMAL config to prevent sharing conflicts
        addLog("⚙️ Initializing SDK with minimal config...");
        const initConfig = {
          debug: false, // Disable debug to reduce noise
          patchJsMedia: true,
          stayAwake: true,
          logLevel: "error", // Only errors
          webEndpoint: "zoom.us",
          dependentAssets: "https://source.zoom.us/2.18.0/lib",
          // CRITICAL: Disable sharing and advanced features that cause issues
          disableVideoShare: true,
          disableScreenShare: true,
          enforceMultipleVideos: false,
          disableWebGL: true, // Force video elements
          fallbackRenderer: true,
          // Disable features that might conflict
          disablePreviewVideo: true,
          disableAudioPreview: false,
        };

        addLog("🔧 Using minimal config:", initConfig);

        await client.init("en-US", "Global", initConfig);
        addLog("✅ SDK initialized successfully");

        // Setup event listeners
        setupEventListenersWithBVideoOnFix(client);

        return client;
      } catch (error: any) {
        addLog("❌ SDK initialization failed", error);
        throw error;
      }
    },
    [addLog]
  );

    const debugUserState = useCallback((label: string) => {
  if (!zoomClient) {
    addLog(`🐛 [${label}] No zoomClient available`);
    return;
  }

  try {
    // Get all users
    const allUsers = zoomClient.getAllUser();
    addLog(`🐛 [${label}] Total users in session: ${allUsers.length}`);
    
    // Current user info
    const currentUser = zoomClient.getCurrentUserInfo();
    addLog(`🐛 [${label}] Current user info:`, currentUser);
    
    // Check each user's video state
    allUsers.forEach((user: any, index: number) => {
      addLog(`🐛 [${label}] User ${index + 1}:`, {
        userId: user.userId,
        displayName: user.displayName,
        isHost: user.isHost,
        audio: user.audio,
        video: user.video,
        muted: user.muted,
        isCurrentUser: user.userId === currentUser.userId,
        isCurrentUserStr: String(user.userId) === String(currentUser.userId),
        videoState: user.video || 'unknown'
      });
    });

    // Media stream state
    if (mediaStream) {
      addLog(`🐛 [${label}] MediaStream methods available:`, {
        hasStartVideo: typeof mediaStream.startVideo === 'function',
        hasStopVideo: typeof mediaStream.stopVideo === 'function',
        hasAttachVideo: typeof mediaStream.attachVideo === 'function',
        hasStartAudio: typeof mediaStream.startAudio === 'function',
        hasStopAudio: typeof mediaStream.stopAudio === 'function'
      });
    } else {
      addLog(`🐛 [${label}] No mediaStream available`);
    }

    // Check video elements
    const selfEl = selfVideoElRef.current;
    const remoteEl = remoteVideoElRef.current;
    
    addLog(`🐛 [${label}] Video elements state:`, {
      selfElement: {
        exists: !!selfEl,
        width: selfEl?.videoWidth || 0,
        height: selfEl?.videoHeight || 0,
        readyState: selfEl?.readyState || 0,
        srcObject: !!selfEl?.srcObject,
        paused: selfEl?.paused
      },
      remoteElement: {
        exists: !!remoteEl,
        width: remoteEl?.videoWidth || 0,
        height: remoteEl?.videoHeight || 0,
        readyState: remoteEl?.readyState || 0,
        srcObject: !!remoteEl?.srcObject,
        paused: remoteEl?.paused
      }
    });

  } catch (error) {
    addLog(`🐛 [${label}] Debug error:`, error);
  }
}, [zoomClient, mediaStream, addLog]);

  // Update participants list
  const updateParticipants = useCallback(
    (client: any) => {
      try {
        const users = client.getAllUser();
        const participantList: Participant[] = users.map((user: any) => ({
          userId: String(user.userId),
          displayName: user.displayName || user.userId,
          audio: user.audio || "off",
          muted: user.muted || false,
          video: user.video || "off",
          avatar: user.avatar || "",
        }));

        setParticipants(participantList);
        addLog(`👥 Updated participants: ${participantList.length} users`);
      } catch (error) {
        addLog("❌ Failed to update participants", error);
      }
    },
    [addLog]
  );

    // Reconnect logic
  const attemptReconnect = useCallback(
    (client: any) => {
      if (
        !sessionInfo ||
        sessionClosed ||
        reconnectAttempts >= 3 ||
        intentionalLeave
      ) {
        return;
      }

      setReconnectAttempts((prev) => prev + 1);
      addLog(`🔄 Attempting reconnect ${reconnectAttempts + 1}/3...`);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(async () => {
        try {
          const joinResult = await client.join(
            sessionInfo.sessionName,
            sessionInfo.token,
            auth?.user?.name || "User",
            sessionInfo.sessionKey || ""
          );    
          addLog("✅ Reconnect successful", joinResult);
          const participants = client.getAllUser();
        console.log('Toți participanții:', participants);
        } catch (error) {
          addLog("❌ Reconnect failed", error);

          if (reconnectAttempts < 2) {
            attemptReconnect(client);
          } else {
            addLog("💥 Maximum reconnect attempts reached");
            setError("Connection lost and unable to reconnect");
            setSessionClosed(true);
          }
        }
      }, 3000);
    },
    [
      sessionInfo,
      sessionClosed,
      reconnectAttempts,
      intentionalLeave,
      auth?.user?.name,
      addLog,
    ]
  );

  const setupEventListenersWithDebug = useCallback((client: any) => {
  addLog("🎧 Setting up event listeners with enhanced debugging...");

  // User management events
  client.on("user-added", (payload: any) => {
    addLog("👥 User added", payload);
    debugUserState("USER-ADDED");
    updateParticipants(client);
  });

  client.on("user-removed", (payload: any) => {
    addLog("👥 User removed", payload);
    debugUserState("USER-REMOVED");
    updateParticipants(client);
  });

  client.on("user-updated", (payload: any) => {
    addLog("👥 User updated", payload);
    debugUserState("USER-UPDATED");
    updateParticipants(client);
  });

  // Video events with enhanced debugging
  client.on("video-on", (payload: any) => {
    addLog("🎥 Video started for user", payload);
    debugUserState("VIDEO-ON-EVENT");
    
    if (payload.userId === client.getCurrentUserInfo().userId) {
      setVideoEnabled(true);
      setVideoStarting(false);
      addLog("🎥 Self video confirmed ON by event");
    }

    // Immediate attempt to render with debugging
    setTimeout(() => {
      if (isInSession && !sessionClosed && elementsReady && streamReady) {
        addLog(`🎥 Attempting to render video for ${payload.userId}`);
        debugUserState("PRE-RENDER-VIDEO");
        renderVideoWithDelayedRetries(payload.userId);
      } else {
        addLog(`⚠️ Skipping video render - conditions not met:`, {
          isInSession,
          sessionClosed: !sessionClosed,
          elementsReady,
          streamReady
        });
      }
    }, 500);
  });

  client.on("video-off", (payload: any) => {
    addLog("📹 Video stopped for user", payload);
    debugUserState("VIDEO-OFF-EVENT");
    
    if (payload.userId === currentUserId) {
      setVideoEnabled(false);
      setVideoStarting(false);
    }
  });

  // Audio events
  client.on("audio-on", (payload: any) => {
    addLog("🎤 Audio started for user", payload);
    if (payload.userId === currentUserId) {
      setAudioEnabled(true);
    }
  });

  client.on("audio-off", (payload: any) => {
    addLog("🔇 Audio stopped for user", payload);
    if (payload.userId === currentUserId) {
      setAudioEnabled(false);
    }
  });

  // Connection events with debugging
  client.on("connection-change", (payload: any) => {
    addLog("🔗 Connection changed", payload);
    debugUserState("CONNECTION-CHANGE");
    setConnectionState(payload.state);

    if (payload.state === "Connected") {
      setIsInSession(true);
      setSessionClosed(false);
      setReconnectAttempts(0);
      setHasJoinedOnce(true);
      updateParticipants(client);
      addLog("✅ Session connected successfully");
      debugUserState("SESSION-CONNECTED");

      // Get media stream after connection with delay
      setTimeout(() => {
        try {
          const stream = client.getMediaStream();
          if (stream) {
            setMediaStream(stream);
            setStreamReady(true);
            addLog("✅ Media stream obtained and ready");
            debugUserState("MEDIA-STREAM-READY");
          }
        } catch (e) {
          addLog("⚠️ Could not get media stream", e);
        }
      }, 1000);
    } else if (payload.state === "Disconnected") {
      setIsInSession(false);
      setStreamReady(false);
      setVideoStarting(false);
      addLog("📡 Session disconnected");
      debugUserState("SESSION-DISCONNECTED");

      if (hasJoinedOnce && !intentionalLeave && reconnectAttempts < 3) {
        attemptReconnect(client);
      }
    } else if (payload.state === "Closed") {
      debugUserState("SESSION-CLOSED");
      if (hasJoinedOnceRef.current) {
        setSessionClosed(true);
        setIsInSession(false);
        setStreamReady(false);
        setVideoStarting(false);
        addLog("⚠️ Session closed after joining");
      } else {
        addLog("ℹ️ Session closed during initialization (normal)");
      }
    }
  });

  // Enhanced peer video state change
  client.on("peer-video-state-change", ({ userId, action }) => {
    addLog(`🎥 Peer video state change: userId=${userId}, action=${action}`);
    debugUserState("PEER-VIDEO-CHANGE");
    
    if (action !== "Start") return;
    
    setTimeout(async () => {
      if (!(isInSession && !sessionClosed && elementsReady && streamReady)) {
        addLog("⚠️ Skipping peer video render - conditions not met");
        return;
      }
      
      const remoteEl = remoteVideoElRef.current;
      if (!remoteEl) {
        addLog("❌ remoteVideo element not found");
        return;
      }

      try {
        addLog(`🎥 Attempting to attach remote video for userId=${userId}`);
        debugUserState("PRE-ATTACH-REMOTE");
        await mediaStream.attachVideo(remoteEl, userId);
        addLog(`✅ Remote video attached for userId=${userId}`);
      } catch (err: any) {
        addLog(`❌ Remote video attach failed for userId=${userId}:`, err);
        debugUserState("REMOTE-ATTACH-FAILED");
      }
    }, 500);
  });

  addLog("✅ Event listeners with debugging setup complete");
}, [
  addLog,
  currentUserId,
  isInSession,
  sessionClosed,
  reconnectAttempts,
  hasJoinedOnce,
  intentionalLeave,
  elementsReady,
  streamReady,
  debugUserState,
  updateParticipants,
  attemptReconnect
]);

  // Event listeners with focus on video stability
  const setupEventListeners = setupEventListenersWithDebug;







    // Fallback strategies for video rendering
const attemptVideoFallbacks = useCallback(
  async (userId: string, videoElement: HTMLVideoElement) => {
    addLog(`🔄 [Fallbacks] Starting fallback sequence for userId=${userId}`);
    console.log("[Fallbacks] zoomClient:", zoomClient);
    console.log("[Fallbacks] mediaStream:", mediaStream);

    try {
      // ---- Fallback 1 ----
      addLog("🔄 [Fallbacks] Fallback 1: Direct MediaStream access");
      console.log("[Fallback 1] requesting getUserMedia…");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        console.log("[Fallback 1] got stream:", stream);
        videoElement.srcObject = stream;
        await videoElement.play();
        addLog("✅ [Fallbacks] Fallback 1 successful - direct camera attached");
      } catch (streamError) {
        console.error("[Fallback 1] error:", streamError);
        addLog("❌ [Fallbacks] Fallback 1 failed", streamError);
      }

      // După 2s încearcă totuși și attachVideo
      setTimeout(() => {
        console.log("[Fallback 1] retry Zoom.attachVideo with", userId);
        mediaStream
          .attachVideo(videoElement, userId)
          .then(() => addLog("✅ [Fallbacks] Zoom.attachVideo succeeded after F1"))
          .catch((e: any) => console.error("[Fallback 1 retry] err:", e));
      }, 2000);

      // ---- Fallback 2 ----
      addLog("🔄 [Fallbacks] Fallback 2: Try userId variants");
      const variants = [userId, String(userId), parseInt(userId).toString()];
      console.log("[Fallback 2] variants:", variants);
      for (const variant of variants) {
        addLog(`🔄 [Fallbacks] Fallback 2: trying variant="${variant}"`);
        try {
          await mediaStream.attachVideo(videoElement, variant);
          addLog(`✅ [Fallbacks] Fallback 2 succeeded with "${variant}"`);
          break;
        } catch (e) {
          console.warn(`[Fallback 2] variant "${variant}" failed`, e);
        }
      }

      // ---- Fallback 3 ----
      addLog("🔄 [Fallbacks] Fallback 3: Force videoElement.play()");
      try {
        console.log("[Fallback 3] videoElement.play()…");
        const p = videoElement.play();
        if (p) await p;
        addLog("✅ [Fallbacks] Fallback 3 play() succeeded");
      } catch (playError) {
        console.error("[Fallback 3] error:", playError);
        addLog("❌ [Fallbacks] Fallback 3 failed", playError);
      }

      // ---- Fallback 4 ----
      addLog("🔄 [Fallbacks] Fallback 4: verify participants list");
      try {
        const all = zoomClient.getAllUser();
        console.log("[Fallback 4] all users:", all);
        const target = all.find((u: any) =>
          u.userId === userId || String(u.userId) === String(userId)
        );
        if (target) {
          addLog(`[Fallback 4] found target in list:`, target);
          await mediaStream.attachVideo(videoElement, target.userId);
          addLog("✅ [Fallbacks] Fallback 4 succeeded with verified user");
        } else {
          addLog("❌ [Fallbacks] Fallback 4: target not found in participants");
        }
      } catch (userError) {
        console.error("[Fallback 4] error:", userError);
        addLog("❌ [Fallbacks] Fallback 4 failed", userError);
      }
    } catch (err) {
      console.error("[Fallbacks] unexpected error:", err);
      addLog("❌ [Fallbacks] Unexpected error in fallback sequence", err);
    }
  },
  [zoomClient, mediaStream, addLog]
);


  // Enhanced video rendering with multiple fallback strategies
const renderVideo = useCallback(async (userId: string) => {
  if (!zoomClient || !mediaStream) {
    addLog("❌ No client or media stream for video rendering");
    return;
  }
  if (!elementsReady || !streamReady) {
    addLog(`⚠️ Skipping video render for ${userId} - not ready`);
    return;
  }

  const isSelf = userId === currentUserIdRef.current;
  const videoEl = isSelf ? selfVideoElRef.current : remoteVideoElRef.current;
  const which = isSelf ? 'Self' : 'Remote';

  if (!videoEl) {
    addLog(`❌ Nu există element ${which.toLowerCase()}-video pentru user ${userId}`);
    return;
  }

  addLog(`🎥 Attaching ${which}-video for user ${userId}`);
  try {
    // Atașează direct MediaStream-ul Zoom pe <video>
    addLog(`✅ attachVideo reușit pentru ${which} (${userId})`);
    await mediaStream.attachVideo(videoEl, userId);

    // Optional: după 1s, verifică că video-ul rulează
    setTimeout(() => {
      const ok = videoEl.videoWidth > 0 && videoEl.videoHeight > 0;
      addLog(`🔍 Verificare ${which}-video: ${ok ? 'OK' : 'FAIL'} (${videoEl.videoWidth}x${videoEl.videoHeight})`);
      if (!ok && isSelf) {
        addLog("⚠️ Self-view nu se afișează, începe fallback...");
        attemptVideoFallbacks(userId, videoEl);
      }
    }, 1000);
  } catch (err: any) {
    addLog(`❌ attachVideo eșuat pentru ${which} (${userId}):`, err);

    // La nevoie, fallback-uri
    if (isSelf) {
      attemptVideoFallbacks(userId, videoEl);
    }
  }
}, [zoomClient, mediaStream, elementsReady, streamReady, addLog, attemptVideoFallbacks]);




  // Join session with careful timing
const joinSession = useCallback(
  async (client: any, sessionData: SessionInfo) => {
    setStep("joining");
    addLog("🔗 Joining session...");

    try {
      // 🔄 Stabilization delay înainte de join
      addLog("⏳ Pre-join stabilization delay...");
      await new Promise((r) => setTimeout(r, 2000));

      // 🔗 Execuţie join
      const joinResult = await client.join(
        sessionData.sessionName,
        sessionData.token,
        auth?.user?.name || "User",
        sessionData.sessionKey || ""
      );
      addLog("✅ Successfully joined session", joinResult);

      // 🔑 Preluăm ID-ul numeric pe care SDK îl foloseşte intern
      const me = client.getCurrentUserInfo();
      const numericId = String(me.userId);
      setCurrentUserId(numericId);
      currentUserIdRef.current = numericId;
      addLog(`🔑 Current user numeric ID set to ${numericId}`);

      // ⏳ Mai aşteptăm puţin până media stream se stabilizează
      addLog("⏳ Waiting for session to fully stabilize...");
      await new Promise((r) => setTimeout(r, 1500));

      // 📥 Obţinem şi păstrăm media stream
      try {
        const stream = client.getMediaStream();
        if (stream) {
          setMediaStream(stream);
          setStreamReady(true);
          addLog("✅ Media stream obtained after join");
        } else {
          addLog("⚠️ No media stream available immediately after join");
        }
      } catch (e) {
        addLog("⚠️ Error getting media stream immediately after join", e);
      }

      setStep("connected");
      updateParticipants(client);

      return true;
    } catch (error: any) {
      addLog("❌ Failed to join session", error);
      throw error;
    }
  },
  [auth?.user?.name, addLog, updateParticipants]
);



  // Media control functions
  const toggleAudio = useCallback(async () => {
    if (!mediaStream || !isInSession || sessionClosed) {
      addLog("❌ Cannot toggle audio - session not active");
      return;
    }

    try {
      if (audioEnabled) {
        await mediaStream.stopAudio();
        setAudioEnabled(false);
        addLog("🔇 Audio disabled");
      } else {
        await mediaStream.startAudio();
        setAudioEnabled(true);
        addLog("🎤 Audio enabled");
      }
    } catch (error: any) {
      addLog("❌ Failed to toggle audio", error);
    }
  }, [mediaStream, isInSession, sessionClosed, audioEnabled, addLog]);



// Enhanced video state checker
const checkVideoCapabilities = useCallback(async () => {
  addLog(`🔍 [VideoCheck] Starting comprehensive video capability check...`);
  
  try {
    // Check browser capabilities
    const capabilities = {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
    };
    
    addLog(`🔍 [VideoCheck] Browser capabilities:`, capabilities);
    
    if (capabilities.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        addLog(`🔍 [VideoCheck] Video devices found: ${videoDevices.length}`, videoDevices.map(d => ({
          deviceId: d.deviceId,
          label: d.label,
          kind: d.kind
        })));
      } catch (e) {
        addLog(`🔍 [VideoCheck] Could not enumerate devices:`, e);
      }
    }
    
    // Test camera access
    if (capabilities.getUserMedia) {
      try {
        addLog(`🔍 [VideoCheck] Testing camera access...`);
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });
        
        const videoTrack = testStream.getVideoTracks()[0];
        addLog(`🔍 [VideoCheck] Camera test successful:`, {
          streamId: testStream.id,
          streamActive: testStream.active,
          trackLabel: videoTrack?.label,
          trackEnabled: videoTrack?.enabled,
          trackReadyState: videoTrack?.readyState,
          trackSettings: videoTrack?.getSettings()
        });
        
        // Clean up test stream
        testStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        addLog(`🔍 [VideoCheck] Camera test failed:`, e);
      }
    }
    
  } catch (error) {
    addLog(`🔍 [VideoCheck] Check failed:`, error);
  }
}, [addLog]);

// Enhanced Zoom video state checker
const checkZoomVideoState = useCallback(() => {
  if (!zoomClient || !mediaStream) {
    addLog(`🔍 [ZoomCheck] Missing zoomClient or mediaStream`);
    return;
  }
  
  addLog(`🔍 [ZoomCheck] Checking Zoom video state...`);
  
  try {
    const currentUser = zoomClient.getCurrentUserInfo();
    const allUsers = zoomClient.getAllUser();
    
    // Find current user in the list
    const userInList = allUsers.find((u: any) => 
      u.userId === currentUser.userId || 
      String(u.userId) === String(currentUser.userId)
    );
    
    addLog(`🔍 [ZoomCheck] Current user lookup:`, {
      currentUserFromSDK: currentUser,
      foundInUserList: !!userInList,
      userInListData: userInList || 'not found',
      totalUsersInList: allUsers.length
    });
    
    // Check if user is actually sending video according to Zoom
    if (userInList) {
      const isVideoOn = userInList.video === 'on' || userInList.video === true;
      addLog(`🔍 [ZoomCheck] User video state analysis:`, {
        videoProperty: userInList.video,
        isVideoOn,
        audioProperty: userInList.audio,
        muted: userInList.muted,
        isHost: userInList.isHost
      });
      
      if (!isVideoOn) {
        addLog(`⚠️ [ZoomCheck] USER IS NOT SENDING VIDEO according to Zoom SDK!`);
        addLog(`⚠️ [ZoomCheck] This explains the "user is not send video" error`);
      } else {
        addLog(`✅ [ZoomCheck] User IS sending video according to Zoom SDK`);
      }
    }
    
  } catch (error) {
    addLog(`🔍 [ZoomCheck] Check failed:`, error);
  }
}, [zoomClient, mediaStream, addLog]);

// Enhanced video start function that properly handles Zoom SDK video state
const startVideoWithProperEventHandling = useCallback(async () => {
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot start video - session not active");
    return false;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot start video - not ready");
    return false;
  }

  addLog("🎥 [Enhanced] Starting video with proper event handling...");
  
  try {
    // Step 1: Clear any existing video state
    setVideoStarting(true);
    setVideoEnabled(false);
    
    // Step 2: Wait for session to be completely stable
    addLog("⏳ [Enhanced] Ensuring session stability...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Check current video state before starting
    debugUserState("PRE-ENHANCED-START");
    
    // Step 4: Set up video-on event listener BEFORE starting video
    let videoOnReceived = false;
    const videoOnPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!videoOnReceived) {
          addLog("⚠️ [Enhanced] video-on event timeout after 10 seconds");
          resolve(false);
        }
      }, 10000);
      
      const handleVideoOn = (payload: any) => {
        const currentUser = zoomClient?.getCurrentUserInfo();
        if (payload.userId === currentUser?.userId) {
          addLog("✅ [Enhanced] video-on event received for current user");
          videoOnReceived = true;
          clearTimeout(timeout);
          zoomClient?.off('video-on', handleVideoOn);
          resolve(true);
        }
      };
      
      zoomClient?.on('video-on', handleVideoOn);
    });
    
    // Step 5: Start video with multiple fallback attempts
    let startVideoSuccess = false;
    
    // Attempt 1: Start with parameters
    try {
      addLog("🎥 [Enhanced] Attempt 1: Start with parameters");
      await mediaStream.startVideo({
        width: 640,
        height: 480,
        frameRate: 15,
      });
      addLog("✅ [Enhanced] startVideo with parameters succeeded");
      startVideoSuccess = true;
    } catch (error1) {
      addLog("⚠️ [Enhanced] Attempt 1 failed:", error1);
      
      // Attempt 2: Start without parameters
      try {
        addLog("🎥 [Enhanced] Attempt 2: Start without parameters");
        await mediaStream.startVideo();
        addLog("✅ [Enhanced] startVideo without parameters succeeded");
        startVideoSuccess = true;
      } catch (error2) {
        addLog("❌ [Enhanced] Both startVideo attempts failed:", error2);
        setVideoStarting(false);
        return false;
      }
    }
    
    if (!startVideoSuccess) {
      setVideoStarting(false);
      return false;
    }
    
    // Step 6: Wait for video-on event or timeout
    addLog("⏳ [Enhanced] Waiting for video-on event confirmation...");
    const eventReceived = await videoOnPromise;
    
    if (eventReceived) {
      addLog("✅ [Enhanced] Video successfully started with event confirmation");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // Trigger render after successful start
      setTimeout(() => {
        if (currentUserIdRef.current && selfVideoElRef.current) {
          addLog("🎥 [Enhanced] Triggering video render after confirmed start");
          renderVideoWithDelayedRetries(currentUserIdRef.current);
        }
      }, 500);
      
      return true;
    } else {
      addLog("⚠️ [Enhanced] video-on event not received, checking manual state");
      
      // Manual state check as fallback
      await new Promise(resolve => setTimeout(resolve, 2000));
      debugUserState("POST-START-MANUAL-CHECK");
      
      const currentUser = zoomClient?.getCurrentUserInfo();
      const allUsers = zoomClient?.getAllUser() || [];
      const userInList = allUsers.find((u: any) => 
        u.userId === currentUser?.userId || 
        String(u.userId) === String(currentUser?.userId)
      );
      
      if (userInList && (userInList.video === 'on' || userInList.video === true)) {
        addLog("✅ [Enhanced] Manual check confirms video is on");
        setVideoEnabled(true);
        setVideoStarting(false);
        
        // Trigger render
        setTimeout(() => {
          if (currentUserIdRef.current && selfVideoElRef.current) {
            renderVideoWithDelayedRetries(currentUserIdRef.current);
          }
        }, 500);
        
        return true;
      } else {
        addLog("❌ [Enhanced] Manual check confirms video failed to start");
        setVideoStarting(false);
        
        // Try to force direct camera as last resort
        addLog("🚨 [Enhanced] Attempting direct camera fallback...");
        try {
          const directStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          
          if (selfVideoElRef.current) {
            selfVideoElRef.current.srcObject = directStream;
            await selfVideoElRef.current.play();
            addLog("✅ [Enhanced] Direct camera fallback successful");
            
            // Don't set videoEnabled=true for direct camera, as it's not through Zoom
            setVideoStarting(false);
            return false; // Return false because Zoom video didn't work
          }
        } catch (directError) {
          addLog("❌ [Enhanced] Direct camera fallback failed:", directError);
        }
        
        return false;
      }
    }
    
  } catch (error) {
    addLog("❌ [Enhanced] Enhanced video start failed:", error);
    setVideoEnabled(false);
    setVideoStarting(false);
    return false;
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  streamReady,
  elementsReady,
  zoomClient,
  addLog,
  debugUserState,
  renderVideo
]);

// Alternative approach: Force video state synchronization
const forceVideoStateSync = useCallback(async () => {
  if (!zoomClient || !mediaStream) {
    addLog("❌ [ForceSync] No client or media stream");
    return;
  }
  
  addLog("🔄 [ForceSync] Attempting to force video state synchronization...");
  
  try {
    // Step 1: Stop any existing video
    try {
      await mediaStream.stopVideo();
      addLog("🔄 [ForceSync] Stopped existing video");
    } catch (e) {
      addLog("🔄 [ForceSync] No existing video to stop");
    }
    
    // Step 2: Wait for state to clear
    await new Promise(resolve => setTimeout(resolve, 2000));
    debugUserState("FORCE-SYNC-AFTER-STOP");
    
    // Step 3: Start video with event monitoring
    let videoStateChanged = false;
    const stateChangePromise = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentUser = zoomClient.getCurrentUserInfo();
        const allUsers = zoomClient.getAllUser() || [];
        const userInList = allUsers.find((u: any) => 
          u.userId === currentUser?.userId
        );
        
        if (userInList && (userInList.video === 'on' || userInList.video === true)) {
          addLog("✅ [ForceSync] Video state detected as 'on'");
          videoStateChanged = true;
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 500);
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (!videoStateChanged) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 15000);
    });
    
    // Step 4: Start video
    addLog("🎥 [ForceSync] Starting video...");
    await mediaStream.startVideo({
      width: 640,
      height: 480,
      frameRate: 15,
    });
    
    // Step 5: Wait for state change
    const stateChanged = await stateChangePromise;
    
    if (stateChanged) {
      addLog("✅ [ForceSync] Video state successfully synchronized");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // Render video
      if (currentUserIdRef.current && selfVideoElRef.current) {
        setTimeout(() => {
          renderVideoWithDelayedRetries(currentUserIdRef.current);
        }, 500);
      }
      
      return true;
    } else {
      addLog("❌ [ForceSync] Video state sync failed");
      return false;
    }
    
  } catch (error) {
    addLog("❌ [ForceSync] Force sync failed:", error);
    return false;
  }
}, [zoomClient, mediaStream, addLog, debugUserState, renderVideo]);

// Enhanced toggle video that uses the new start function
const toggleVideoEnhanced = useCallback(async () => {
  addLog(`🎥 [ToggleEnhanced] Starting enhanced toggle video...`);
  
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot toggle video - session not active");
    return;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot toggle video - not ready");
    return;
  }

  if (videoStarting) {
    addLog("⚠️ Video start already in progress");
    return;
  }

  try {
    if (videoEnabled) {
      // Stop video
      addLog("📹 [Enhanced] Stopping video...");
      debugUserState("ENHANCED-BEFORE-STOP");
      
      await mediaStream.stopVideo();
      setVideoEnabled(false);
      setVideoStarting(false);
      
      // Clear any direct camera streams
      if (selfVideoElRef.current && selfVideoElRef.current.srcObject) {
        const stream = selfVideoElRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        selfVideoElRef.current.srcObject = null;
      }
      
      debugUserState("ENHANCED-AFTER-STOP");
      addLog("📹 [Enhanced] Video disabled successfully");
    } else {
      // Start video with enhanced handling
      const success = await startVideoWithProperEventHandling();
      
      if (!success) {
        addLog("❌ [Enhanced] Video start failed completely");
        setError("Failed to start video. Please check camera permissions and try again.");
      } else {
        addLog("✅ [Enhanced] Video started successfully");
      }
    }
  } catch (error: any) {
    addLog("❌ [Enhanced] Toggle video failed:", error);
    setError(`Video error: ${error.message}`);
    setVideoEnabled(false);
    setVideoStarting(false);
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  videoEnabled,
  streamReady,
  elementsReady,
  videoStarting,
  addLog,
  startVideoWithProperEventHandling
]);
const setupEnhancedVideoEvents = useCallback((client: any) => {
  addLog("🎧 [Enhanced Event] Setting up enhanced video event handlers...");
  
  // Enhanced video-on handler
  client.on('video-on', (payload: any) => {
    addLog("🎥 [Enhanced Event] Video started for user", payload);
    debugUserState("ENHANCED-VIDEO-ON-EVENT");
    
    const currentUser = client.getCurrentUserInfo();
    if (payload.userId === currentUser?.userId) {
      addLog("✅ [Enhanced Event] Self video confirmed ON");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // Immediate render attempt
      setTimeout(() => {
        if (currentUserIdRef.current && selfVideoElRef.current) {
          addLog("🎥 [Enhanced Event] Rendering self video");
          renderVideoWithDelayedRetries(currentUserIdRef.current);
        }
      }, 200);
    }
    
    // Handle remote video
    if (payload.userId !== currentUser?.userId) {
      setTimeout(() => {
        if (isInSession && !sessionClosed && elementsReady && streamReady && remoteVideoElRef.current) {
          addLog(`🎥 [Enhanced Event] Rendering remote video for ${payload.userId}`);
          renderVideoWithDelayedRetries(payload.userId);
        }
      }, 500);
    }
  });
  
  // Enhanced video-off handler
  client.on('video-off', (payload: any) => {
    addLog("📹 [Enhanced Event] Video stopped for user", payload);
    debugUserState("ENHANCED-VIDEO-OFF-EVENT");
    
    const currentUser = client.getCurrentUserInfo();
    if (payload.userId === currentUser?.userId) {
      setVideoEnabled(false);
      setVideoStarting(false);
      addLog("📹 [Enhanced Event] Self video confirmed OFF");
    }
  });
  
  addLog("✅ [Enhanced Event] Enhanced video event handlers setup");
}, [addLog, debugUserState, renderVideo, isInSession, sessionClosed, elementsReady, streamReady]);

// Enhanced event listeners that monitor bVideoOn instead of video-on event
const setupEventListenersWithBVideoOnFix = useCallback((client: any) => {
  addLog("🎧 Setting up FIXED event listeners that monitor bVideoOn...");

  // User management events
  client.on("user-added", (payload: any) => {
    addLog("👥 User added", payload);
    debugUserState("USER-ADDED");
    updateParticipants(client);
  });

  client.on("user-removed", (payload: any) => {
    addLog("👥 User removed", payload);
    debugUserState("USER-REMOVED");
    updateParticipants(client);
  });

  // *** ENHANCED USER-UPDATED EVENT - MONITORIZEAZĂ bVideoOn ***
  client.on("user-updated", (payload: any) => {
    addLog("👥 User updated", payload);
    debugUserState("USER-UPDATED");
    updateParticipants(client);
    
    // *** CRUCIAL: Verifică bVideoOn pentru current user ***
    if (Array.isArray(payload)) {
      const currentUser = client.getCurrentUserInfo();
      const currentUserUpdate = payload.find((update: any) => 
        update.userId === currentUser?.userId
      );
      
      if (currentUserUpdate) {
        addLog("🔍 [bVideoOn Fix] Current user update detected:", currentUserUpdate);
        
        // Verifică dacă bVideoOn s-a schimbat la true
        if (currentUserUpdate.bVideoOn === true && !videoEnabled) {
          addLog("✅ [bVideoOn Fix] bVideoOn=true detected! Video is working!");
          setVideoEnabled(true);
          setVideoStarting(false);
          
          // Trigger immediate render
          setTimeout(() => {
            if (currentUserIdRef.current && selfVideoElRef.current) {
              addLog("🎥 [bVideoOn Fix] Rendering video after bVideoOn=true");
              renderVideoWithDelayedRetries(currentUserIdRef.current);
            }
          }, 200);
        }
        
        // Verifică dacă bVideoOn s-a schimbat la false
        if (currentUserUpdate.bVideoOn === false && videoEnabled) {
          addLog("📹 [bVideoOn Fix] bVideoOn=false detected! Video stopped!");
          setVideoEnabled(false);
          setVideoStarting(false);
        }
      }
    }
  });

  // Keep original video events as backup (dar nu ne bazăm pe ele)
  client.on("video-on", (payload: any) => {
    addLog("🎥 [Backup] Video-on event (might not work reliably)", payload);
    debugUserState("VIDEO-ON-EVENT");
    
    if (payload.userId === client.getCurrentUserInfo().userId) {
      addLog("🎥 [Backup] Self video confirmed ON by video-on event");
      setVideoEnabled(true);
      setVideoStarting(false);
    }
  });

  client.on("video-off", (payload: any) => {
    addLog("📹 [Backup] Video-off event", payload);
    debugUserState("VIDEO-OFF-EVENT");
    
    if (payload.userId === currentUserId) {
      setVideoEnabled(false);
      setVideoStarting(false);
    }
  });

  // Audio events
  client.on("audio-on", (payload: any) => {
    addLog("🎤 Audio started for user", payload);
    if (payload.userId === currentUserId) {
      setAudioEnabled(true);
    }
  });

  client.on("audio-off", (payload: any) => {
    addLog("🔇 Audio stopped for user", payload);
    if (payload.userId === currentUserId) {
      setAudioEnabled(false);
    }
  });

  // Connection events
  client.on("connection-change", (payload: any) => {
    addLog("🔗 Connection changed", payload);
    debugUserState("CONNECTION-CHANGE");
    setConnectionState(payload.state);

    if (payload.state === "Connected") {
      setIsInSession(true);
      setSessionClosed(false);
      setReconnectAttempts(0);
      setHasJoinedOnce(true);
      updateParticipants(client);
      addLog("✅ Session connected successfully");
      debugUserState("SESSION-CONNECTED");

      setTimeout(() => {
        try {
          const stream = client.getMediaStream();
          if (stream) {
            setMediaStream(stream);
            setStreamReady(true);
            addLog("✅ Media stream obtained and ready");
            debugUserState("MEDIA-STREAM-READY");
          }
        } catch (e) {
          addLog("⚠️ Could not get media stream", e);
        }
      }, 1000);
    } else if (payload.state === "Disconnected") {
      setIsInSession(false);
      setStreamReady(false);
      setVideoStarting(false);
      addLog("📡 Session disconnected");
      debugUserState("SESSION-DISCONNECTED");

      if (hasJoinedOnce && !intentionalLeave && reconnectAttempts < 3) {
        attemptReconnect(client);
      }
    } else if (payload.state === "Closed") {
      debugUserState("SESSION-CLOSED");
      if (hasJoinedOnceRef.current) {
        setSessionClosed(true);
        setIsInSession(false);
        setStreamReady(false);
        setVideoStarting(false);
        addLog("⚠️ Session closed after joining");
      } else {
        addLog("ℹ️ Session closed during initialization (normal)");
      }
    }
  });

  // Peer video events
  client.on("peer-video-state-change", ({ userId, action }) => {
    addLog(`🎥 Peer video state change: userId=${userId}, action=${action}`);
    debugUserState("PEER-VIDEO-CHANGE");
    
    if (action !== "Start") return;
    
    setTimeout(async () => {
      if (!(isInSession && !sessionClosed && elementsReady && streamReady)) {
        addLog("⚠️ Skipping peer video render - conditions not met");
        return;
      }
      
      const remoteEl = remoteVideoElRef.current;
      if (!remoteEl) {
        addLog("❌ remoteVideo element not found");
        return;
      }

      try {
        addLog(`🎥 Attempting to attach remote video for userId=${userId}`);
        debugUserState("PRE-ATTACH-REMOTE");
        await mediaStream.attachVideo(remoteEl, userId);
        addLog(`✅ Remote video attached for userId=${userId}`);
      } catch (err: any) {
        addLog(`❌ Remote video attach failed for userId=${userId}:`, err);
        debugUserState("REMOTE-ATTACH-FAILED");
      }
    }, 500);
  });

  addLog("✅ FIXED event listeners setup complete - monitoring bVideoOn!");
}, [
  addLog,
  currentUserId,
  isInSession,
  sessionClosed,
  reconnectAttempts,
  hasJoinedOnce,
  intentionalLeave,
  elementsReady,
  streamReady,
  videoEnabled,
  debugUserState,
  updateParticipants,
  attemptReconnect,
  renderVideo
]);

// Enhanced video start that uses bVideoOn monitoring
const startVideoWithBVideoOnMonitoring = useCallback(async () => {
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot start video - session not active");
    return false;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot start video - not ready");
    return false;
  }

  addLog("🎥 [bVideoOn Fix] Starting video with bVideoOn monitoring...");
  
  try {
    setVideoStarting(true);
    setVideoEnabled(false);
    
    // Wait for stability
    addLog("⏳ [bVideoOn Fix] Ensuring session stability...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    debugUserState("PRE-BVIDEOON-START");
    
    // Set up bVideoOn monitoring promise
    let bVideoOnDetected = false;
    const bVideoOnPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!bVideoOnDetected) {
          addLog("⚠️ [bVideoOn Fix] bVideoOn monitoring timeout after 15 seconds");
          resolve(false);
        }
      }, 15000);
      
      // Monitor user-updated events for bVideoOn
      const handleUserUpdate = (payload: any) => {
        if (Array.isArray(payload)) {
          const currentUser = zoomClient?.getCurrentUserInfo();
          const currentUserUpdate = payload.find((update: any) => 
            update.userId === currentUser?.userId
          );
          
          if (currentUserUpdate && currentUserUpdate.bVideoOn === true) {
            addLog("✅ [bVideoOn Fix] bVideoOn=true detected in monitoring!");
            bVideoOnDetected = true;
            clearTimeout(timeout);
            zoomClient?.off('user-updated', handleUserUpdate);
            resolve(true);
          }
        }
      };
      
      zoomClient?.on('user-updated', handleUserUpdate);
    });
    
    // Start video
    let startVideoSuccess = false;
    try {
      addLog("🎥 [bVideoOn Fix] Starting video...");
      await mediaStream.startVideo({
        width: 640,
        height: 480,
        frameRate: 15,
      });
      addLog("✅ [bVideoOn Fix] startVideo command succeeded");
      startVideoSuccess = true;
    } catch (error1: any) {
      if (error1.reason === "Video is started") {
        addLog("ℹ️ [bVideoOn Fix] Video was already started (this is OK)");
        startVideoSuccess = true;
      } else {
        addLog("⚠️ [bVideoOn Fix] startVideo with params failed, trying basic");
        try {
          await mediaStream.startVideo();
          addLog("✅ [bVideoOn Fix] startVideo basic succeeded");
          startVideoSuccess = true;
        } catch (error2: any) {
          if (error2.reason === "Video is started") {
            addLog("ℹ️ [bVideoOn Fix] Video was already started (basic attempt)");
            startVideoSuccess = true;
          } else {
            addLog("❌ [bVideoOn Fix] Both startVideo attempts failed:", error2);
            setVideoStarting(false);
            return false;
          }
        }
      }
    }
    
    if (!startVideoSuccess) {
      setVideoStarting(false);
      return false;
    }
    
    // Wait for bVideoOn detection
    addLog("⏳ [bVideoOn Fix] Waiting for bVideoOn=true detection...");
    const detected = await bVideoOnPromise;
    
    if (detected) {
      addLog("✅ [bVideoOn Fix] Video successfully started with bVideoOn confirmation!");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // Trigger render
      setTimeout(() => {
        if (currentUserIdRef.current && selfVideoElRef.current) {
          addLog("🎥 [bVideoOn Fix] Triggering video render after confirmed start");
          renderVideoWithDelayedRetries(currentUserIdRef.current);
        }
      }, 500);
      
      return true;
    } else {
      addLog("⚠️ [bVideoOn Fix] bVideoOn not detected, but video might still work");
      
      // Check manual state as fallback
      debugUserState("POST-BVIDEOON-MANUAL-CHECK");
      
      // Try direct camera as last resort
      addLog("🚨 [bVideoOn Fix] Using direct camera fallback...");
      try {
        const directStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        if (selfVideoElRef.current) {
          selfVideoElRef.current.srcObject = directStream;
          await selfVideoElRef.current.play();
          addLog("✅ [bVideoOn Fix] Direct camera fallback successful");
          setVideoStarting(false);
          return false; // Not through Zoom
        }
      } catch (directError) {
        addLog("❌ [bVideoOn Fix] Direct camera fallback failed:", directError);
      }
      
      setVideoStarting(false);
      return false;
    }
    
  } catch (error) {
    addLog("❌ [bVideoOn Fix] Enhanced video start failed:", error);
    setVideoEnabled(false);
    setVideoStarting(false);
    return false;
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  streamReady,
  elementsReady,
  zoomClient,
  addLog,
  debugUserState,
  renderVideo
]);

// Enhanced toggle video with bVideoOn fix
const toggleVideoWithBVideoOnFix = useCallback(async () => {
  addLog(`🎥 [bVideoOn Fix] Starting toggle video with bVideoOn monitoring...`);
  
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot toggle video - session not active");
    return;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot toggle video - not ready");
    return;
  }

  if (videoStarting) {
    addLog("⚠️ Video start already in progress");
    return;
  }

  try {
    if (videoEnabled) {
      // Stop video
      addLog("📹 [bVideoOn Fix] Stopping video...");
      debugUserState("BVIDEOON-BEFORE-STOP");
      
      await mediaStream.stopVideo();
      setVideoEnabled(false);
      setVideoStarting(false);
      
      // Clear direct camera streams
      if (selfVideoElRef.current && selfVideoElRef.current.srcObject) {
        const stream = selfVideoElRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        selfVideoElRef.current.srcObject = null;
      }
      
      debugUserState("BVIDEOON-AFTER-STOP");
      addLog("📹 [bVideoOn Fix] Video disabled successfully");
    } else {
      // Start video with bVideoOn monitoring
      const success = await startVideoWithBVideoOnMonitoring();
      
      if (!success) {
        addLog("❌ [bVideoOn Fix] Video start failed completely");
        setError("Failed to start video through Zoom. Camera is working via direct access.");
      } else {
        addLog("✅ [bVideoOn Fix] Video started successfully!");
      }
    }
  } catch (error: any) {
    addLog("❌ [bVideoOn Fix] Toggle video failed:", error);
    setError(`Video error: ${error.message}`);
    setVideoEnabled(false);
    setVideoStarting(false);
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  videoEnabled,
  streamReady,
  elementsReady,
  videoStarting,
  addLog,
  startVideoWithBVideoOnMonitoring
]);


  const toggleVideoWithDebug = useCallback(async () => {
  addLog(`🎥 [ToggleVideo] Starting toggle video process...`);
  
  // Pre-flight checks
  debugUserState("PRE-TOGGLE");
  await checkVideoCapabilities();
  checkZoomVideoState();
  
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot toggle video - session not active");
    return;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot toggle video - not ready");
    debugUserState("NOT-READY");
    return;
  }

  if (videoStarting) {
    addLog("⚠️ Video start already in progress");
    return;
  }

  try {
    if (videoEnabled) {
      addLog("📹 Stopping video...");
      debugUserState("BEFORE-STOP");
      
      await mediaStream.stopVideo();
      setVideoEnabled(false);
      setVideoStarting(false);
      
      debugUserState("AFTER-STOP");
      addLog("📹 Video disabled");
    } else {
      if (connectionState !== "Connected") {
        addLog("❌ Cannot start video - connection not stable");
        debugUserState("CONNECTION-NOT-STABLE");
        return;
      }

      setVideoStarting(true);
      debugUserState("STARTING-VIDEO");

      // Test camera access first
      try {
        addLog("🔍 Testing camera access...");
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
          },
          audio: false,
        });

        const videoTrack = testStream.getVideoTracks()[0];
        addLog("✅ Camera access confirmed:", {
          streamId: testStream.id,
          trackLabel: videoTrack?.label,
          trackSettings: videoTrack?.getSettings()
        });
        
        testStream.getTracks().forEach((track) => track.stop());
      } catch (mediaError: any) {
        addLog("❌ Camera access failed", mediaError);
        setError(`Camera access denied: ${mediaError.message}`);
        setVideoStarting(false);
        debugUserState("CAMERA-ACCESS-FAILED");
        return;
      }

      // Stabilization delay
      addLog("⏳ Waiting for session to stabilize before video start...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (!isInSession || sessionClosed || connectionState !== "Connected") {
        addLog("❌ Session became unstable during delay");
        setVideoStarting(false);
        debugUserState("SESSION-BECAME-UNSTABLE");
        return;
      }

      debugUserState("BEFORE-START-VIDEO");
      addLog("🎥 Starting video...");

      try {
        // Try with basic parameters first
        addLog("🎥 Attempting startVideo with parameters...");
        await mediaStream.startVideo({
          width: 640,
          height: 480,
          frameRate: 15,
        });
        addLog("✅ StartVideo with parameters succeeded");
      } catch (paramError) {
        addLog("⚠️ StartVideo with parameters failed, trying basic", paramError);
        try {
          await mediaStream.startVideo();
          addLog("✅ StartVideo basic call succeeded");
        } catch (basicError) {
          addLog("❌ Both startVideo calls failed", basicError);
          setVideoStarting(false);
          debugUserState("START-VIDEO-FAILED");
          return;
        }
      }

      debugUserState("AFTER-START-VIDEO");
      addLog("🎥 Video start command sent, waiting for confirmation...");

      // Enhanced timeout with regular checks
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        addLog(`🔍 [VideoCheck ${checkCount}] Checking video state after start...`);
        debugUserState(`CHECK-${checkCount}`);
        checkZoomVideoState();
        
        if (checkCount >= 10) { // Stop after 10 checks (10 seconds)
          clearInterval(checkInterval);
        }
      }, 1000);

      // Multiple timeout fallbacks
      setTimeout(() => {
        clearInterval(checkInterval);
        if (videoStarting && !videoEnabled) {
          addLog("⚠️ Video start timeout (5s) - analyzing state");
          debugUserState("5S-TIMEOUT");
          checkZoomVideoState();
          
          // Only force if we're confident the video should be working
          const currentUser = zoomClient?.getCurrentUserInfo();
          const allUsers = zoomClient?.getAllUser() || [];
          const userInList = allUsers.find((u: any) => 
            u.userId === currentUser?.userId || 
            String(u.userId) === String(currentUser?.userId)
          );
          
          if (userInList && (userInList.video === 'on' || userInList.video === true)) {
            addLog("✅ Zoom confirms video is on - setting videoEnabled=true");
            setVideoEnabled(true);
            setVideoStarting(false);
            
            if (currentUserIdRef.current && selfVideoElRef.current) {
              renderVideoWithDelayedRetries(currentUserIdRef.current);
            }
          } else {
            addLog("⚠️ Zoom still shows video as off - video start may have failed");
            setVideoStarting(false);
          }
        }
      }, 5000);

      // Final check and direct camera as last resort
      setTimeout(() => {
        if (selfVideoElRef.current && currentUserIdRef.current) {
          debugUserState("12S-FINAL-CHECK");
          
          const hasVideo =
            selfVideoElRef.current.videoWidth > 0 &&
            selfVideoElRef.current.videoHeight > 0;
            
          if (!hasVideo) {
            addLog("🚨 FINAL: 12s timeout - no video visible, implementing direct camera");
            
            navigator.mediaDevices
              .getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
              })
              .then((directStream) => {
                addLog("🚨 DIRECT: Camera stream obtained, forcing display");
                if (selfVideoElRef.current) {
                  selfVideoElRef.current.srcObject = directStream;
                  selfVideoElRef.current.play();
                  addLog("✅ DIRECT: Camera now visible via direct access");
                }
              })
              .catch((err) => {
                addLog("❌ DIRECT: Camera access failed:", err);
              });
          } else {
            addLog("✅ Video confirmed working at 12s check");
          }
        }
      }, 12000);
    }
  } catch (error: any) {
    addLog("❌ Failed to toggle video", error);
    setError(`Video error: ${error.message}`);
    setVideoEnabled(false);
    setVideoStarting(false);
    debugUserState("TOGGLE-VIDEO-ERROR");
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  videoEnabled,
  streamReady,
  elementsReady,
  connectionState,
  videoStarting,
  addLog,
  debugUserState,
  checkVideoCapabilities,
  checkZoomVideoState,
  zoomClient
]);


  const toggleVideo = toggleVideoWithBVideoOnFix;

  // Leave session with proper cleanup
  const leaveSession = useCallback(async () => {
    if (!zoomClient) return;

    try {
      setStep("leaving");
      setIntentionalLeave(true);
      addLog("👋 Leaving session...");

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Stop media first
      if (mediaStream) {
        try {
          if (audioEnabled) await mediaStream.stopAudio();
          if (videoEnabled) await mediaStream.stopVideo();
        } catch (e) {
          addLog("⚠️ Error stopping media during leave");
        }
      }

      // Clean up video elements
      cleanupVideoElements();

      await zoomClient.leave();

      setIsInSession(false);
      setSessionClosed(true);
      setAudioEnabled(false);
      setVideoEnabled(false);
      setVideoStarting(false);
      setParticipants([]);
      setConnectionState("disconnected");
      setStep("disconnected");
      setStreamReady(false);
      setElementsReady(false);

      addLog("✅ Left session successfully");

      setTimeout(() => {
        router.push("/servicii");
      }, 2000);
    } catch (error: any) {
      addLog("❌ Failed to leave session", error);
    } finally {
      initializingRef.current = false;
    }
  }, [
    zoomClient,
    mediaStream,
    audioEnabled,
    videoEnabled,
    addLog,
    router,
    cleanupVideoElements,
  ]);

  // Create new session helper
  const createNewConsultingSession = useCallback(async () => {
    if (!sessionInfo) {
      throw new Error("Nu e încărcat sessionInfo-ul curent");
    }

    addLog("🆕 Creating a brand-new Zoom session…");
    const res = await fetch("/api/video/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [sessionInfo.provider.id, sessionInfo.client.id],
        providerId: sessionInfo.provider.id,
        clientId: sessionInfo.client.id,
        specialityId: "4fb4527a-b5c2-4089-a39a-232dd601a520",
        packageId: "b587aa8a-f317-4422-846e-fa391983041b",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const { sessionId: newSessionId } = await res.json();
    addLog("✅ New consulting session created:", newSessionId);
    return newSessionId as string;
  }, [sessionInfo, addLog]);

  // Main initialization
  const initialize = useCallback(async () => {
    if (initializingRef.current) {
      addLog("⚠️ Initialization already in progress");
      return;
    }

    initializingRef.current = true;

    try {
      setError("");
      setStep("starting");
      setSessionClosed(false);
      setIntentionalLeave(false);
      setHasJoinedOnce(false);
      setReconnectAttempts(0);
      setElementsReady(false);
      setStreamReady(false);
      setVideoStarting(false);

      // System check
      checkSystem();

      // Load SDK
      await loadZoomSDK();

      // Fetch session info
      const sessionData = await fetchSessionInfo();

      // Initialize SDK
      const client = await initializeZoomSDK(sessionData);

      // Join session
      await joinSession(client, sessionData);

      addLog("🎉 Initialization completed successfully!");
    } catch (error: any) {
      addLog("💥 Initialization failed", error);
      setError(error.message);
      setStep("failed");
    } finally {
      initializingRef.current = false;
    }
  }, [
    checkSystem,
    loadZoomSDK,
    fetchSessionInfo,
    initializeZoomSDK,
    joinSession,
    addLog,
  ]);

  // Auto-setup video elements when session becomes active
  useEffect(() => {
    if (isInSession && !elementsReady && videoContainerRef.current) {
      addLog("🎥 Session is active - setting up video elements...");

      const setupSuccess = setupVideoElements();
      if (setupSuccess) {
        addLog("✅ Video elements setup triggered after session connect");
      }
    }
  }, [isInSession, elementsReady, setupVideoElements, addLog]);

  // Lifecycle effects
  useEffect(() => {
    hasJoinedOnceRef.current = hasJoinedOnce;
  }, [hasJoinedOnce]);
  useEffect(() => {
    intentionalLeaveRef.current = intentionalLeave;
  }, [intentionalLeave]);

  // Component initialization
  useEffect(() => {
    mountedRef.current = true;

    if (auth?.user && sessionId && step === "idle") {
      addLog("🚀 Starting initialization...");
      initialize();
    }

    return () => {
      mountedRef.current = false;
      setIntentionalLeave(true);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Clean up on unmount
      cleanupVideoElements();

      if (zoomClient && isInSession) {
        zoomClient.leave().catch(console.error);
      }
    };
  }, [auth?.user, sessionId, step, initialize, cleanupVideoElements]);

  // Advanced video state synchronization that handles the missing video-on event
const advancedVideoStateSync = useCallback(async () => {
  if (!zoomClient || !mediaStream) {
    addLog("❌ [AdvancedSync] No client or media stream");
    return false;
  }
  
  addLog("🔄 [AdvancedSync] Starting advanced video state synchronization...");
  
  try {
    // Step 1: Check current video state
    debugUserState("ADVANCED-SYNC-START");
    
    const currentUser = zoomClient.getCurrentUserInfo();
    const allUsers = zoomClient.getAllUser() || [];
    const userInList = allUsers.find((u: any) => u.userId === currentUser?.userId);
    
    // Step 2: Handle case where video is already started but state is not synced
    if (userInList && userInList.video === undefined) {
      addLog("🔍 [AdvancedSync] Video state is undefined, checking if video is actually running...");
      
      // Try to stop first (in case video is actually running but state is wrong)
      try {
        await mediaStream.stopVideo();
        addLog("✅ [AdvancedSync] Successfully stopped existing video");
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (stopError: any) {
        if (stopError.reason === "Video not started") {
          addLog("ℹ️ [AdvancedSync] Video was not running");
        } else {
          addLog("⚠️ [AdvancedSync] Stop video error:", stopError);
        }
      }
    }
    
    // Step 3: Force fresh start with multiple monitoring approaches
    addLog("🎥 [AdvancedSync] Starting fresh video with multiple monitoring...");
    
    // Set up multiple monitoring strategies
    let videoStateDetected = false;
    let eventReceived = false;
    let manualCheckSuccess = false;
    
    // Strategy 1: Event monitoring
    const eventPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!eventReceived) {
          addLog("⚠️ [AdvancedSync] Event monitoring timeout");
          resolve(false);
        }
      }, 8000);
      
      const handleVideoOn = (payload: any) => {
        if (payload.userId === currentUser?.userId) {
          addLog("✅ [AdvancedSync] video-on event received!");
          eventReceived = true;
          videoStateDetected = true;
          clearTimeout(timeout);
          zoomClient?.off('video-on', handleVideoOn);
          resolve(true);
        }
      };
      
      zoomClient?.on('video-on', handleVideoOn);
    });
    
    // Strategy 2: Manual state polling
    const manualPollingPromise = new Promise((resolve) => {
      let checkCount = 0;
      const maxChecks = 15; // 15 seconds
      
      const checkInterval = setInterval(() => {
        checkCount++;
        const users = zoomClient.getAllUser() || [];
        const user = users.find((u: any) => u.userId === currentUser?.userId);
        
        addLog(`🔍 [AdvancedSync] Manual check ${checkCount}/${maxChecks}: video=${user?.video}`);
        
        if (user && (user.video === 'on' || user.video === true)) {
          addLog("✅ [AdvancedSync] Manual polling detected video=on");
          manualCheckSuccess = true;
          videoStateDetected = true;
          clearInterval(checkInterval);
          resolve(true);
        }
        
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 1000);
    });
    
    // Strategy 3: Try to start video (might already be started)
    let startVideoResult = false;
    try {
      await mediaStream.startVideo({
        width: 640,
        height: 480,
        frameRate: 15,
      });
      addLog("✅ [AdvancedSync] startVideo succeeded");
      startVideoResult = true;
    } catch (startError: any) {
      if (startError.reason === "Video is started") {
        addLog("ℹ️ [AdvancedSync] Video was already started (error 6109)");
        startVideoResult = true; // This is actually success
      } else {
        addLog("❌ [AdvancedSync] startVideo failed:", startError);
        try {
          // Try without parameters
          await mediaStream.startVideo();
          addLog("✅ [AdvancedSync] startVideo without params succeeded");
          startVideoResult = true;
        } catch (startError2: any) {
          if (startError2.reason === "Video is started") {
            addLog("ℹ️ [AdvancedSync] Video was already started (attempt 2)");
            startVideoResult = true;
          } else {
            addLog("❌ [AdvancedSync] Both startVideo attempts failed:", startError2);
          }
        }
      }
    }
    
    if (!startVideoResult) {
      addLog("❌ [AdvancedSync] Could not start video");
      return false;
    }
    
    // Wait for either strategy to succeed
    addLog("⏳ [AdvancedSync] Waiting for video state detection...");
    const raceResult = await Promise.race([eventPromise, manualPollingPromise]);
    
    // Final verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    debugUserState("ADVANCED-SYNC-FINAL-CHECK");
    
    const finalUsers = zoomClient.getAllUser() || [];
    const finalUser = finalUsers.find((u: any) => u.userId === currentUser?.userId);
    const finalVideoState = finalUser?.video;
    
    addLog(`🔍 [AdvancedSync] Final video state: ${finalVideoState}`);
    
    if (finalVideoState === 'on' || finalVideoState === true || videoStateDetected) {
      addLog("✅ [AdvancedSync] Video state successfully synchronized!");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // Trigger render
      if (currentUserIdRef.current && selfVideoElRef.current) {
        setTimeout(() => {
          addLog("🎥 [AdvancedSync] Rendering video after successful sync");
          renderVideoWithDelayedRetries(currentUserIdRef.current);
        }, 500);
      }
      
      return true;
    } else {
      addLog("❌ [AdvancedSync] Video state sync failed, final state:", finalVideoState);
      
      // Last resort: Direct camera with notification
      addLog("🚨 [AdvancedSync] Using direct camera as final fallback");
      try {
        const directStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        if (selfVideoElRef.current) {
          selfVideoElRef.current.srcObject = directStream;
          await selfVideoElRef.current.play();
          addLog("✅ [AdvancedSync] Direct camera active (not through Zoom)");
          setVideoStarting(false);
          // Note: Don't set videoEnabled=true since this isn't through Zoom
        }
      } catch (directError) {
        addLog("❌ [AdvancedSync] Direct camera also failed:", directError);
      }
      
      return false;
    }
    
  } catch (error) {
    addLog("❌ [AdvancedSync] Advanced sync failed:", error);
    setVideoEnabled(false);
    setVideoStarting(false);
    return false;
  }
}, [zoomClient, mediaStream, addLog, debugUserState, renderVideo]);

// Alternative: Force video state refresh by rejoining
const refreshVideoStateByReconnect = useCallback(async () => {
  if (!zoomClient || !sessionInfo) {
    addLog("❌ [Refresh] No client or session info");
    return;
  }
  
  addLog("🔄 [Refresh] Refreshing video state by brief reconnect...");
  
  try {
    // Save current state
    const wasAudioEnabled = audioEnabled;
    
    // Step 1: Leave and immediately rejoin (quick refresh)
    addLog("📤 [Refresh] Leaving session briefly...");
    await zoomClient.leave();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Rejoin
    addLog("📥 [Refresh] Rejoining session...");
    const joinResult = await zoomClient.join(
      sessionInfo.sessionName,
      sessionInfo.token,
      auth?.user?.name || "User",
      sessionInfo.sessionKey || ""
    );
    
    addLog("✅ [Refresh] Successfully rejoined:", joinResult);
    
    // Step 3: Wait for stabilization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Update participants and get fresh state
    updateParticipants(zoomClient);
    
    // Step 5: Try to restore audio if it was enabled
    if (wasAudioEnabled && mediaStream) {
      try {
        await mediaStream.startAudio();
        setAudioEnabled(true);
        addLog("✅ [Refresh] Audio restored");
      } catch (e) {
        addLog("⚠️ [Refresh] Could not restore audio:", e);
      }
    }
    
    addLog("✅ [Refresh] Video state refresh complete");
    debugUserState("AFTER-REFRESH");
    
  } catch (error) {
    addLog("❌ [Refresh] Refresh failed:", error);
    setError("Failed to refresh video state");
  }
}, [zoomClient, sessionInfo, audioEnabled, mediaStream, auth?.user?.name, addLog, debugUserState, updateParticipants]);

// Check video hardware acceleration issues
const diagnoseVideoIssues = useCallback(async () => {
  addLog("🔍 [Diagnose] Starting comprehensive video diagnosis...");
  
  try {
    // Check 1: WebGL/Hardware acceleration
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    addLog(`🔍 [Diagnose] WebGL available: ${!!gl}`);
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        addLog(`🔍 [Diagnose] GPU: ${vendor} - ${renderer}`);
      }
    }
    
    // Check 2: Camera capabilities  
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    addLog(`🔍 [Diagnose] Video devices:`, videoDevices);
    
    // Check 3: Test different video constraints
    const constraints = [
      { video: { width: 320, height: 240, frameRate: 15 } },
      { video: { width: 640, height: 480, frameRate: 15 } },
      { video: true }
    ];
    
    for (let i = 0; i < constraints.length; i++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        addLog(`✅ [Diagnose] Constraint ${i+1} works:`, settings);
        stream.getTracks().forEach(t => t.stop());
        break;
      } catch (e) {
        addLog(`❌ [Diagnose] Constraint ${i+1} failed:`, e);
      }
    }
    
    // Check 4: Zoom SDK specific
    if (zoomClient && mediaStream) {
      addLog("🔍 [Diagnose] Zoom SDK diagnosis...");
      const users = zoomClient.getAllUser();
      const currentUser = zoomClient.getCurrentUserInfo();
      
      addLog(`🔍 [Diagnose] Current user:`, currentUser);
      addLog(`🔍 [Diagnose] All users:`, users);
      
      // Try to get video capabilities from Zoom
      try {
        const capabilities = await mediaStream.getVideoCapabilities?.();
        addLog(`🔍 [Diagnose] Zoom video capabilities:`, capabilities);
      } catch (e) {
        addLog(`⚠️ [Diagnose] No video capabilities method`);
      }
    }
    
  } catch (error) {
    addLog("❌ [Diagnose] Diagnosis failed:", error);
  }
}, [addLog, zoomClient, mediaStream]);

// Enhanced renderVideo with aggressive retry for bVideoOn timing issues
const renderVideoWithDelayedRetries = useCallback(async (userId: string) => {
  if (!zoomClient || !mediaStream) {
    addLog("❌ No client or media stream for video rendering");
    return;
  }
  if (!elementsReady || !streamReady) {
    addLog(`⚠️ Skipping video render for ${userId} - not ready`);
    return;
  }

  const isSelf = userId === currentUserIdRef.current;
  const videoEl = isSelf ? selfVideoElRef.current : remoteVideoElRef.current;
  const which = isSelf ? 'Self' : 'Remote';

  if (!videoEl) {
    addLog(`❌ Nu există element ${which.toLowerCase()}-video pentru user ${userId}`);
    return;
  }

  addLog(`🎥 [DelayedRetry] Starting ${which} video render for user ${userId}`);
  
  // For self video with bVideoOn=true, use aggressive retry strategy
  if (isSelf) {
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 1000; // 1 second between retries
    
    const attemptAttach = async (): Promise<boolean> => {
      try {
        retryCount++;
        addLog(`🎥 [DelayedRetry] Attempt ${retryCount}/${maxRetries} - Attaching ${which} video`);
        
        await mediaStream.attachVideo(videoEl, userId);
        addLog(`✅ [DelayedRetry] Success on attempt ${retryCount}! ${which} video attached`);
        
        // Verify video is actually playing
        setTimeout(() => {
          const ok = videoEl.videoWidth > 0 && videoEl.videoHeight > 0;
          addLog(`🔍 [DelayedRetry] Post-attach verification: ${ok ? 'SUCCESS' : 'FAILED'} (${videoEl.videoWidth}x${videoEl.videoHeight})`);
          
          if (!ok) {
            addLog(`⚠️ [DelayedRetry] Video not displaying after successful attach - keeping direct camera`);
          }
        }, 1000);
        
        return true;
      } catch (err: any) {
        addLog(`❌ [DelayedRetry] Attempt ${retryCount} failed: ${err.reason} (${err.errorCode})`);
        
        if (err.reason === 'user is not send video' && retryCount < maxRetries) {
          addLog(`⏳ [DelayedRetry] Waiting ${retryDelay}ms before retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return await attemptAttach();
        }
        
        return false;
      }
    };
    
    const attachSuccess = await attemptAttach();
    
    if (!attachSuccess) {
      addLog(`❌ [DelayedRetry] All ${maxRetries} attempts failed, using direct camera fallback`);
      
      // Direct camera as final fallback
      try {
        const directStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        videoEl.srcObject = directStream;
        await videoEl.play();
        addLog(`✅ [DelayedRetry] Direct camera fallback successful for ${which}`);
      } catch (directError) {
        addLog(`❌ [DelayedRetry] Direct camera fallback also failed:`, directError);
      }
    }
  } else {
    // For remote video, use standard approach
    try {
      await mediaStream.attachVideo(videoEl, userId);
      addLog(`✅ [DelayedRetry] ${which} video attached successfully`);
    } catch (err: any) {
      addLog(`❌ [DelayedRetry] ${which} video attach failed:`, err);
    }
  }
}, [zoomClient, mediaStream, elementsReady, streamReady, addLog]);

// Enhanced renderVideo with aggressive retry for bVideoOn timing issues
// Enhanced bVideoOn start with improved render timing
const startVideoWithImprovedTiming = useCallback(async () => {
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot start video - session not active");
    return false;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot start video - not ready");
    return false;
  }

  addLog("🎥 [ImprovedTiming] Starting video with improved timing...");
  
  try {
    setVideoStarting(true);
    setVideoEnabled(false);
    
    // Wait for stability
    addLog("⏳ [ImprovedTiming] Ensuring session stability...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    debugUserState("PRE-IMPROVED-START");
    
    // Set up bVideoOn monitoring with improved handling
    let bVideoOnDetected = false;
    const bVideoOnPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!bVideoOnDetected) {
          addLog("⚠️ [ImprovedTiming] bVideoOn monitoring timeout after 15 seconds");
          resolve(false);
        }
      }, 15000);
      
      const handleUserUpdate = (payload: any) => {
        if (Array.isArray(payload)) {
          const currentUser = zoomClient?.getCurrentUserInfo();
          const currentUserUpdate = payload.find((update: any) => 
            update.userId === currentUser?.userId
          );
          
          if (currentUserUpdate && currentUserUpdate.bVideoOn === true) {
            addLog("✅ [ImprovedTiming] bVideoOn=true detected!");
            bVideoOnDetected = true;
            clearTimeout(timeout);
            zoomClient?.off('user-updated', handleUserUpdate);
            resolve(true);
          }
        }
      };
      
      zoomClient?.on('user-updated', handleUserUpdate);
    });
    
    // Start video
    let startVideoSuccess = false;
    try {
      addLog("🎥 [ImprovedTiming] Starting video...");
      await mediaStream.startVideo({
        width: 640,
        height: 480,
        frameRate: 15,
      });
      addLog("✅ [ImprovedTiming] startVideo command succeeded");
      startVideoSuccess = true;
    } catch (error1: any) {
      if (error1.reason === "Video is started") {
        addLog("ℹ️ [ImprovedTiming] Video was already started");
        startVideoSuccess = true;
      } else {
        addLog("⚠️ [ImprovedTiming] startVideo failed, trying basic");
        try {
          await mediaStream.startVideo();
          addLog("✅ [ImprovedTiming] startVideo basic succeeded");
          startVideoSuccess = true;
        } catch (error2: any) {
          if (error2.reason === "Video is started") {
            addLog("ℹ️ [ImprovedTiming] Video was already started (basic)");
            startVideoSuccess = true;
          } else {
            addLog("❌ [ImprovedTiming] Both startVideo attempts failed:", error2);
            setVideoStarting(false);
            return false;
          }
        }
      }
    }
    
    if (!startVideoSuccess) {
      setVideoStarting(false);
      return false;
    }
    
    // Wait for bVideoOn detection
    addLog("⏳ [ImprovedTiming] Waiting for bVideoOn=true...");
    const detected = await bVideoOnPromise;
    
    if (detected) {
      addLog("✅ [ImprovedTiming] bVideoOn confirmed! Setting up video...");
      setVideoEnabled(true);
      setVideoStarting(false);
      
      // CRITICAL: Wait longer before trying to render
      addLog("⏳ [ImprovedTiming] Waiting for Zoom video stream to stabilize...");
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      
      // Now try render with retries
      if (currentUserIdRef.current && selfVideoElRef.current) {
        addLog("🎥 [ImprovedTiming] Starting delayed render with retries");
        await renderVideoWithDelayedRetries(currentUserIdRef.current);
      }
      
      return true;
    } else {
      addLog("⚠️ [ImprovedTiming] bVideoOn not detected");
      setVideoStarting(false);
      
      // Direct camera fallback
      try {
        const directStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        if (selfVideoElRef.current) {
          selfVideoElRef.current.srcObject = directStream;
          await selfVideoElRef.current.play();
          addLog("✅ [ImprovedTiming] Direct camera fallback active");
          setVideoStarting(false);
        }
      } catch (directError) {
        addLog("❌ [ImprovedTiming] Direct camera failed:", directError);
      }
      
      return false;
    }
    
  } catch (error) {
    addLog("❌ [ImprovedTiming] Failed:", error);
    setVideoEnabled(false);
    setVideoStarting(false);
    return false;
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  streamReady,
  elementsReady,
  zoomClient,
  addLog,
  debugUserState,
  renderVideoWithDelayedRetries
]);

// Enhanced toggle that uses the improved timing
const toggleVideoFinal = useCallback(async () => {
  addLog(`🎥 [Final] Starting final toggle video...`);
  
  if (!mediaStream || !isInSession || sessionClosed) {
    addLog("❌ Cannot toggle video - session not active");
    return;
  }

  if (!streamReady || !elementsReady) {
    addLog("❌ Cannot toggle video - not ready");
    return;
  }

  if (videoStarting) {
    addLog("⚠️ Video start already in progress");
    return;
  }

  try {
    if (videoEnabled) {
      // Stop video
      addLog("📹 [Final] Stopping video...");
      
      await mediaStream.stopVideo();
      setVideoEnabled(false);
      setVideoStarting(false);
      
      // Clear direct camera streams
      if (selfVideoElRef.current && selfVideoElRef.current.srcObject) {
        const stream = selfVideoElRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        selfVideoElRef.current.srcObject = null;
      }
      
      addLog("📹 [Final] Video stopped successfully");
    } else {
      // Start video with improved timing
      const success = await startVideoWithImprovedTiming();
      
      if (success) {
        addLog("✅ [Final] Video started successfully through Zoom!");
      } else {
        addLog("⚠️ [Final] Video start through Zoom failed, but direct camera should be working");
      }
    }
  } catch (error: any) {
    addLog("❌ [Final] Toggle failed:", error);
    setError(`Video error: ${error.message}`);
    setVideoEnabled(false);
    setVideoStarting(false);
  }
}, [
  mediaStream,
  isInSession,
  sessionClosed,
  videoEnabled,
  streamReady,
  elementsReady,
  videoStarting,
  addLog,
  startVideoWithImprovedTiming
]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!auth?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Not Authenticated
          </h1>
          <p className="text-gray-600">
            Please sign in to access video sessions.
          </p>
        </div>
      </div>
    );
  }

  // System warnings helper
  const getSystemWarnings = () => {
    const warnings = [];

    if (!systemInfo.hasSharedArrayBuffer) {
      warnings.push(
        "⚠️ SharedArrayBuffer missing - using fallback video elements"
      );
    }

    if (!systemInfo.crossOriginIsolated) {
      warnings.push(
        "⚠️ Cross-Origin Isolation disabled - some features limited"
      );
    }

    if (!systemInfo.isSecure && !systemInfo.isLocalhost) {
      warnings.push("⚠️ HTTPS required for production use");
    }

    return warnings;
  };

  const warnings = getSystemWarnings();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Video Consultation
              </h1>
              <p className="text-gray-600 mt-1">
                {sessionInfo
                  ? `Session with ${sessionInfo.provider.name}`
                  : "Loading session..."}
              </p>
              {connectionState && connectionState !== "idle" && (
                <div className="mt-2">
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      connectionState === "Connected"
                        ? "bg-green-100 text-green-700"
                        : connectionState === "Closed" && hasJoinedOnce
                        ? "bg-red-100 text-red-700"
                        : connectionState === "Closed" && !hasJoinedOnce
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    Connection: {connectionState}
                    {connectionState === "Closed" &&
                      !hasJoinedOnce &&
                      " (Initializing)"}
                  </span>
                  {reconnectAttempts > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Reconnect attempts: {reconnectAttempts}/3)
                    </span>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    Video Elements | Setup: {elementsReady ? "✅" : "⏳"} |
                    Stream: {streamReady ? "✅" : "⏳"} | Starting:{" "}
                    {videoStarting ? "🔄" : "✅"}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  step === "connected"
                    ? "bg-green-100 text-green-800"
                    : step === "failed"
                    ? "bg-red-100 text-red-800"
                    : sessionClosed && hasJoinedOnce
                    ? "bg-gray-100 text-gray-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {step === "connected"
                  ? "✅ Connected"
                  : step === "failed"
                  ? "❌ Failed"
                  : step === "idle"
                  ? "⏳ Ready"
                  : sessionClosed && hasJoinedOnce
                  ? "🔒 Session Closed"
                  : `🔄 ${step.replace("-", " ")}`}
              </span>
              {participants.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  👥 {participants.length} participant
                  {participants.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* System Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">
              System Information:
            </h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
              <p>
                <strong>Render strategy:</strong> Video Elements (required by
                Zoom SDK)
              </p>
              <p>
                <strong>Note:</strong> This configuration optimizes for maximum
                compatibility
              </p>
            </div>
          </div>
        )}

        {/* Session closed warning */}
        {sessionClosed &&
          hasJoinedOnce &&
          step !== "leaving" &&
          !intentionalLeave && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-orange-800 mb-2">
                Session Ended
              </h3>
              <p className="text-orange-700 text-sm">
                The video session has ended. This could be due to:
              </p>
              <ul className="text-orange-700 text-sm mt-2 ml-4 list-disc">
                <li>Session timeout or scheduled end time reached</li>
                <li>Network connectivity issues</li>
                <li>All participants leaving</li>
                <li>Technical issues with video sharing</li>
              </ul>
              <div className="mt-3 flex space-x-2">
                {reconnectAttempts < 3 && (
                  <button
                    onClick={() => {
                      setSessionClosed(false);
                      setReconnectAttempts(0);
                      setIntentionalLeave(false);
                      setHasJoinedOnce(false);
                      initialize();
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                  >
                    🔄 Try Reconnect
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      const newId = await createNewConsultingSession();
                      router.push(`/servicii/video-sessions/${newId}`);
                    } catch (err: any) {
                      addLog("❌ Failed to create new session", err);
                      setError(err.message);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  🆕 Start New Session
                </button>
              </div>
            </div>
          )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Connection Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <div className="mt-3 text-sm text-red-600">
              <p>
                <strong>Common fixes:</strong>
              </p>
              <ul className="list-disc ml-5 mt-1">
                <li>Check internet connection stability</li>
                <li>Allow camera and microphone permissions in browser</li>
                <li>
                  Close other video applications that might be using camera
                </li>
                <li>Try refreshing the page</li>
                <li>Use Chrome or Safari for best Zoom SDK compatibility</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setStep("idle");
                setError("");
                setLogs([]);
                setSessionClosed(false);
                setIntentionalLeave(false);
                setHasJoinedOnce(false);
                setVideoStarting(false);
                initialize();
              }}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
            >
              🔄 Retry Connection
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Video Stream</h2>

              {isInSession && !sessionClosed ? (
                <div>
                  {/* Video Container */}
                  <div
                    ref={videoContainerRef}
                    className="bg-gray-900 rounded-lg mb-4 min-h-[400px] relative overflow-hidden"
                    style={{ aspectRatio: "4/3" }}
                  >
                    {/* Placeholder when no participants */}
                    <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                      {participants.length === 0
                        ? "Waiting for participants..."
                        : ""}
                    </div>

                    {/* Connection status overlay */}
                    {connectionState !== "Connected" && isInSession && (
                      <div className="absolute top-4 left-4 z-20">
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">
                          {connectionState === "Connecting"
                            ? "🔄 Connecting..."
                            : connectionState === "Reconnecting"
                            ? "🔄 Reconnecting..."
                            : connectionState === "Closed"
                            ? "⚠️ Connection Lost"
                            : `📡 ${connectionState}`}
                        </div>
                      </div>
                    )}

                    {/* Video status indicator */}
                    <div className="absolute top-4 right-4 z-20">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                        📺 Video Elements
                        {videoStarting && " (starting...)"}
                        {(!elementsReady || !streamReady) && " (setting up...)"}
                      </div>
                    </div>

                    {/* Video starting overlay */}
                    {videoStarting && (
                      <div className="absolute bottom-4 left-4 z-20">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                          🎥 Starting video...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Media Controls */}
                  <div className="flex justify-center space-x-4 mb-4">
                    <button
                      onClick={toggleAudio}
                      disabled={!isInSession || sessionClosed || !streamReady}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        audioEnabled
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      {audioEnabled ? "🎤 Mute" : "🔇 Unmute"}
                    </button>

                    <button
                      onClick={toggleVideoFinal}
                      disabled={
                        !isInSession ||
                        sessionClosed ||
                        !streamReady ||
                        videoStarting
                      }
                      className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        videoEnabled
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      {videoStarting
                        ? "🔄 Starting..."
                        : videoEnabled
                        ? "📹 Stop Video"
                        : "🎥 Start Video"}
                    </button>

                    <button
                      onClick={leaveSession}
                      disabled={!zoomClient}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      👋 Leave Session
                    </button>
                  </div>

                  
{/* Debug Controls - only in development */}
{process.env.NODE_ENV === "development" && isInSession && (
  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
    <h4 className="font-medium text-gray-900 mb-2">Debug Controls</h4>
    <div className="flex flex-wrap gap-2">
            <button
        onClick={() =>renderVideoWithDelayedRetries(currentUserIdRef.current)}
        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
      >
        🚀 Final Start
      </button>
                  <button
        onClick={startVideoWithImprovedTiming}
        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
      >
        🔄 Retry Render
      </button>
      <button
        onClick={() => debugUserState("MANUAL-DEBUG")}
        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
      >
        🐛 Debug User State
      </button>
      <button
  onClick={startVideoWithBVideoOnMonitoring}
  className="px-3 py-1 bg-lime-600 text-white rounded text-sm hover:bg-lime-700"
  disabled={videoEnabled || videoStarting}
>
  🔧 bVideoOn Start
</button>
      <button
        onClick={checkVideoCapabilities}
        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
      >
        🔍 Check Camera
      </button>
      <button
        onClick={checkZoomVideoState}
        className="px-3 py-1 bg-pink-600 text-white rounded text-sm hover:bg-pink-700"
      >
        🔍 Check Zoom State
      </button>
      <button
  onClick={advancedVideoStateSync}
  className="px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700"
>
  🔧 Advanced Sync
</button>
<button
  onClick={refreshVideoStateByReconnect}
  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
>
  🔄 Refresh State
</button>
<button
  onClick={diagnoseVideoIssues}
  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
>
  🔍 Diagnose
</button>
      <button
        onClick={() => {
          if (zoomClient && selfVideoElRef.current && currentUserIdRef.current) {
            addLog("🔄 Manual render attempt...");
            debugUserState("MANUAL-RENDER-PRE");
            renderVideoWithDelayedRetries(currentUserIdRef.current);
          }
        }}
        className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
      >
        🎥 Force Render
      </button>
      <button
        onClick={forceVideoStateSync}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      >
        🔄 Force Video Sync
      </button>
      <button
        onClick={async () => {
          if (!videoEnabled) {
            const success = await startVideoWithProperEventHandling();
            if (success) {
              addLog("✅ Enhanced video start succeeded via debug button");
            } else {
              addLog("❌ Enhanced video start failed via debug button");
            }
          } else {
            addLog("ℹ️ Video already enabled");
          }
        }}
        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        disabled={videoEnabled || videoStarting}
      >
        🚀 Enhanced Start
      </button>
    </div>
  </div>
)}

{/* Participants List */}
{participants.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Participants
                      </h3>
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div
                            key={participant.userId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium">
                              {participant.displayName}
                              {participant.userId === currentUserId && " (You)"}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  participant.audio === "on"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {participant.audio === "on" ? "🎤" : "🔇"}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  participant.video === "on"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {participant.video === "on" ? "🎥" : "📹"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div
                    className="bg-gray-900 rounded-lg mb-4 min-h-[400px] relative overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: "4/3" }}
                  >
                    <div className="text-gray-400 text-lg">
                      {step === "failed"
                        ? "❌ Connection failed - check console for debug info"
                        : sessionClosed && hasJoinedOnce
                        ? "🔒 Session has ended"
                        : step === "idle"
                        ? "⏳ Ready to connect..."
                        : `🔄 ${step.replace("-", " ")}...`}
                    </div>
                  </div>
                  <p className="text-gray-600">
                    {step === "failed"
                      ? "Check the debug logs below for troubleshooting"
                      : sessionClosed && hasJoinedOnce
                      ? "This session is no longer active"
                      : step === "idle"
                      ? "Initializing connection..."
                      : "Establishing connection..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Session Info */}
            {sessionInfo && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Session Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Provider:</strong> {sessionInfo.provider.name}
                  </div>
                  <div>
                    <strong>Client:</strong> {sessionInfo.client.name}
                  </div>
                  <div>
                    <strong>Start:</strong>{" "}
                    {new Date(sessionInfo.startDate).toLocaleTimeString()}
                  </div>
                  <div>
                    <strong>End:</strong>{" "}
                    {new Date(sessionInfo.endDate).toLocaleTimeString()}
                  </div>
                  <div>
                    <strong>Session:</strong> {sessionInfo.sessionName}
                  </div>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                System Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Render Strategy:</span>
                  <span className="text-blue-600 font-medium">
                    📺 Video Elements
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SharedArrayBuffer:</span>
                  <span
                    className={
                      systemInfo.hasSharedArrayBuffer
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {systemInfo.hasSharedArrayBuffer
                      ? "✅ Available"
                      : "❌ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cross-Origin Isolated:</span>
                  <span
                    className={
                      systemInfo.crossOriginIsolated
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {systemInfo.crossOriginIsolated
                      ? "✅ Enabled"
                      : "❌ Disabled"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>WebRTC:</span>
                  <span
                    className={
                      systemInfo.hasWebRTC ? "text-green-600" : "text-red-600"
                    }
                  >
                    {systemInfo.hasWebRTC ? "✅ Available" : "❌ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Secure Context:</span>
                  <span
                    className={
                      systemInfo.isSecure ? "text-green-600" : "text-red-600"
                    }
                  >
                    {systemInfo.isSecure ? "✅ HTTPS" : "❌ HTTP"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span
                    className={
                      connectionState === "Connected"
                        ? "text-green-600"
                        : connectionState === "Closed" && !hasJoinedOnce
                        ? "text-gray-600"
                        : "text-yellow-600"
                    }
                  >
                    {connectionState === "Closed" && !hasJoinedOnce
                      ? "Initializing"
                      : connectionState || "Not connected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session State:</span>
                  <span
                    className={
                      isInSession
                        ? "text-green-600"
                        : hasJoinedOnce
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {isInSession
                      ? "Active"
                      : hasJoinedOnce
                      ? "Ended"
                      : "Not started"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Video Ready:</span>
                  <span
                    className={
                      elementsReady && streamReady && !videoStarting
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {elementsReady && streamReady && !videoStarting
                      ? "✅ Ready"
                      : videoStarting
                      ? "🔄 Starting"
                      : elementsReady
                      ? "⏳ Stream pending"
                      : streamReady
                      ? "⏳ Elements pending"
                      : "⏳ Initializing"}
                  </span>
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Debug Logs</h3>
                <div className="bg-black text-green-400 p-3 rounded text-xs font-mono h-64 overflow-y-auto">
                  {logs.length === 0
                    ? "No logs yet..."
                    : logs.map((log, i) => (
                        <div key={i} className="mb-1">
                          {log}
                        </div>
                      ))}
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear logs
                </button>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Check browser console for complete debug info
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
