// components/ZoomVideoSession.tsx
// ✅ FIXED: Removed infinite DOM checking loop, simplified initialization

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
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  // Connection state tracking
  const [connectionState, setConnectionState] = useState<string>("idle");
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [sessionClosed, setSessionClosed] = useState<boolean>(false);
  const [hasJoinedOnce, setHasJoinedOnce] = useState<boolean>(false);
  const [intentionalLeave, setIntentionalLeave] = useState<boolean>(false);
  
  // Canvas and stream state tracking
  const [canvasesReady, setCanvasesReady] = useState<boolean>(false);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  
  // Refs
  const mountedRef = useRef(true);
  const zoomSdkRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const selfVideoCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteVideoCanvasRef = useRef<HTMLCanvasElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedOnceRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const currentUserIdRef = useRef<string>("");

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Add log function
  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || "");
    setLogs(prev => [...prev.slice(-30), logEntry]);
  }, []);

  // Helper for creating new consulting session
  const createNewConsultingSession = useCallback(async () => {
    if (!sessionInfo) {
      throw new Error("Nu e încărcat sessionInfo-ul curent");
    }

    addLog("🆕 Creating a brand-new Zoom session…");
    const res = await fetch("/api/video/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [ sessionInfo.provider.id, sessionInfo.client.id ],
        providerId: sessionInfo.provider.id,
        clientId:    sessionInfo.client.id,
        specialityId: "4fb4527a-b5c2-4089-a39a-232dd601a520",
        packageId:    "b587aa8a-f317-4422-846e-fa391983041b"
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

  // Enhanced system check
  const checkSystem = useCallback(() => {
    const info = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      isSecure: window.isSecureContext,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      
      // Critical requirements
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      crossOriginIsolated: window.crossOriginIsolated,
      
      // Browser capabilities
      hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasWebGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        } catch (e) { 
          console.warn('WebGL check failed:', e);
          return false; 
        }
      })(),
      
      // Browser detection
      userAgent: navigator.userAgent,
      isChrome: /Chrome/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      isFirefox: /Firefox/.test(navigator.userAgent),
      
      // SDK status
      sdkLoaded: !!zoomSdkRef.current,
      windowZoomVideo: typeof window !== 'undefined' ? !!(window as any).ZoomVideo : false
    };
    
    setSystemInfo(info);
    addLog("🔍 System check completed", info);
    
    // Validate requirements
    const meetsRequirements = info.hasSharedArrayBuffer && info.crossOriginIsolated;
    
    if (!meetsRequirements) {
      addLog("❌ CRITICAL: System requirements not met", {
        hasSharedArrayBuffer: info.hasSharedArrayBuffer,
        crossOriginIsolated: info.crossOriginIsolated,
        requiredHeaders: "Cross-Origin-Embedder-Policy: require-corp, Cross-Origin-Opener-Policy: same-origin"
      });
    } else {
      addLog("✅ System meets Zoom Video SDK requirements");
    }
    
    return info;
  }, [addLog]);

  // Load Zoom SDK
  const loadZoomSDK = useCallback(async () => {
    if (zoomSdkRef.current || !mountedRef.current) {
      return zoomSdkRef.current;
    }

    try {
      addLog("📦 Loading Zoom Video SDK...");
      
      // Verify SharedArrayBuffer
      if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error("SharedArrayBuffer not available - check CORS headers");
      }
      
      let zoomSDK = null;

      // Try window object first
      if (typeof window !== 'undefined' && (window as any).ZoomVideo) {
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
          throw new Error("Failed to load Zoom Video SDK - ensure @zoom/videosdk is installed");
        }
      }

      if (!zoomSDK || typeof zoomSDK.createClient !== 'function') {
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

  // ✅ SIMPLIFIED: Setup video canvases without complex DOM waiting
  const setupVideoCanvases = useCallback((): boolean => {
    addLog("🎥 Setting up video canvases...");

    // Simple check - if ref is not available, return false
    if (!videoContainerRef.current) {
      addLog("❌ Video container ref not available");
      return false;
    }

    try {
      const container = videoContainerRef.current;
      
      // Clear existing canvases
      container.innerHTML = '';
      selfVideoCanvasRef.current = null;
      remoteVideoCanvasRef.current = null;
      setCanvasesReady(false);

      addLog("🧹 Cleared existing canvases, creating new ones...");

      // Self video canvas
      const selfCanvas = document.createElement('canvas');
      selfCanvas.width = 320;
      selfCanvas.height = 240;
      selfCanvas.style.cssText = `
        width: 320px;
        height: 240px;
        border-radius: 8px;
        border: 2px solid #3b82f6;
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
        background: #1f2937;
      `;
      selfCanvas.id = 'self-video-canvas';
      selfVideoCanvasRef.current = selfCanvas;

      // Remote video canvas
      const remoteCanvas = document.createElement('canvas');
      remoteCanvas.width = 640;
      remoteCanvas.height = 480;
      remoteCanvas.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 8px;
        background: #1f2937;
      `;
      remoteCanvas.id = 'remote-video-canvas';
      remoteVideoCanvasRef.current = remoteCanvas;

      // Add canvases to container
      container.appendChild(remoteCanvas);
      container.appendChild(selfCanvas);

      // Simple verification
      const hasChildren = container.children.length === 2;
      
      addLog("🔍 Canvas verification:", {
        containerExists: !!container,
        hasChildren,
        childCount: container.children.length
      });

      if (hasChildren) {
        setCanvasesReady(true);
        addLog("✅ Video canvases setup complete");
        return true;
      } else {
        addLog("❌ Canvas setup verification failed");
        return false;
      }
    } catch (error) {
      addLog("❌ Failed to setup video canvases", error);
      console.error('Canvas setup error:', error);
      setCanvasesReady(false);
      return false;
    }
  }, [addLog]);

  // Initialize Zoom SDK
  const initializeZoomSDK = useCallback(async (sessionData: SessionInfo) => {
    const zoomSDK = zoomSdkRef.current;
    
    if (!zoomSDK) {
      throw new Error("Zoom Video SDK not available");
    }

    setStep("sdk-init");
    addLog("🚀 Initializing Zoom Video SDK...");

    try {
      // Clean up any existing client
      try {
        if (typeof zoomSDK.destroyClient === 'function') {
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

      // Enhanced initialization config
      addLog("⚙️ Initializing SDK with enhanced config...");
      const initConfig = {
        debug: process.env.NODE_ENV === 'development',
        patchJsMedia: true,
        stayAwake: true,
        logLevel: "info",
        webEndpoint: "zoom.us",
        dependentAssets: "https://source.zoom.us/2.18.0/lib",
        enforceMultipleVideos: window.crossOriginIsolated,
        disableWebGL: !systemInfo.hasWebGL,
        fallbackRenderer: true
      };

      await client.init("en-US", "Global", initConfig);
      addLog("✅ SDK initialized successfully");

      // Setup event listeners
      setupEventListeners(client);

      return client;
    } catch (error: any) {
      addLog("❌ SDK initialization failed", error);
      throw error;
    }
  }, [addLog, systemInfo]);

  // Event listeners with better video handling
  const setupEventListeners = useCallback((client: any) => {
    addLog("🎧 Setting up event listeners...");

    // User events
    client.on('user-added', (payload: any) => {
      addLog("👥 User added", payload);
      updateParticipants(client);
    });

    client.on('user-removed', (payload: any) => {
      addLog("👥 User removed", payload);
      updateParticipants(client);
    });

    client.on('user-updated', (payload: any) => {
      addLog("👥 User updated", payload);
      updateParticipants(client);
    });

    // Media events with better validation
    client.on('video-on', (payload: any) => {
      addLog("🎥 Video started", payload);
      if (payload.userId === currentUserIdRef.current) {
        setVideoEnabled(true);
      }
      
      // Wait a bit and then try to render video with validation
      setTimeout(() => {
        if (isInSession && !sessionClosed && canvasesReady && streamReady) {
          renderVideo(client, payload.userId);
        } else {
          addLog(`⚠️ Delaying video render for ${payload.userId} - not ready yet`);
        }
      }, 500);
    });

    client.on('video-off', (payload: any) => {
      addLog("📹 Video stopped", payload);
      if (payload.userId === currentUserId) {
        setVideoEnabled(false);
      }
    });

    client.on('audio-on', (payload: any) => {
      addLog("🎤 Audio started", payload);
      if (payload.userId === currentUserId) {
        setAudioEnabled(true);
      }
    });

    client.on('audio-off', (payload: any) => {
      addLog("🔇 Audio stopped", payload);
      if (payload.userId === currentUserId) {
        setAudioEnabled(false);
      }
    });

    // Connection event handling
    client.on('connection-change', (payload: any) => {
      addLog("🔗 Connection changed", payload);
      setConnectionState(payload.state);
      
      if (payload.state === 'Connected') {
        setIsInSession(true);
        setSessionClosed(false);
        setReconnectAttempts(0);
        setHasJoinedOnce(true);
        updateParticipants(client);
        addLog("✅ Session connected successfully");
        
        // Get and verify media stream after connection
        try {
          const stream = client.getMediaStream();
          if (stream) {
            setMediaStream(stream);
            setStreamReady(true);
            addLog("✅ Media stream obtained and ready");
          }
        } catch (e) {
          addLog("⚠️ Could not get media stream immediately after connection");
        }
        
      } else if (payload.state === 'Disconnected') {
        setIsInSession(false);
        setStreamReady(false);
        addLog("📡 Session disconnected");
        
        if (hasJoinedOnce && !intentionalLeave && reconnectAttempts < 3) {
          attemptReconnect(client);
        }
        
      } else if (payload.state === 'Closed') {
        if (hasJoinedOnceRef.current || intentionalLeaveRef.current) {
          setSessionClosed(true);
          setIsInSession(false);
          setStreamReady(false);
          addLog("⚠️ Session closed");
        } else {
          addLog("⚠️ Session closed during initialization - this is normal");
        }
      }
    });

    addLog("✅ Event listeners setup complete");
  }, [addLog, currentUserId, isInSession, sessionClosed, reconnectAttempts, hasJoinedOnce, intentionalLeave, canvasesReady, streamReady]);

  // Reconnect logic
  const attemptReconnect = useCallback((client: any) => {
    if (!sessionInfo || sessionClosed || reconnectAttempts >= 3 || intentionalLeave) {
      return;
    }

    setReconnectAttempts(prev => prev + 1);
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
  }, [sessionInfo, sessionClosed, reconnectAttempts, intentionalLeave, auth?.user?.name, addLog]);

  // Update participants list
  const updateParticipants = useCallback((client: any) => {
    try {
      const users = client.getAllUser();
      const participantList: Participant[] = users.map((user: any) => ({
        userId: user.userId,
        displayName: user.displayName || user.userId,
        audio: user.audio || 'unmuted',
        muted: user.muted || false,
        video: user.video || 'off',
        avatar: user.avatar || ''
      }));
      
      setParticipants(participantList);
      addLog(`👥 Updated participants: ${participantList.length} users`);
    } catch (error) {
      addLog("❌ Failed to update participants", error);
    }
  }, [addLog]);

  // Render video with comprehensive validation
  const renderVideo = useCallback(async (client: any, userId: string) => {
    // Comprehensive validation before attempting render
    if (sessionClosed || !isInSession) {
      addLog(`⚠️ Skipping video render - session not active`);
      return;
    }

    if (!canvasesReady) {
      addLog(`⚠️ Skipping video render - canvases not ready for ${userId}`);
      return;
    }

    if (!streamReady || !mediaStream) {
      addLog(`⚠️ Skipping video render - stream not ready for ${userId}`);
      return;
    }

    try {
      // Double-check canvas availability
      const canvas = userId === currentUserIdRef.current
        ? selfVideoCanvasRef.current
        : remoteVideoCanvasRef.current;

      if (!canvas) {
        addLog(`❌ Canvas missing for ${userId}`);
        return;
      }

      // Verify canvas is attached to DOM
      if (!document.body.contains(canvas)) {
        addLog(`❌ Canvas not attached to DOM for ${userId}`);
        return;
      }

      // Verify media stream has renderVideo method
      if (!mediaStream || typeof mediaStream.renderVideo !== "function") {
        addLog(`❌ MediaStream or renderVideo method not available for ${userId}`);
        return;
      }

      // Attempt to render
      addLog(`🎥 Attempting to render video for ${userId}...`);
      const [w, h] = userId === currentUserIdRef.current ? [320, 240] : [640, 480];
      
      await mediaStream.renderVideo(canvas, userId, w, h, 0, 0, 3);
      addLog(`✅ Video rendered successfully for user: ${userId}`);
      
    } catch (error: any) {
      addLog(`❌ Video render failed for ${userId}:`, error.message);
      console.warn("Video render error (non-critical):", error);
      
      // If it's a "user not found" error, log it but don't treat as critical
      if (error.message && error.message.includes('not found')) {
        addLog(`ℹ️ User ${userId} video not available yet - this is normal`);
      }
    }
  }, [addLog, sessionClosed, isInSession, canvasesReady, streamReady, mediaStream]);

  // ✅ SIMPLIFIED: Join session without complex DOM waiting
  const joinSession = useCallback(async (client: any, sessionData: SessionInfo) => {
    setStep("joining");
    addLog("🔗 Joining session...");

    try {
      // Set current user ID
      setCurrentUserId(sessionData.userId);

      // ✅ Try to setup canvases - if it fails, continue anyway
      addLog("🎨 Setting up video canvases...");
      const canvasSuccess = setupVideoCanvases();
      if (!canvasSuccess) {
        addLog("⚠️ Canvas setup failed, but continuing with join...");
        // Don't throw error, just continue
      }

      // Token debug (keeping existing debugging)
      console.log("🔍 ============ COMPLETE ZOOM DEBUG ============");
      console.log("📋 SESSION PARAMETERS:");
      console.log("- Session Name:", sessionData.sessionName);
      console.log("- User Name:", auth?.user?.name || "User");
      console.log("- Session Key:", sessionData.sessionKey || "(empty)");
      console.log("- Token Length:", sessionData.token.length);
      console.log("- User ID:", sessionData.userId);
      
      // Parse token
      try {
        const tokenParts = sessionData.token.split('.');
        console.log("🔍 TOKEN STRUCTURE:");
        console.log("- Token Parts:", tokenParts.length, tokenParts.length === 3 ? "✅" : "❌");
        
        if (tokenParts.length === 3) {
          const tokenHeader = JSON.parse(atob(tokenParts[0]));
          const tokenPayload = JSON.parse(atob(tokenParts[1]));
          
          console.log("🔍 TOKEN HEADER:");
          console.log("- Algorithm:", tokenHeader.alg);
          console.log("- Type:", tokenHeader.typ);
          
          console.log("🔍 TOKEN PAYLOAD (Video SDK Required Fields):");
          console.log("- app_key:", tokenPayload.app_key ? tokenPayload.app_key.substring(0, 15) + "..." : "❌ MISSING");
          console.log("- tpc (session name):", tokenPayload.tpc || "❌ MISSING");
          console.log("- role_type:", tokenPayload.role_type !== undefined ? tokenPayload.role_type + " (0=participant, 1=host)" : "❌ MISSING");
          console.log("- user_identity:", tokenPayload.user_identity || "❌ MISSING");
          console.log("- session_key:", tokenPayload.session_key !== undefined ? `"${tokenPayload.session_key}"` : "❌ MISSING");
          console.log("- iat (issued):", tokenPayload.iat ? new Date(tokenPayload.iat * 1000).toISOString() : "❌ MISSING");
          console.log("- exp (expires):", tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toISOString() : "❌ MISSING");
          
          const now = Math.floor(Date.now() / 1000);
          const timeLeft = tokenPayload.exp - now;
          console.log("🔍 TOKEN EXPIRATION:");
          console.log("- Current time:", new Date().toISOString());
          console.log("- Time until expiry:", Math.round(timeLeft / 60), "minutes");
          console.log("- Is expired?", timeLeft <= 0 ? "❌ YES - TOKEN EXPIRED!" : "✅ NO");
          
          const hasAppKey = !!tokenPayload.app_key;
          const hasTpc = !!tokenPayload.tpc;
          const hasRoleType = tokenPayload.role_type !== undefined;
          const hasValidTiming = tokenPayload.iat && tokenPayload.exp && timeLeft > 0;
          
          console.log("🔍 VIDEO SDK COMPATIBILITY CHECK:");
          console.log("- Has app_key:", hasAppKey ? "✅" : "❌");
          console.log("- Has tpc:", hasTpc ? "✅" : "❌");
          console.log("- Has role_type:", hasRoleType ? "✅" : "❌");
          console.log("- Valid timing:", hasValidTiming ? "✅" : "❌");
          
          const isVideoSDKFormat = hasAppKey && hasTpc && hasRoleType;
          console.log("- Overall Video SDK format:", isVideoSDKFormat ? "✅ CORRECT" : "❌ INCORRECT");
          
          setDebugInfo({
            tokenValid: isVideoSDKFormat && hasValidTiming,
            payload: tokenPayload,
            expiryMinutes: Math.round(timeLeft / 60),
            isVideoSDKFormat
          });
        }
      } catch (parseError) {
        console.error("❌ CRITICAL: Failed to parse token:", parseError);
        addLog("❌ Invalid token format - cannot parse");
        throw new Error("Invalid token format");
      }

      // Join session
      console.log("🚀 ATTEMPTING ZOOM JOIN:");
      const joinStartTime = Date.now();
      
      const joinResult = await client.join(
        sessionData.sessionName,
        sessionData.token,
        auth?.user?.name || "User",
        sessionData.sessionKey || ""
      );

      const joinEndTime = Date.now();
      console.log("✅ JOIN SUCCESSFUL:");
      console.log("- Join duration:", joinEndTime - joinStartTime, "ms");
      console.log("- Join result:", joinResult);
      
      addLog("✅ Successfully joined session");
      
      // Get media stream and verify it's ready
      try {
        const stream = client.getMediaStream();
        if (stream) {
          setMediaStream(stream);
          setStreamReady(true);
          addLog("✅ Media stream obtained after join");
        } else {
          addLog("⚠️ Media stream not immediately available - will retry");
          // Set a timeout to check again
          setTimeout(() => {
            const retryStream = client.getMediaStream();
            if (retryStream) {
              setMediaStream(retryStream);
              setStreamReady(true);
              addLog("✅ Media stream obtained on retry");
            }
          }, 1000);
        }
      } catch (streamError) {
        addLog("⚠️ Error getting media stream after join:", streamError);
      }
      
      setStep("connected");
      
      // Update participants
      updateParticipants(client);
      
      // ✅ Try to setup canvases again after successful join if they weren't ready before
      if (!canvasSuccess) {
        addLog("🔄 Retrying canvas setup after successful join...");
        setTimeout(() => {
          const retryCanvas = setupVideoCanvases();
          if (retryCanvas) {
            addLog("✅ Canvas setup successful on retry");
          }
        }, 1000);
      }
      
      return true;
      
    } catch (error: any) {
      console.error("❌ ============ JOIN FAILED ============");
      console.error("- Error:", error);
      
      addLog("❌ Failed to join session", error);
      throw error;
    }
  }, [auth?.user?.name, addLog, setupVideoCanvases, updateParticipants]);

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

  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !isInSession || sessionClosed) {
      addLog("❌ Cannot toggle video - session not active");
      return;
    }

    try {
      if (videoEnabled) {
        await mediaStream.stopVideo();
        setVideoEnabled(false);
        addLog("📹 Video disabled");
      } else {
        await mediaStream.startVideo();
        setVideoEnabled(true);
        addLog("🎥 Video enabled");
        
        // Render self video after starting with proper validation
        setTimeout(() => {
          if (zoomClient && currentUserId && !sessionClosed && canvasesReady && streamReady) {
            renderVideo(zoomClient, currentUserId);
          }
        }, 1000);
      }
    } catch (error: any) {
      addLog("❌ Failed to toggle video", error);
    }
  }, [mediaStream, isInSession, sessionClosed, videoEnabled, addLog, zoomClient, currentUserId, renderVideo, canvasesReady, streamReady]);

  // Leave session with proper state management
  const leaveSession = useCallback(async () => {
    if (!zoomClient) return;

    try {
      setStep("leaving");
      setIntentionalLeave(true);
      addLog("👋 Leaving session...");
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Stop media streams
      if (mediaStream) {
        try {
          if (audioEnabled) await mediaStream.stopAudio();
          if (videoEnabled) await mediaStream.stopVideo();
        } catch (e) {
          addLog("⚠️ Error stopping media during leave");
        }
      }
      
      await zoomClient.leave();
      
      setIsInSession(false);
      setSessionClosed(true);
      setAudioEnabled(false);
      setVideoEnabled(false);
      setParticipants([]);
      setConnectionState("disconnected");
      setStep("disconnected");
      setStreamReady(false);
      setCanvasesReady(false);
      
      addLog("✅ Left session successfully");
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/servicii');
      }, 2000);
      
    } catch (error: any) {
      addLog("❌ Failed to leave session", error);
    } finally {
      initializingRef.current = false;
    }
  }, [zoomClient, mediaStream, audioEnabled, videoEnabled, addLog, router]);

  // ✅ SIMPLIFIED: Main initialization flow without DOM checks
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
      setCanvasesReady(false);
      setStreamReady(false);
      
      // System check
      const sysInfo = checkSystem();
      
      if (!sysInfo.hasSharedArrayBuffer) {
        throw new Error("SharedArrayBuffer not available - check next.config.js headers");
      }
      
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
  }, [checkSystem, loadZoomSDK, fetchSessionInfo, initializeZoomSDK, joinSession, addLog]);

  useEffect(() => { hasJoinedOnceRef.current = hasJoinedOnce; }, [hasJoinedOnce]);
  useEffect(() => { intentionalLeaveRef.current = intentionalLeave; }, [intentionalLeave]);

  // ✅ SIMPLIFIED: Component lifecycle without DOM ready dependency
  useEffect(() => {
    mountedRef.current = true;
    
    // Initialize when ready
    if (auth?.user && sessionId && step === "idle") {
      addLog("🚀 Starting initialization...");
      initialize();
    }

    return () => {
      mountedRef.current = false;
      setIntentionalLeave(true);
      
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (zoomClient && isInSession) {
        zoomClient.leave().catch(console.error);
      }
    };
  }, [auth?.user, sessionId, step, initialize]);

  // Render loading state
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

  // Render unauthorized state
  if (!auth?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please sign in to access video sessions.</p>
        </div>
      </div>
    );
  }

  // Get system warnings
  const getSystemWarnings = () => {
    const warnings = [];
    
    if (!systemInfo.hasSharedArrayBuffer) {
      warnings.push("⚠️ SharedArrayBuffer missing - video features will not work");
    }
    
    if (!systemInfo.crossOriginIsolated) {
      warnings.push("⚠️ Cross-Origin Isolation disabled - add COOP/COEP headers to next.config.js");
    }
    
    if (!systemInfo.isSecure && !systemInfo.isLocalhost) {
      warnings.push("⚠️ HTTPS required for production use");
    }
    
    if (!systemInfo.hasWebGL) {
      warnings.push("⚠️ WebGL not available - video rendering may not work properly");
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
              <h1 className="text-2xl font-bold text-gray-900">Video Consultation</h1>
              <p className="text-gray-600 mt-1">
                {sessionInfo ? `Session with ${sessionInfo.provider.name}` : 'Loading session...'}
              </p>
              {/* Connection status display */}
              {connectionState && connectionState !== 'idle' && (
                <div className="mt-2">
                  <span className={`text-sm px-2 py-1 rounded ${
                    connectionState === 'Connected' ? 'bg-green-100 text-green-700' :
                    connectionState === 'Closed' && hasJoinedOnce ? 'bg-red-100 text-red-700' :
                    connectionState === 'Closed' && !hasJoinedOnce ? 'bg-yellow-100 text-yellow-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    Connection: {connectionState}
                    {connectionState === 'Closed' && !hasJoinedOnce && ' (Initializing)'}
                  </span>
                  {reconnectAttempts > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Reconnect attempts: {reconnectAttempts}/3)
                    </span>
                  )}
                  {/* Canvas and stream readiness indicators */}
                  <div className="mt-1 text-xs text-gray-500">
                    Canvas: {canvasesReady ? '✅' : '⏳'} | Stream: {streamReady ? '✅' : '⏳'}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                step === "connected" ? "bg-green-100 text-green-800" :
                step === "failed" ? "bg-red-100 text-red-800" :
                sessionClosed && hasJoinedOnce ? "bg-gray-100 text-gray-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {step === "connected" ? "✅ Connected" :
                 step === "failed" ? "❌ Failed" :
                 step === "idle" ? "⏳ Ready" :
                 sessionClosed && hasJoinedOnce ? "🔒 Session Closed" :
                 `🔄 ${step.replace('-', ' ')}`}
              </span>
              {participants.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  👥 {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info Panel */}
        {debugInfo.payload && process.env.NODE_ENV === 'development' && (
          <div className={`rounded-lg p-4 mb-6 ${
            debugInfo.tokenValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              debugInfo.tokenValid ? 'text-green-800' : 'text-red-800'
            }`}>
              🔍 Token Debug Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Token Status:</strong> {debugInfo.tokenValid ? "✅ Valid" : "❌ Invalid"}
              </div>
              <div>
                <strong>Expires:</strong> {debugInfo.expiryMinutes} minutes
              </div>
              <div>
                <strong>Role:</strong> {debugInfo.payload.role_type === 0 ? "Participant" : "Host"}
              </div>
              <div>
                <strong>Video SDK Format:</strong> {debugInfo.isVideoSDKFormat ? "✅ Yes" : "❌ No"}
              </div>
            </div>
            {!debugInfo.isVideoSDKFormat && (
              <div className="mt-2 p-2 bg-red-100 rounded text-red-800 text-sm">
                ⚠️ Token is not in Video SDK format! Check backend configuration.
              </div>
            )}
          </div>
        )}

        {/* System Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">System Requirements:</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-yellow-600">
              <p>Add to next.config.js:</p>
              <code className="bg-yellow-100 p-1 rounded">
                headers: [{'{'} key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' {'}'}]
              </code>
            </div>
          </div>
        )}

        {/* Session closed warning */}
        {sessionClosed && hasJoinedOnce && step !== "leaving" && !intentionalLeave && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-800 mb-2">Session Ended</h3>
            <p className="text-orange-700 text-sm">
              The video session has ended. This could be due to:
            </p>
            <ul className="text-orange-700 text-sm mt-2 ml-4 list-disc">
              <li>Session timeout</li>
              <li>Network connectivity issues</li>
              <li>All participants leaving</li>
              <li>Server maintenance</li>
            </ul>
            {reconnectAttempts < 3 && (
              <button
                onClick={() => {
                  setSessionClosed(false);
                  setReconnectAttempts(0);
                  setIntentionalLeave(false);
                  setHasJoinedOnce(false);
                  initialize();
                }}
                className="mt-3 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
              >
                🔄 Try Reconnect
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Connection Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <div className="mt-3 text-sm text-red-600">
              <p><strong>Common fixes:</strong></p>
              <ul className="list-disc ml-5 mt-1">
                <li>Check internet connection</li>
                <li>Ensure browser supports WebGL and WebRTC</li>
                <li>Allow camera and microphone permissions</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setStep("idle");
                setError("");
                setLogs([]);
                setDebugInfo({});
                setSessionClosed(false);
                setIntentionalLeave(false);
                setHasJoinedOnce(false);
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
                    style={{ aspectRatio: '4/3' }}
                  >
                    {/* Videos will be rendered here by canvases */}
                    <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                      {participants.length === 0 ? "Waiting for participants..." : ""}
                    </div>
                    
                    {/* Connection status overlay */}
                    {connectionState !== 'Connected' && isInSession && (
                      <div className="absolute top-4 left-4 z-20">
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">
                          {connectionState === 'Connecting' ? '🔄 Connecting...' :
                           connectionState === 'Reconnecting' ? '🔄 Reconnecting...' :
                           connectionState === 'Closed' ? '⚠️ Connection Lost' :
                           `📡 ${connectionState}`}
                        </div>
                      </div>
                    )}

                    {/* Render readiness overlay */}
                    {(!canvasesReady || !streamReady) && isInSession && (
                      <div className="absolute top-4 right-4 z-20">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                          {!canvasesReady ? '🎨 Setting up video...' : 
                           !streamReady ? '📡 Preparing stream...' : ''}
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
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {audioEnabled ? '🎤 Mute' : '🔇 Unmute'}
                    </button>
                    
                    <button
                      onClick={toggleVideo}
                      disabled={!isInSession || sessionClosed || !streamReady}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        videoEnabled 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {videoEnabled ? '📹 Stop Video' : '🎥 Start Video'}
                    </button>
                    
                    <button
                      onClick={leaveSession}
                      disabled={!zoomClient}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      👋 Leave Session
                    </button>
                  </div>

                  {/* Participants List */}
                  {participants.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Participants</h3>
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div key={participant.userId} className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {participant.displayName} 
                              {participant.userId === currentUserId && " (You)"}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                participant.audio === 'on' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {participant.audio === 'on' ? '🎤' : '🔇'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                participant.video === 'on' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {participant.video === 'on' ? '🎥' : '📹'}
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
                  <div className={step === "failed" || (sessionClosed && hasJoinedOnce) ? "" : "animate-pulse"}>
                    <div className={`h-48 rounded mb-4 ${
                      step === "failed" ? "bg-red-200" : 
                      (sessionClosed && hasJoinedOnce) ? "bg-gray-300" : 
                      "bg-gray-300"
                    }`}></div>
                    <p className="text-gray-600">
                      {step === "failed" ? "Connection failed - check console for detailed debug info" : 
                       (sessionClosed && hasJoinedOnce) ? "Session has ended" :
                       step === "idle" ? "Ready to connect..." :
                       `${step.replace('-', ' ')}...`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            
            {/* Session Info */}
            {sessionInfo && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Session Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Provider:</strong> {sessionInfo.provider.name}</div>
                  <div><strong>Client:</strong> {sessionInfo.client.name}</div>
                  <div><strong>Start:</strong> {new Date(sessionInfo.startDate).toLocaleTimeString()}</div>
                  <div><strong>End:</strong> {new Date(sessionInfo.endDate).toLocaleTimeString()}</div>
                  <div><strong>Session:</strong> {sessionInfo.sessionName}</div>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>SharedArrayBuffer:</span>
                  <span className={systemInfo.hasSharedArrayBuffer ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.hasSharedArrayBuffer ? '✅ Available' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cross-Origin Isolated:</span>
                  <span className={systemInfo.crossOriginIsolated ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.crossOriginIsolated ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>WebRTC:</span>
                  <span className={systemInfo.hasWebRTC ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.hasWebRTC ? '✅ Available' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>WebGL:</span>
                  <span className={systemInfo.hasWebGL ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.hasWebGL ? '✅ Available' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Secure Context:</span>
                  <span className={systemInfo.isSecure ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.isSecure ? '✅ HTTPS' : '❌ HTTP'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className={
                    connectionState === 'Connected' ? 'text-green-600' : 
                    connectionState === 'Closed' && !hasJoinedOnce ? 'text-gray-600' :
                    'text-yellow-600'
                  }>
                    {connectionState === 'Closed' && !hasJoinedOnce ? 'Initializing' : connectionState || 'Not connected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session State:</span>
                  <span className={
                    isInSession ? 'text-green-600' : 
                    hasJoinedOnce ? 'text-red-600' : 
                    'text-gray-600'
                  }>
                    {isInSession ? 'Active' : hasJoinedOnce ? 'Ended' : 'Not started'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Video Ready:</span>
                  <span className={
                    canvasesReady && streamReady ? 'text-green-600' : 'text-yellow-600'
                  }>
                    {canvasesReady && streamReady ? '✅ Ready' : 
                     canvasesReady ? '⏳ Stream pending' : 
                     streamReady ? '⏳ Canvas pending' : '⏳ Initializing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Debug Logs</h3>
                <div className="bg-black text-green-400 p-3 rounded text-xs font-mono h-64 overflow-y-auto">
                  {logs.length === 0 ? "No logs yet..." : logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
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
                {sessionClosed && hasJoinedOnce && (
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
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    🔄 Start New Session
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}