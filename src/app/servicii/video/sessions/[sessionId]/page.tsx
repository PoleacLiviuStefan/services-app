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
  
  // Refs
  const mountedRef = useRef(true);
  const zoomSdkRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const selfVideoCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteVideoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Add log function
  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || "");
    setLogs(prev => [...prev.slice(-30), logEntry]);
  }, []);

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
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) { return false; }
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

  // Setup video canvases
  const setupVideoCanvases = useCallback(() => {
    if (!videoContainerRef.current) return;

    const container = videoContainerRef.current;
    container.innerHTML = '';

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
    remoteVideoCanvasRef.current = remoteCanvas;

    container.appendChild(remoteCanvas);
    container.appendChild(selfCanvas);

    addLog("🎥 Video canvases setup complete");
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
        enforceMultipleVideos: window.crossOriginIsolated
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
  }, [addLog]);

  // Setup event listeners
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

    // Media events
    client.on('video-on', (payload: any) => {
      addLog("🎥 Video started", payload);
      if (payload.userId === currentUserId) {
        setVideoEnabled(true);
      }
      renderVideo(client, payload.userId);
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

    // Connection events
    client.on('connection-change', (payload: any) => {
      addLog("🔗 Connection changed", payload);
      if (payload.state === 'Connected') {
        setIsInSession(true);
        updateParticipants(client);
      } else if (payload.state === 'Disconnected') {
        setIsInSession(false);
      }
    });

    addLog("✅ Event listeners setup complete");
  }, [addLog, currentUserId]);

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

  // Render video for a specific user
  const renderVideo = useCallback(async (client: any, userId: string) => {
    try {
      const mediaStream = client.getMediaStream();
      const canvas = userId === currentUserId ? selfVideoCanvasRef.current : remoteVideoCanvasRef.current;
      
      if (!canvas || !mediaStream) {
        addLog(`❌ Cannot render video - canvas or stream missing for ${userId}`);
        return;
      }

      if (typeof mediaStream.renderVideo === 'function') {
        await mediaStream.renderVideo(canvas, userId, 640, 480, 0, 0, 3);
        addLog(`✅ Video rendered for user: ${userId}`);
      } else {
        addLog(`❌ renderVideo method not available for ${userId}`);
      }
    } catch (error) {
      addLog(`❌ Failed to render video for ${userId}`, error);
    }
  }, [addLog, currentUserId]);

  // ✅ ENHANCED JOIN SESSION WITH COMPLETE DEBUG
  const joinSession = useCallback(async (client: any, sessionData: SessionInfo) => {
    setStep("joining");
    addLog("🔗 Joining session...");

    try {
      // Set current user ID
      setCurrentUserId(sessionData.userId);

      // Setup video canvases before joining
      setupVideoCanvases();

      // ✅ COMPREHENSIVE TOKEN DEBUG
      console.log("🔍 ============ COMPLETE ZOOM DEBUG ============");
      console.log("📋 SESSION PARAMETERS:");
      console.log("- Session Name:", sessionData.sessionName);
      console.log("- User Name:", auth?.user?.name || "User");
      console.log("- Session Key:", sessionData.sessionKey || "(empty)");
      console.log("- Token Length:", sessionData.token.length);
      console.log("- User ID:", sessionData.userId);
      
      // Parse și analizează token-ul în detaliu
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
          
          // Verifică expirarea în timp real
          const now = Math.floor(Date.now() / 1000);
          const timeLeft = tokenPayload.exp - now;
          console.log("🔍 TOKEN EXPIRATION:");
          console.log("- Current time:", new Date().toISOString());
          console.log("- Time until expiry:", Math.round(timeLeft / 60), "minutes");
          console.log("- Is expired?", timeLeft <= 0 ? "❌ YES - TOKEN EXPIRED!" : "✅ NO");
          
          // Verifică compatibilitatea cu Video SDK
          console.log("🔍 VIDEO SDK COMPATIBILITY CHECK:");
          const hasAppKey = !!tokenPayload.app_key;
          const hasTpc = !!tokenPayload.tpc;
          const hasRoleType = tokenPayload.role_type !== undefined;
          const hasValidTiming = tokenPayload.iat && tokenPayload.exp && timeLeft > 0;
          
          console.log("- Has app_key:", hasAppKey ? "✅" : "❌");
          console.log("- Has tpc:", hasTpc ? "✅" : "❌");
          console.log("- Has role_type:", hasRoleType ? "✅" : "❌");
          console.log("- Valid timing:", hasValidTiming ? "✅" : "❌");
          
          const isVideoSDKFormat = hasAppKey && hasTpc && hasRoleType;
          console.log("- Overall Video SDK format:", isVideoSDKFormat ? "✅ CORRECT" : "❌ INCORRECT");
          
          // Verifică dacă folosește Meeting SDK format (greșit)
          if (tokenPayload.iss || tokenPayload.aud !== undefined) {
            console.log("⚠️ WARNING: Token contains Meeting SDK fields (iss/aud) - this is WRONG for Video SDK!");
          }
          
          // Salvează info pentru UI
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

      addLog("🔑 Using session details", {
        sessionName: sessionData.sessionName,
        userName: auth?.user?.name,
        hasToken: !!sessionData.token,
        tokenLength: sessionData.token?.length
      });

      // ✅ JOIN WITH DETAILED ERROR CAPTURE
      console.log("🚀 ATTEMPTING ZOOM JOIN:");
      console.log("- Method: client.join()");
      console.log("- Param 1 (sessionName):", sessionData.sessionName);
      console.log("- Param 2 (token):", sessionData.token.substring(0, 50) + "... [TRUNCATED]");
      console.log("- Param 3 (userName):", auth?.user?.name || "User");
      console.log("- Param 4 (sessionKey):", sessionData.sessionKey || "");

      // Record join attempt time
      const joinStartTime = Date.now();
      console.log("- Join attempt started at:", new Date(joinStartTime).toISOString());

      // Join session with error handling
      const joinResult = await client.join(
        sessionData.sessionName,
        sessionData.token,
        auth?.user?.name || "User",
        sessionData.sessionKey || ""
      );

      const joinEndTime = Date.now();
      console.log("✅ JOIN SUCCESSFUL:");
      console.log("- Join completed at:", new Date(joinEndTime).toISOString());
      console.log("- Join duration:", joinEndTime - joinStartTime, "ms");
      console.log("- Join result:", joinResult);
      
      addLog("✅ Successfully joined session");
      
      // Get media stream
      const stream = client.getMediaStream();
      setMediaStream(stream);
      
      setStep("connected");
      setIsInSession(true);
      
      // Update participants
      updateParticipants(client);
      
      return true;
      
    } catch (error: any) {
      console.error("❌ ============ JOIN FAILED - DETAILED ERROR ============");
      console.error("- Error occurred at:", new Date().toISOString());
      console.error("- Error type:", error?.type || "Unknown");
      console.error("- Error reason:", error?.reason || "Unknown");
      console.error("- Error code:", error?.errorCode || "Unknown");
      console.error("- Error message:", error?.message || "Unknown");
      console.error("- Full error object:", error);
      
      // Additional context
      console.error("🔍 ERROR CONTEXT:");
      console.error("- Session Name used:", sessionData.sessionName);
      console.error("- Token length used:", sessionData.token.length);
      console.error("- User name used:", auth?.user?.name || "User");
      console.error("- Session key used:", sessionData.sessionKey || "(empty)");
      
      // Error code specific guidance
      if (error?.errorCode === 200) {
        console.error("💡 ERROR 200 TROUBLESHOOTING:");
        console.error("- This usually means authentication/account issues");
        console.error("- Check: Are you using Video SDK credentials (not Meeting SDK)?");
        console.error("- Check: Is your Zoom app status 'Development' (not 'Draft')?");
        console.error("- Check: Are app_key credentials correct?");
      }
      
      addLog("❌ Failed to join session", error);
      throw error;
    }
  }, [auth?.user?.name, addLog, setupVideoCanvases, updateParticipants]);

  // Media control functions
  const toggleAudio = useCallback(async () => {
    if (!mediaStream || !isInSession) {
      addLog("❌ Cannot toggle audio - not in session or no media stream");
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
  }, [mediaStream, isInSession, audioEnabled, addLog]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStream || !isInSession) {
      addLog("❌ Cannot toggle video - not in session or no media stream");
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
        
        // Render self video after starting
        setTimeout(() => {
          if (zoomClient && currentUserId) {
            renderVideo(zoomClient, currentUserId);
          }
        }, 1000);
      }
    } catch (error: any) {
      addLog("❌ Failed to toggle video", error);
    }
  }, [mediaStream, isInSession, videoEnabled, addLog, zoomClient, currentUserId, renderVideo]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!zoomClient || !isInSession) return;

    try {
      setStep("leaving");
      addLog("👋 Leaving session...");
      
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
      setAudioEnabled(false);
      setVideoEnabled(false);
      setParticipants([]);
      setStep("disconnected");
      
      addLog("✅ Left session successfully");
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/servicii');
      }, 2000);
      
    } catch (error: any) {
      addLog("❌ Failed to leave session", error);
    }
  }, [zoomClient, isInSession, mediaStream, audioEnabled, videoEnabled, addLog, router]);

  // Main initialization flow
  const initialize = useCallback(async () => {
    if (initializingRef.current) {
      addLog("⚠️ Initialization already in progress");
      return;
    }

    initializingRef.current = true;
    
    try {
      setError("");
      setStep("starting");
      
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

  // Component lifecycle
  useEffect(() => {
    mountedRef.current = true;
    
    // Initialize when ready
    if (auth?.user && sessionId && step === "idle") {
      initialize();
    }

    return () => {
      mountedRef.current = false;
      initializingRef.current = false;
      
      // Cleanup
      if (zoomClient && isInSession) {
        zoomClient.leave().catch(console.error);
      }
    };
  }, [auth?.user, sessionId, step, initialize, zoomClient, isInSession]);

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
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                step === "connected" ? "bg-green-100 text-green-800" :
                step === "failed" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {step === "connected" ? "✅ Connected" :
                 step === "failed" ? "❌ Failed" :
                 step === "idle" ? "⏳ Ready" :
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Connection Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <div className="mt-3 text-sm text-red-600">
              <p><strong>Common fixes for error 200:</strong></p>
              <ul className="list-disc ml-5 mt-1">
                <li>Check Zoom Marketplace: App must be "Video SDK" type</li>
                <li>App status must be "Development" (not "Draft")</li>
                <li>Use correct Video SDK credentials (not Meeting SDK)</li>
                <li>Check token format in browser console</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setStep("idle");
                setError("");
                setLogs([]);
                setDebugInfo({});
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
              
              {isInSession ? (
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
                  </div>
                  
                  {/* Media Controls */}
                  <div className="flex justify-center space-x-4 mb-4">
                    <button
                      onClick={toggleAudio}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        audioEnabled 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {audioEnabled ? '🎤 Mute' : '🔇 Unmute'}
                    </button>
                    
                    <button
                      onClick={toggleVideo}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        videoEnabled 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {videoEnabled ? '📹 Stop Video' : '🎥 Start Video'}
                    </button>
                    
                    <button
                      onClick={leaveSession}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
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
                  <div className={step === "failed" ? "" : "animate-pulse"}>
                    <div className={`h-48 rounded mb-4 ${step === "failed" ? "bg-red-200" : "bg-gray-300"}`}></div>
                    <p className="text-gray-600">
                      {step === "failed" ? "Connection failed - check console for detailed debug info" : 
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
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}