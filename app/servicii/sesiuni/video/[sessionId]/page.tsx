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
  Users,
  AlertCircle,
} from "lucide-react";

// Types
interface SessionInfo {
  sessionName: string;
  token: string;
  userId: string;
  startDate: string;
  endDate: string;
  provider: { id: string; name: string };
  client: { id: string; name: string };
}

interface Participant {
  userId: string;
  displayName: string;
  audio: boolean;
  video: boolean;
  muted: boolean;
}

interface ZoomEventInfo {
  action: string;
  userId: number;
}

// Connection states
type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "failed";

export default function VideoSessionPage() {
  const { data: session, status } = useSession();
  const { sessionId } = useParams();
  const router = useRouter();

  // Core state
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Media state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  
  // UI state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs
  const zoomClientRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const initLockRef = useRef(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Utility functions
  const log = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[ZoomVideo:${timestamp}] ${message}`, data || "");
  }, []);

  const setErrorState = useCallback((message: string) => {
    setError(message);
    setConnectionState("failed");
    log("Error:", message);
  }, [log]);

  // Fetch session info
  const fetchSessionInfo = useCallback(async (): Promise<SessionInfo> => {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    log("Fetching session info...");
    const response = await fetch(`/api/video/session-info/${sessionId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch session info: ${response.status}`);
    }

    log("Session info fetched successfully");
    return data;
  }, [sessionId, log]);

  // Load Zoom SDK
  const loadZoomSDK = useCallback(async () => {
    log("Loading Zoom SDK...");
    
    try {
      // Check if already loaded
      if ((window as any).ZoomVideo) {
        log("Zoom SDK already loaded");
        return (window as any).ZoomVideo;
      }

      // Dynamic import
      const zoomModule = await import("@zoom/videosdk");
      const ZoomVideo = zoomModule.default || zoomModule;

      if (!ZoomVideo || typeof ZoomVideo.createClient !== "function") {
        throw new Error("Invalid Zoom SDK module");
      }

      log("Zoom SDK loaded successfully");
      return ZoomVideo;
    } catch (error: any) {
      log("Failed to load Zoom SDK:", error);
      throw new Error(`Failed to load Zoom SDK: ${error.message}`);
    }
  }, [log]);

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!zoomClientRef.current) return;

    try {
      const users = zoomClientRef.current.getAllUser();
      const participantsList: Participant[] = users.map((user: any) => ({
        userId: String(user.userId),
        displayName: user.displayName || `User ${user.userId}`,
        audio: user.audio === "computer",
        video: user.bVideoOn || false,
        muted: user.muted || false,
      }));

      setParticipants(participantsList);
      log(`Updated participants: ${participantsList.length} users`);
    } catch (error) {
      log("Failed to update participants:", error);
    }
  }, [log]);

  // Render video for a user
  const renderVideo = useCallback(async (userId: string) => {
    if (!mediaStreamRef.current || !videoContainerRef.current) {
      log(`Cannot render video for ${userId} - not ready`);
      return;
    }

    try {
      log(`Rendering video for user: ${userId}`);
      
      // Create or get video element
      let videoElement = document.getElementById(`video-${userId}`) as HTMLVideoElement;
      
      if (!videoElement) {
        videoElement = document.createElement("video");
        videoElement.id = `video-${userId}`;
        videoElement.className = "w-full h-full object-cover rounded-lg";
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoContainerRef.current.appendChild(videoElement);
      }

      // Attach video stream
      await mediaStreamRef.current.attachVideo(userId, videoElement);
      log(`Video rendered successfully for user: ${userId}`);
      
    } catch (error: any) {
      log(`Failed to render video for user ${userId}:`, error);
    }
  }, [log]);

  // Clean up video element
  const cleanupVideo = useCallback((userId: string) => {
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
      videoElement.remove();
      log(`Cleaned up video for user: ${userId}`);
    }
  }, [log]);

  // Event handlers
  const handleConnectionChange = useCallback(({ state }: { state: string }) => {
    log("Connection state changed:", state);
    
    switch (state) {
      case "Connected":
        setConnectionState("connected");
        setMediaReady(true);
        
        // Get media stream
        if (zoomClientRef.current) {
          const stream = zoomClientRef.current.getMediaStream();
          if (stream) {
            mediaStreamRef.current = stream;
            log("Media stream ready");
          }
        }
        
        updateParticipants();
        break;
        
      case "Closed":
        setConnectionState("disconnected");
        setMediaReady(false);
        setAudioEnabled(false);
        setVideoEnabled(false);
        setParticipants([]);
        break;
        
      case "Connecting":
        setConnectionState("connecting");
        break;
        
      default:
        log("Unknown connection state:", state);
    }
  }, [log, updateParticipants]);

  const handleVideoStateChange = useCallback((event: ZoomEventInfo) => {
    log("Video state changed:", event);
    
    if (event.action === "Start") {
      renderVideo(String(event.userId));
    } else if (event.action === "Stop") {
      cleanupVideo(String(event.userId));
    }
    
    updateParticipants();
  }, [log, renderVideo, cleanupVideo, updateParticipants]);

  const handleUserUpdated = useCallback((updates: any[]) => {
    log("Users updated:", updates.length);
    
    updates.forEach(update => {
      if (update.bVideoOn) {
        renderVideo(String(update.userId));
      } else {
        cleanupVideo(String(update.userId));
      }
    });
    
    updateParticipants();
  }, [log, renderVideo, cleanupVideo, updateParticipants]);

  const handleUserRemoved = useCallback((removed: any[]) => {
    log("Users removed:", removed.length);
    
    removed.forEach(user => {
      cleanupVideo(String(user.userId));
    });
    
    updateParticipants();
  }, [log, cleanupVideo, updateParticipants]);

  // Initialize Zoom session
  const initializeZoom = useCallback(async () => {
    // Prevent multiple initializations
    if (initLockRef.current || !mountedRef.current) {
      log("Initialization blocked - already in progress or unmounted");
      return;
    }

    if (zoomClientRef.current) {
      log("Zoom client already exists");
      return;
    }

    initLockRef.current = true;
    setIsInitializing(true);
    setError("");

    try {
      log("Starting Zoom initialization...");

      // 1. Load Zoom SDK
      const ZoomVideo = await loadZoomSDK();

      // 2. Fetch session info
      const info = await fetchSessionInfo();
      setSessionInfo(info);

      // 3. Create Zoom client
      log("Creating Zoom client...");
      const client = ZoomVideo.createClient();
      
      // 4. Setup event listeners
      client.on("connection-change", handleConnectionChange);
      client.on("peer-video-state-change", handleVideoStateChange);
      client.on("user-updated", handleUserUpdated);
      client.on("user-removed", handleUserRemoved);

      zoomClientRef.current = client;

      // 5. Join session
      log("Joining Zoom session...");
      setConnectionState("connecting");

      const joinParams = {
        signature: info.token,
        topic: info.sessionName,
        userName: session?.user?.name || session?.user?.email || "Anonymous User",
        password: "",
      };

      log("Join parameters:", {
        topic: joinParams.topic,
        userName: joinParams.userName,
        hasSignature: !!joinParams.signature,
      });

      await client.join(joinParams);
      log("Successfully joined Zoom session");

    } catch (error: any) {
      log("Zoom initialization failed:", error);
      setErrorState(error.message || "Failed to initialize video session");
      
      // Cleanup on error
      if (zoomClientRef.current) {
        try {
          await zoomClientRef.current.leave();
        } catch (cleanupError) {
          log("Error during cleanup:", cleanupError);
        }
        zoomClientRef.current = null;
      }
      
    } finally {
      initLockRef.current = false;
      setIsInitializing(false);
    }
  }, [
    log,
    loadZoomSDK,
    fetchSessionInfo,
    session?.user?.name,
    session?.user?.email,
    handleConnectionChange,
    handleVideoStateChange,
    handleUserUpdated,
    handleUserRemoved,
    setErrorState,
  ]);

  // Media controls
  const toggleAudio = useCallback(async () => {
    if (!mediaStreamRef.current || !mediaReady) {
      log("Cannot toggle audio - not ready");
      return;
    }

    try {
      if (audioEnabled) {
        await mediaStreamRef.current.stopAudio();
        setAudioEnabled(false);
        log("Audio disabled");
      } else {
        await mediaStreamRef.current.startAudio();
        setAudioEnabled(true);
        log("Audio enabled");
      }
    } catch (error: any) {
      log("Audio toggle failed:", error);
      setErrorState(`Audio error: ${error.message}`);
    }
  }, [audioEnabled, mediaReady, log, setErrorState]);

  const toggleVideo = useCallback(async () => {
    if (!mediaStreamRef.current || !mediaReady) {
      log("Cannot toggle video - not ready");
      return;
    }

    try {
      if (videoEnabled) {
        await mediaStreamRef.current.stopVideo();
        setVideoEnabled(false);
        log("Video disabled");
      } else {
        await mediaStreamRef.current.startVideo({
          mirrored: true,
        });
        setVideoEnabled(true);
        log("Video enabled");
        
        // Render own video
        const currentUser = zoomClientRef.current?.getCurrentUserInfo();
        if (currentUser) {
          setTimeout(() => renderVideo(String(currentUser.userId)), 1000);
        }
      }
    } catch (error: any) {
      log("Video toggle failed:", error);
      setErrorState(`Video error: ${error.message}`);
    }
  }, [videoEnabled, mediaReady, log, setErrorState, renderVideo]);

  const leaveSession = useCallback(async () => {
    try {
      log("Leaving session...");
      
      // Stop media
      if (mediaStreamRef.current) {
        if (audioEnabled) {
          await mediaStreamRef.current.stopAudio().catch(() => {});
        }
        if (videoEnabled) {
          await mediaStreamRef.current.stopVideo().catch(() => {});
        }
      }

      // Leave Zoom session
      if (zoomClientRef.current) {
        await zoomClientRef.current.leave();
        zoomClientRef.current = null;
      }

      // Clean up video elements
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = "";
      }

      // Reset state
      setConnectionState("idle");
      setMediaReady(false);
      setAudioEnabled(false);
      setVideoEnabled(false);
      setParticipants([]);

      log("Session left successfully");
      router.push("/servicii/sesiuni");
      
    } catch (error: any) {
      log("Failed to leave session:", error);
      router.push("/servicii/sesiuni");
    }
  }, [audioEnabled, videoEnabled, log, router]);

  // Chat functions
  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const message = `${session?.user?.name || "You"}: ${newMessage.trim()}`;
    setMessages((prev: string[]) => [...prev, message]);
    setNewMessage("");
    log("Message sent");
  }, [newMessage, session?.user?.name, log]);

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      
      // Cleanup on unmount
      if (zoomClientRef.current) {
        zoomClientRef.current.leave().catch(() => {});
        zoomClientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user && sessionId && !isInitializing && !zoomClientRef.current) {
      initializeZoom();
    }
  }, [status, session?.user, sessionId, isInitializing, initializeZoom]);

  // Loading states
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
          <p className="text-gray-400">Please sign in to access this video session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-white font-semibold">
                {sessionInfo ? `Session: ${sessionInfo.sessionName}` : "Video Session"}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  connectionState === "connected" ? "bg-green-500" : 
                  connectionState === "connecting" ? "bg-yellow-500" : 
                  connectionState === "failed" ? "bg-red-500" : "bg-gray-500"
                }`} />
                <span>
                  {connectionState === "connected" ? "Connected" :
                   connectionState === "connecting" ? "Connecting..." :
                   connectionState === "failed" ? "Connection failed" :
                   "Ready"}
                </span>
                {participants.length > 0 && (
                  <>
                    <span>•</span>
                    <Users className="w-4 h-4" />
                    <span>{participants.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
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
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
                  <p className="text-gray-400 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
                {/* Video container */}
                <div 
                  ref={videoContainerRef}
                  className="absolute inset-0 w-full h-full"
                >
                  {(!mediaReady || isInitializing) && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-lg">
                          {isInitializing ? "Initializing..." : 
                           connectionState === "connecting" ? "Connecting..." : 
                           "Waiting for connection..."}
                        </p>
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
                disabled={!mediaReady || isInitializing}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 ${
                  audioEnabled
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                disabled={!mediaReady || isInitializing}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 ${
                  videoEnabled
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={leaveSession}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
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
                <p className="text-gray-400 text-center">No messages yet</p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <p className="text-white text-sm">{message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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