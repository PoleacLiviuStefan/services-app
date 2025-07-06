"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageCircle,
} from "lucide-react";

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
  video: string;
  muted: boolean;
  bVideoOn?: boolean;
}

interface ZoomVideoInfo {
  action: string;
  userId: number;
}

export default function VideoSessionPage() {
  const { data: auth, status } = useSession();
  const { sessionId } = useParams();
  const router = useRouter();

  // ✅ MAIN STATE
  const [connectionState, setConnectionState] = useState<string>("idle");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [isInSession, setIsInSession] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [mediaReady, setMediaReady] = useState<boolean>(false);
  const [currentZoomUserId, setCurrentZoomUserId] = useState<string>("");

  // ✅ REFS SIMPLIFICAT
  const zoomClientRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);
  const initLockRef = useRef<boolean>(false); // ✅ Lock simplu pentru inițializare
  const sessionDataRef = useRef<SessionInfo | null>(null);

  // ✅ LOGGING SIMPLIFICAT
  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[VideoSession:${timestamp}] ${message}`, data || "");
  }, []);

  // ✅ FETCH SESSION INFO OPTIMIZAT
  const fetchSessionInfo = useCallback(async (): Promise<SessionInfo> => {
    if (!sessionId) throw new Error("No session ID");
    
    // ✅ Cache pentru a evita request-uri multiple
    if (sessionDataRef.current) {
      addLog("📡 Using cached session info");
      return sessionDataRef.current;
    }

    addLog("📡 Fetching session info");
    const res = await fetch(`/api/video/session-info/${sessionId}`);
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    addLog("✅ Session info received", { 
      sessionName: data.sessionName,
      hasToken: !!data.token 
    });
    
    sessionDataRef.current = data;
    return data;
  }, [sessionId, addLog]);

  // ✅ MEDIA PERMISSIONS SIMPLIFICAT
const requestMediaPermissions = useCallback(async () => {
  try {
    addLog("🎥 Requesting media permissions...");
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    // Stop stream immediately, just testing permissions
    stream.getTracks().forEach(track => track.stop());
    addLog("✅ Media permissions granted");
    return true;
  } catch (error: any) {
    addLog("⚠️ Media permissions denied (will continue anyway):", error.message);
    // ✅ NU MAI ARUNCĂ EROARE - permite continuarea fără media permissions
    return false;
  }
}, [addLog]);

  // ✅ LOAD ZOOM SDK SIMPLIFICAT
  const loadZoomSDK = useCallback(async () => {
    addLog("🔄 Loading Zoom SDK");
    try {
      let ZoomVideo = (window as any)?.ZoomVideo;
      if (!ZoomVideo) {
        const mod = await import("@zoom/videosdk");
        ZoomVideo = mod.default || mod;
      }
      if (!ZoomVideo?.createClient) {
        throw new Error("Invalid Zoom SDK - createClient not found");
      }
      addLog("✅ Zoom SDK loaded successfully");
      return ZoomVideo;
    } catch (error: any) {
      addLog("❌ Failed to load Zoom SDK:", error);
      throw error;
    }
  }, [addLog]);

  // ✅ UPDATE PARTICIPANTS SIMPLIFICAT
  const updateParticipants = useCallback(() => {
    if (!zoomClientRef.current || !mountedRef.current) return;
    
    try {
      const users = zoomClientRef.current.getAllUser();
      const participantsList: Participant[] = users.map((user: any) => ({
        userId: String(user.userId),
        displayName: user.displayName || `User ${user.userId}`,
        audio: user.audio || "off",
        video: user.video || "off", 
        muted: user.muted || false,
        bVideoOn: user.bVideoOn || false
      }));
      
      setParticipants(participantsList);
      addLog(`👥 Updated participants: ${participantsList.length} users`);
    } catch (error) {
      addLog("❌ Failed to update participants:", error);
    }
  }, [addLog]);

  // ✅ RENDER VIDEO SIMPLIFICAT
  const renderVideo = useCallback(async (userId: string) => {
    const client = zoomClientRef.current;
    const stream = mediaStreamRef.current;
    
    if (!client || !stream || !mountedRef.current) {
      addLog(`❌ Cannot render video for ${userId} - not ready`);
      return;
    }

    try {
      addLog(`🔄 Rendering video for user: ${userId}`);
      
      // Find or create video container
      const videoRoot = document.getElementById('video-root');
      if (!videoRoot) {
        addLog(`❌ Video root container not found`);
        return;
      }

      let videoElement = document.getElementById(`video-${userId}`) as HTMLVideoElement;
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.id = `video-${userId}`;
        videoElement.className = 'absolute inset-0 w-full h-full object-cover rounded-lg';
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoRoot.appendChild(videoElement);
        addLog(`📹 Created video element for ${userId}`);
      }

      // Attach video stream
      await stream.attachVideo(userId, videoElement);
      addLog(`✅ Video attached successfully for user: ${userId}`);
      
    } catch (error: any) {
      addLog(`❌ Failed to attach video for user ${userId}:`, error);
    }
  }, [addLog]);

  // ✅ ZOOM EVENT HANDLERS SIMPLIFICAT
  const handleConnectionChange = useCallback(({ state }: { state: string }) => {
    addLog("🔗 Connection state changed:", state);
    setConnectionState(state);
    
    if (state === "Connected") {
      addLog("✅ Successfully connected to Zoom session");
      setIsInSession(true);
      setMediaReady(true);
      
      // Get media stream
      const stream = zoomClientRef.current?.getMediaStream();
      if (stream) {
        mediaStreamRef.current = stream;
        addLog("✅ Media stream ready");
      }
      
      // Get current user info
      try {
        const currentUser = zoomClientRef.current?.getCurrentUserInfo();
        if (currentUser) {
          setCurrentZoomUserId(String(currentUser.userId));
          addLog("✅ Current user ID:", currentUser.userId);
        }
      } catch (userError) {
        addLog("⚠️ Could not get current user info:", userError);
      }
      
      // Update participants
      updateParticipants();
      
    } else if (state === "Closed") {
      addLog("🔌 Connection closed");
      setIsInSession(false);
      setMediaReady(false);
      setAudioEnabled(false);
      setVideoEnabled(false);
      setParticipants([]);
      setCurrentZoomUserId("");
    }
  }, [addLog, updateParticipants]);

  const handleVideoStateChange = useCallback((event: ZoomVideoInfo) => {
    addLog("👁️ Video state changed:", event);
    
    if (event.action === "Start") {
      renderVideo(String(event.userId));
    }
    
    updateParticipants();
  }, [addLog, renderVideo, updateParticipants]);

  const handleUserUpdated = useCallback((updates: any[]) => {
    addLog("👤 Users updated:", updates.length);
    
    // Render video for users with active video
    updates.forEach(update => {
      if (update.bVideoOn) {
        renderVideo(String(update.userId));
      }
    });
    
    updateParticipants();
  }, [addLog, renderVideo, updateParticipants]);

  const handleUserRemoved = useCallback((removed: any[]) => {
    addLog("👋 Users removed:", removed.length);
    
    // Clean up video elements for removed users
    removed.forEach(user => {
      const videoElement = document.getElementById(`video-${user.userId}`);
      if (videoElement) {
        videoElement.remove();
        addLog(`🧹 Cleaned up video element for user: ${user.userId}`);
      }
    });
    
    updateParticipants();
  }, [addLog, updateParticipants]);

  // ✅ INIȚIALIZARE ZOOM FIXATĂ - ELIMINĂ RACE CONDITIONS
// ✅ FUNCȚIA COMPLETĂ initializeZoom CU TOATE FIX-URILE
const initializeZoom = useCallback(async () => {
  // ✅ VERIFICARE SIMPLĂ PENTRU RACE CONDITIONS
  if (initLockRef.current || !mountedRef.current) {
    addLog("⚠️ Initialization already in progress or component unmounted");
    return;
  }

  if (zoomClientRef.current) {
    addLog("⚠️ Zoom client already exists, skipping initialization");
    return;
  }

  if (isInSession) {
    addLog("⚠️ Already in session, skipping initialization");
    return;
  }

  // ✅ LOCK INIȚIALIZAREA
  initLockRef.current = true;
  setIsInitializing(true);
  addLog("🚀 Starting Zoom initialization...");

  try {
    // 1. Request media permissions (OPȚIONAL - nu blochează)
    try {
      addLog("🎥 Requesting media permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Stop stream immediately, just testing permissions
      stream.getTracks().forEach(track => track.stop());
      addLog("✅ Media permissions granted");
    } catch (error: any) {
      addLog("⚠️ Media permissions denied (will continue anyway):", error.message);
      // ✅ NU MAI ARUNCĂ EROARE - permite continuarea fără media permissions
    }

    // 2. Load Zoom SDK
    addLog("🔄 Loading Zoom SDK");
    let ZoomVideo;
    try {
      ZoomVideo = (window as any)?.ZoomVideo;
      if (!ZoomVideo) {
        const mod = await import("@zoom/videosdk");
        ZoomVideo = mod.default || mod;
      }
      if (!ZoomVideo?.createClient) {
        throw new Error("Invalid Zoom SDK - createClient not found");
      }
      addLog("✅ Zoom SDK loaded successfully");
    } catch (error: any) {
      addLog("❌ Failed to load Zoom SDK:", error);
      throw error;
    }

    // 3. Fetch session info
    let info: SessionInfo;
    try {
      if (sessionDataRef.current) {
        addLog("📡 Using cached session info");
        info = sessionDataRef.current;
      } else {
        addLog("📡 Fetching session info");
        const res = await fetch(`/api/video/session-info/${sessionId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        addLog("✅ Session info received", { 
          sessionName: data.sessionName,
          hasToken: !!data.token 
        });
        
        sessionDataRef.current = data;
        info = data;
      }
    } catch (error: any) {
      addLog("❌ Failed to fetch session info:", error);
      throw error;
    }

    if (!mountedRef.current) return;
    
    setSessionInfo(info);
    addLog("📄 Session info set:", { sessionName: info.sessionName });

    // 4. Validate token - BASIC VALIDATION
    try {
      const payload = JSON.parse(atob(info.token.split('.')[1]));
      addLog("🔍 Token validation:", {
        hasAppKey: !!payload.app_key,
        hasTpc: !!payload.tpc,
        hasUserIdentity: !!payload.user_identity,
        hasRoleType: payload.role_type !== undefined,
        hasVersion: !!payload.version,
        sessionNameMatch: payload.tpc === info.sessionName
      });

      if (payload.tpc !== info.sessionName) {
        throw new Error(`Session name mismatch: token=${payload.tpc}, expected=${info.sessionName}`);
      }
    } catch (tokenError: any) {
      addLog("❌ Token validation failed:", tokenError);
      throw new Error(`Invalid token: ${tokenError.message}`);
    }

    // 5. Create Zoom client
    addLog("🔧 Creating Zoom client...");
    const client = ZoomVideo.createClient();
    zoomClientRef.current = client;

    // 6. Setup event listeners
    client.on('connection-change', handleConnectionChange);
    client.on('peer-video-state-change', handleVideoStateChange);
    client.on('user-updated', handleUserUpdated);
    client.on('user-removed', handleUserRemoved);
    addLog("🎧 Event listeners configured");

    // 7. Init the client and join the Video SDK session (simplified)
    await client.init("en-US", "Global", { patchJsMedia: true });
    addLog("✅ Zoom client initialized");

    const userName = String(auth?.user?.name || auth?.user?.email || `User_${Date.now()}`).trim();
    addLog("🔗 Joining session…", { topic: info.sessionName, userName });

    await client.join(info.sessionName, info.token, userName, "");
    addLog("✅ Joined Zoom session successfully");

    return; // stop further processing of the legacy join-attempt logic

  } catch (error: any) {
    addLog("❌ Initialization failed:", error);
    setError(error.message || "Failed to initialize video session");
    setConnectionState("failed");
    
    // Cleanup on error
    if (zoomClientRef.current) {
      try {
        await zoomClientRef.current.leave();
      } catch (cleanupError) {
        addLog("⚠️ Error during cleanup:", cleanupError);
      }
      zoomClientRef.current = null;
    }
  } finally {
    // ✅ UNLOCK INIȚIALIZAREA
    initLockRef.current = false;
    setIsInitializing(false);
    addLog("🔓 Initialization lock released");
  }
}, [
  addLog, 
  sessionId,
  auth?.user?.name,
  auth?.user?.email,
  auth?.user?.id,
  handleConnectionChange,
  handleVideoStateChange,
  handleUserUpdated,
  handleUserRemoved,
  isInSession
]);

  // ✅ CONTROL FUNCTIONS SIMPLIFICAT
  const toggleAudio = useCallback(async () => {
    if (!mediaStreamRef.current || !isInSession || !mediaReady) {
      addLog("❌ Cannot toggle audio - not ready");
      return;
    }

    try {
      if (audioEnabled) {
        await mediaStreamRef.current.stopAudio();
        setAudioEnabled(false);
        addLog("🔇 Audio disabled");
      } else {
        await mediaStreamRef.current.startAudio();
        setAudioEnabled(true);
        addLog("🎤 Audio enabled");
      }
    } catch (error: any) {
      addLog("❌ Audio toggle failed:", error);
      setError(`Audio error: ${error.message}`);
    }
  }, [audioEnabled, isInSession, mediaReady, addLog]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStreamRef.current || !isInSession || !mediaReady) {
      addLog("❌ Cannot toggle video - not ready");
      return;
    }

    try {
      if (videoEnabled) {
        await mediaStreamRef.current.stopVideo();
        setVideoEnabled(false);
        addLog("📹 Video disabled");
      } else {
        await mediaStreamRef.current.startVideo({
          mirrored: true,
          width: 640,
          height: 480,
          frameRate: 30
        });
        setVideoEnabled(true);
        addLog("🎥 Video enabled");
        
        // Render own video after enabling
        const currentUser = zoomClientRef.current?.getCurrentUserInfo();
        if (currentUser) {
          setTimeout(() => {
            if (mountedRef.current) {
              renderVideo(String(currentUser.userId));
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      addLog("❌ Video toggle failed:", error);
      setError(`Video error: ${error.message}`);
    }
  }, [videoEnabled, isInSession, mediaReady, addLog, renderVideo]);

  const leaveSession = useCallback(async () => {
    try {
      addLog("🚪 Leaving session...");
      
      // Stop media
      if (mediaStreamRef.current) {
        if (audioEnabled) await mediaStreamRef.current.stopAudio();
        if (videoEnabled) await mediaStreamRef.current.stopVideo();
      }

      // Leave Zoom session
      if (zoomClientRef.current) {
        await zoomClientRef.current.leave();
        zoomClientRef.current = null;
      }

      // Reset state
      setIsInSession(false);
      setMediaReady(false);
      setAudioEnabled(false);
      setVideoEnabled(false);
      setParticipants([]);
      setCurrentZoomUserId("");
      setConnectionState("idle");
      
      addLog("✅ Session left successfully");
      router.push("/servicii/sesiuni");
    } catch (error: any) {
      addLog("❌ Failed to leave session:", error);
      router.push("/servicii/sesiuni");
    }
  }, [audioEnabled, videoEnabled, addLog, router]);

  const sendMessage = useCallback(() => {
    if (newMessage.trim() && mountedRef.current) {
      const message = `${auth?.user?.name || 'You'}: ${newMessage.trim()}`;
      setMessages((prev: string[]) => [...prev, message]);
      setNewMessage("");
      addLog("💬 Message sent:", newMessage.trim());
    }
  }, [newMessage, auth?.user?.name, addLog]);

  // ✅ EFFECTS OPTIMIZAT
  useEffect(() => {
    mountedRef.current = true;
    addLog("🔄 Component mounted");
    
    return () => {
      mountedRef.current = false;
      addLog("🔄 Component unmounting");
      
      // Simple cleanup
      if (zoomClientRef.current) {
        zoomClientRef.current.leave().catch(() => {});
        zoomClientRef.current = null;
      }
    };
  }, [addLog]);

  // ✅ DEBUG AUTH USER
  useEffect(() => {
    if (status === "authenticated" && auth?.user) {
      addLog("🔍 Auth debug:", {
        status,
        name: auth?.user?.name,
        email: auth?.user?.email,
        id: auth?.user?.id
      });
    }
  }, [status, auth?.user, addLog]);

  // ✅ MAIN INITIALIZATION EFFECT - OPTIMIZAT
  useEffect(() => {
    // ✅ VERIFICĂRI SIMPLE
    if (status !== "authenticated") {
      addLog("⏳ Waiting for authentication...");
      return;
    }

    if (!auth?.user) {
      addLog("❌ No authenticated user");
      return;
    }

    if (!sessionId) {
      addLog("❌ No session ID");
      return;
    }

    if (!mountedRef.current) {
      addLog("❌ Component not mounted");
      return;
    }

    if (initLockRef.current) {
      addLog("⏳ Initialization already in progress");
      return;
    }

    if (zoomClientRef.current) {
      addLog("✅ Zoom client already exists");
      return;
    }

    // ✅ INIȚIALIZEAZĂ DOAR O DATĂ
    addLog("🎯 Starting initialization...");
    initializeZoom();

  }, [status, auth?.user, sessionId, initializeZoom, addLog]);

  // ✅ LOADING STATES
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg mb-2">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!auth?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h1>
          <p className="text-gray-400">Please sign in to access the video session.</p>
        </div>
      </div>
    );
  }

  // ✅ MAIN UI
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-white font-semibold text-lg">
                {sessionInfo
                  ? `Video Session: ${sessionInfo.sessionName.slice(-8)}`
                  : "Video Session"}
              </h1>
              <p className="text-gray-400 text-sm">
                {isInitializing
                  ? "🔄 Initializing..."
                  : connectionState === "Connected"
                  ? `✅ Connected • ${participants.length} participant${participants.length !== 1 ? 's' : ''}`
                  : connectionState === "connecting"
                  ? "🔄 Connecting..."
                  : connectionState === "failed"
                  ? "❌ Connection failed"
                  : "⏳ Ready to connect"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main video area */}
        <div className="flex-1 flex flex-col">
          {/* Video container */}
          <div className="flex-1 relative bg-gray-900 p-4">
            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white max-w-md">
                  <div className="text-red-400 text-6xl mb-4">⚠️</div>
                  <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
                  <p className="text-gray-400 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
                {/* Video container */}
                <div id="video-root" className="absolute inset-0 w-full h-full">
                  {(!isInSession || isInitializing) && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-20">
                      <div className="text-center">
                        <div className="animate-pulse text-4xl mb-4">
                          {isInitializing ? "⚙️" : connectionState === "connecting" ? "📡" : "📹"}
                        </div>
                        <p className="text-lg mb-2">
                          {isInitializing
                            ? "Initializing video session..."
                            : connectionState === "connecting"
                            ? "Connecting to session..."
                            : "Ready to connect"}
                        </p>
                        <p className="text-sm text-gray-400">Please wait...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleAudio}
                disabled={!isInSession || !mediaReady || isInitializing}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  audioEnabled
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
                title={audioEnabled ? "Mute audio" : "Unmute audio"}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                disabled={!isInSession || !mediaReady || isInitializing}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  videoEnabled
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
                title={videoEnabled ? "Stop video" : "Start video"}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={leaveSession}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                title="Leave session"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>

            {/* Status indicators */}
            <div className="flex justify-center mt-2 space-x-4 text-xs text-gray-400">
              <span>Audio: {audioEnabled ? "ON" : "OFF"}</span>
              <span>Video: {videoEnabled ? "ON" : "OFF"}</span>
              <span>State: {connectionState}</span>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">No messages yet...</p>
              ) : (
                messages.map((msg: string, i: number) => (
                  <div key={`message-${i}`} className="bg-gray-700 rounded-lg p-3">
                    <p className="text-white text-sm">{msg}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}