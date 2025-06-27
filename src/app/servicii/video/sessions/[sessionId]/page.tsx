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

// Global state to survive hot reloads
declare global {
  interface Window {
    __ZOOM_SESSION_STATE__?: {
      [key: string]: {
        client: any;
        mediaStream: any;
        isVideoOn: boolean;
        isAudioOn: boolean;
        connectionStatus: string;
        isJoined: boolean;
        participants: ZoomUser[];
        lastActivity: number;
      };
    };
  }
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
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Video attachment tracking
  const [localVideoAttached, setLocalVideoAttached] = useState(false);
  const [videoAttachmentMethod, setVideoAttachmentMethod] =
    useState<string>("");
  const [videoStreamReady, setVideoStreamReady] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<string>("prompt");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const attachmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);

  // Session tracking
  const sessionKey = `${sessionInfo?.sessionName || sessionId}_${
    auth?.user?.id || "unknown"
  }`;

  // Enhanced logging
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[${timestamp}] [VideoSession] ${message}`, data || "");
  };

  const logError = (message: string, error?: any) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.error(
      `[${timestamp}] [VideoSession ERROR] ${message}`,
      error || ""
    );
  };

  // Check camera permissions
  const checkCameraPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(result.state);
      result.addEventListener('change', () => {
        setCameraPermission(result.state);
      });
    } catch (e) {
      log("Could not check camera permission", e);
    }
  }, []);

  // Global state management with hot reload support
  const getGlobalState = useCallback(() => {
    if (!window.__ZOOM_SESSION_STATE__) {
      window.__ZOOM_SESSION_STATE__ = {};
    }
    return window.__ZOOM_SESSION_STATE__[sessionKey];
  }, [sessionKey]);

  const setGlobalState = useCallback(
    (state: any) => {
      if (!window.__ZOOM_SESSION_STATE__) {
        window.__ZOOM_SESSION_STATE__ = {};
      }
      window.__ZOOM_SESSION_STATE__[sessionKey] = {
        ...state,
        lastActivity: Date.now(),
      };
    },
    [sessionKey]
  );

  const clearGlobalState = useCallback(() => {
    if (
      window.__ZOOM_SESSION_STATE__ &&
      window.__ZOOM_SESSION_STATE__[sessionKey]
    ) {
      delete window.__ZOOM_SESSION_STATE__[sessionKey];
    }
  }, [sessionKey]);

  // Token validation
  const validateZoomToken = (
    token: string
  ): { isValid: boolean; error?: string; expiresAt?: Date } => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(payload.exp * 1000);

      if (payload.exp < now) {
        return {
          isValid: false,
          error: `Token expirat la ${expiresAt.toISOString()}`,
          expiresAt,
        };
      }

      return { isValid: true, expiresAt };
    } catch (e) {
      return { isValid: false, error: "Token format invalid" };
    }
  };

  // Improved video attachment with proper stream readiness check
  const attachLocalVideo = useCallback(async () => {
    if (!mediaStream || !isVideoOn || !localVideoRef.current) return false;
    const videoElement = localVideoRef.current;

    try {
      // 1) First check if we have a video track
      let videoTrack = null;
      if (typeof mediaStream.getVideoTrack === 'function') {
        videoTrack = mediaStream.getVideoTrack();
      }
      
      log('👀 Attach video attempt:', {
        hasMediaStream: !!mediaStream,
        hasVideoTrack: !!videoTrack,
        trackReadyState: videoTrack?.readyState,
        hasAttachVideo: typeof mediaStream.attachVideo === 'function',
        elementReady: !!videoElement
      });

      // 2) Try the Zoom SDK attachVideo method
      if (typeof mediaStream.attachVideo === 'function') {
        await mediaStream.attachVideo(videoElement);
        log('✅ attachVideo succeeded');
        setLocalVideoAttached(true);
        setVideoAttachmentMethod('zoom-sdk');
        setVideoStreamReady(true);
        return true;
      }

      // 3) Fallback: try getting the raw MediaStream
  if (mediaStream.getMediaStream) {
  const native = mediaStream.getMediaStream();
  console.log("Fallback native tracks:", native.getVideoTracks().length);
  videoElement.srcObject = native;
  await videoElement.play();
  return true;
}

      log('❌ No working attachment method found');
      return false;

    } catch (err: any) {
      logError('❌ Video attachment failed', err);
      // If it's a permission error, update state
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setError('Camera access denied. Please allow camera access and refresh.');
      }
      return false;
    }
  }, [mediaStream, isVideoOn]);

  // Auto-retry video attachment with exponential backoff
  const scheduleVideoRetry = useCallback(() => {
    if (!mountedRef.current || retryCountRef.current >= 5) {
      if (retryCountRef.current >= 5) {
        logError("Maximum video attachment retries reached");
        setError("Nu s-a putut conecta video-ul după mai multe încercări");
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
    retryCountRef.current++;

    log(`Scheduling video retry ${retryCountRef.current}/5 in ${delay}ms`);

    attachmentTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      const success = await attachLocalVideo();
      if (!success && isVideoOn && mediaStream && mountedRef.current) {
        scheduleVideoRetry();
      }
    }, delay);
  }, [attachLocalVideo, isVideoOn, mediaStream]);

  // Enhanced cleanup function
  const cleanup = useCallback(
    async (clearGlobal = false) => {
      log("🧹 Starting cleanup...", { clearGlobal });

      if (attachmentTimeoutRef.current) {
        clearTimeout(attachmentTimeoutRef.current);
        attachmentTimeoutRef.current = null;
      }

      const globalState = getGlobalState();

      try {
        if (globalState?.mediaStream) {
          try {
            if (globalState.isVideoOn && typeof globalState.mediaStream.stopVideo === "function") {
              await globalState.mediaStream.stopVideo();
            }
            if (globalState.isAudioOn && typeof globalState.mediaStream.stopAudio === "function") {
              await globalState.mediaStream.stopAudio();
            }
          } catch (e: any) {
            logError("Error stopping media streams", e);
          }
        }

        if (clearGlobal && globalState?.client) {
          try {
            if (typeof globalState.client.off === "function") {
              globalState.client.off("user-added");
              globalState.client.off("user-removed");
              globalState.client.off("peer-video-state-change");
              globalState.client.off("peer-audio-state-change");
              globalState.client.off("connection-change");
            }
            if (typeof globalState.client.leave === "function") {
              await globalState.client.leave();
            }
          } catch (e: any) {
            logError("Error during client cleanup", e);
          }
        }

        if (clearGlobal) {
          try {
            if (typeof ZoomVideo.destroyClient === "function") {
              ZoomVideo.destroyClient();
            }
          } catch (e: any) {
            logError("Error destroying client", e);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.pause();
          localVideoRef.current.srcObject = null;
          localVideoRef.current.load();
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.pause();
          remoteVideoRef.current.srcObject = null;
          remoteVideoRef.current.load();
        }

        if (clearGlobal) {
          clearGlobalState();
        }

        if (mountedRef.current) {
          setClient(null);
          setMediaStream(null);
          setVideoOn(false);
          setAudioOn(false);
          setLocalVideoAttached(false);
          setVideoAttachmentMethod("");
          setVideoStreamReady(false);
          retryCountRef.current = 0;
          setParticipants([]);
          setConnectionStatus("disconnected");
          setIsMediaReady(false);
          setIsInitialized(false);
        }

        log("✅ Cleanup completed");
      } catch (e: any) {
        logError("Error during cleanup", e);
      }
    },
    [getGlobalState, clearGlobalState]
  );

  // Fetch session info
  useEffect(() => {
    if (!sessionId) return;

    log("Fetching session info", { sessionId });
    setLoading(true);
    setError("");

    fetch(`/api/video/session-info/${sessionId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
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
        setError(`Eroare la încărcarea sesiunii: ${e.message}`);
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  }, [sessionId]);

  // Check camera permissions on mount
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

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
      if (!updateTimer()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionInfo?.endDate]);

  // Restore state from global data on mount
  useEffect(() => {
    const globalState = getGlobalState();
    if (globalState && globalState.isJoined) {
      log("🔄 Restoring state from global data", {
        connectionStatus: globalState.connectionStatus,
        isVideoOn: globalState.isVideoOn,
        isAudioOn: globalState.isAudioOn,
        participants: globalState.participants?.length || 0,
      });

      setClient(globalState.client);
      setMediaStream(globalState.mediaStream);
      setVideoOn(globalState.isVideoOn);
      setAudioOn(globalState.isAudioOn);
      setConnectionStatus(globalState.connectionStatus);
      setIsMediaReady(!!globalState.mediaStream);
      setIsInitialized(true);
      setParticipants(globalState.participants || []);

      if (globalState.isVideoOn) {
        setTimeout(async () => {
          if (!mountedRef.current) return;
          const attached = await attachLocalVideo();
          if (!attached) {
            scheduleVideoRetry();
          }
        }, 1000);
      }
    }
  }, [getGlobalState, attachLocalVideo, scheduleVideoRetry]);

  // Main Zoom initialization with hot reload protection
  useEffect(() => {
    if (!sessionInfo || !auth?.user || initializationRef.current) {
      return;
    }

    const globalState = getGlobalState();
    if (globalState && globalState.isJoined && globalState.client) {
      log("Using existing global session data - skipping initialization");
      return;
    }

    initializationRef.current = true;

    log("🚀 Starting NEW Zoom initialization", { sessionKey });

    (async () => {
      try {
        if (!mountedRef.current) return;

        setConnectionStatus("connecting");
        setError("");

        const tokenValidation = validateZoomToken(sessionInfo.token);
        if (!tokenValidation.isValid) {
          throw new Error(`Token invalid: ${tokenValidation.error}`);
        }

        try {
          const existingGlobal = getGlobalState();
          if (!existingGlobal || !existingGlobal.isJoined) {
            if (typeof ZoomVideo.destroyClient === "function") {
              ZoomVideo.destroyClient();
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        const zmClient = ZoomVideo.createClient();

        // Initialize with settings optimized for camera issues
        await zmClient.init("en-US", "Global", {
           videoSourceTimeout: 30000,
          patchJsMedia: true,
          stayAwake: true,
          enforceMultipleVideos: false,
          // Remove disableVideoDecodeAcceleration as it might cause issues
          logLevel: "info",
          leaveOnPageUnload: false,
        });

        // Join session using the token from backend (not process.env)
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token, // Use token from backend, not process.env
          auth.user.name || "Unknown User",
          "" // No password
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

        const newGlobalState = {
          client: zmClient,
          mediaStream: ms,
          isVideoOn: false,
          isAudioOn: false,
          connectionStatus: "connected",
          isJoined: true,
          participants: [],
        };
        setGlobalState(newGlobalState);

        // Set up event listeners
        zmClient.on("user-added", (payload: any) => {
          if (!mountedRef.current) return;
          log("👤 User added", payload);
          setTimeout(() => {
            if (zmClient && typeof zmClient.getAllUser === "function" && mountedRef.current) {
              const users = zmClient.getAllUser();
              setParticipants(users);
              const currentGlobal = getGlobalState();
              if (currentGlobal) {
                setGlobalState({ ...currentGlobal, participants: users });
              }
            }
          }, 1000);
        });

        zmClient.on("user-removed", (payload: any) => {
          if (!mountedRef.current) return;
          log("👤 User removed", payload);
          setTimeout(() => {
            if (zmClient && typeof zmClient.getAllUser === "function" && mountedRef.current) {
              const users = zmClient.getAllUser();
              setParticipants(users);
              const currentGlobal = getGlobalState();
              if (currentGlobal) {
                setGlobalState({ ...currentGlobal, participants: users });
              }
            }
          }, 500);
        });

        zmClient.on("connection-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("🔗 Connection state change", payload);
          if (payload.state) {
            setConnectionStatus(payload.state);
            const currentGlobal = getGlobalState();
            if (currentGlobal) {
              setGlobalState({
                ...currentGlobal,
                connectionStatus: payload.state,
              });
            }
          }
        });

        // Listen for video state changes
        zmClient.on("peer-video-state-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("📹 Peer video state change", payload);
          // Handle remote video attachment here if needed
        });

        setIsMediaReady(true);

        // Start with audio only initially for stability
        try {
          if (typeof ms.startAudio === "function") {
            await ms.startAudio();
            if (mountedRef.current) {
              setAudioOn(true);
              log("✅ Audio started");

              const currentGlobal = getGlobalState();
              if (currentGlobal) {
                setGlobalState({ ...currentGlobal, isAudioOn: true });
              }
            }
          }
        } catch (e: any) {
          logError("Audio start failed", e);
          if (e.reason === 'INSUFFICIENT_PRIVILEGES') {
            setError('Insufficient privileges to start audio. Please check microphone permissions.');
          }
        }

        setTimeout(() => {
          if (zmClient && typeof zmClient.getAllUser === "function" && mountedRef.current) {
            const users = zmClient.getAllUser();
            setParticipants(users);
            const currentGlobal = getGlobalState();
            if (currentGlobal) {
              setGlobalState({ ...currentGlobal, participants: users });
            }
          }
        }, 2000);

      } catch (e: any) {
        if (!mountedRef.current) return;
        logError("❌ Zoom initialization failed", e);
        setError(`Eroare la conectare: ${e.message}`);
        setConnectionStatus("failed");
        setIsInitialized(false);
        initializationRef.current = false;
      }
    })();

    return () => {
      log("Component unmounting...");
      cleanup(false);
    };
  }, [
    sessionInfo?.sessionName,
    sessionInfo?.token,
    auth?.user?.name,
    auth?.user?.id,
    sessionKey,
    getGlobalState,
    setGlobalState,
    cleanup,
  ]);

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Video attachment effect
  useEffect(() => {
    if (isVideoOn && mediaStream && !localVideoAttached && mountedRef.current) {
      log("Attempting video attachment due to state change");
      setTimeout(async () => {
        if (!mountedRef.current) return;
        const success = await attachLocalVideo();
        if (!success) {
          scheduleVideoRetry();
        }
      }, 1000);
    }
  }, [isVideoOn, mediaStream, localVideoAttached, attachLocalVideo, scheduleVideoRetry]);

async function waitForVideoReady(msTimeout = 20000, interval = 200): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < msTimeout) {
    const track = mediaStream?.getVideoTrack?.();
    if (track?.readyState === "live") {
      log("✅ Video track is live");
      return true;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  logError("⚠️ Video track did not become live in time");
  return false;
}

  // Video toggle with global state sync
const toggleVideo = useCallback(async () => {
  const globalState = getGlobalState();
  if (!globalState?.mediaStream || !isMediaReady || connectionStatus !== "connected") {
    return;
  }

  try {
    if (isVideoOn) {
      // === STOP VIDEO ===
      log("📹 Stopping local video");
      if (typeof globalState.mediaStream.stopVideo === "function") {
        await globalState.mediaStream.stopVideo();
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.load();
      }
      setVideoOn(false);
      setLocalVideoAttached(false);
      setVideoAttachmentMethod("");
      setVideoStreamReady(false);
      retryCountRef.current = 0;

      if (attachmentTimeoutRef.current) {
        clearTimeout(attachmentTimeoutRef.current);
        attachmentTimeoutRef.current = null;
      }

      setGlobalState({ ...globalState, isVideoOn: false });

    } else {
      // === START VIDEO ===
      log("📹 Attempting to start local video");

      // 1) Check camera permission
      if (cameraPermission === "denied") {
        setError("Camera access denied. Please allow camera access and refresh.");
        return;
      }

      const videoEl = localVideoRef.current;
      if (!videoEl) {
        setError("Video element not ready yet");
        return;
      }

      try {
        // 2a) Non-SharedArrayBuffer browsers: pass the video element directly
        if (typeof window.SharedArrayBuffer !== "function") {
          await globalState.mediaStream.startVideo({
            videoElement: videoEl,
            videoQuality: "360p",
            facingMode: "user",
          });
        }
        // 2b) SAB-enabled browsers: start then render
        else {
          await globalState.mediaStream.startVideo({
            videoQuality: "360p",
            facingMode: "user",
          });
          globalState.mediaStream.renderVideo(videoEl);
        }

        log("✅ startVideo() succeeded");
      } catch (e: any) {
        logError("❌ startVideo() failed", e);
        // handle SDK errors
        if (e.reason === "INSUFFICIENT_PRIVILEGES") {
          setError("Camera access denied. Please allow camera access and refresh.");
          setCameraPermission("denied");
        } else if (e.reason === "DEVICE_NOT_FOUND") {
          setError("No camera found. Please connect a camera and refresh.");
        } else {
          setError(`Cannot start camera: ${e.message || e.reason}`);
        }
        return;
      }

      // 3) Update state (SDK has attached for you)
      setVideoOn(true);
      setGlobalState({ ...globalState, isVideoOn: true });
      setLocalVideoAttached(true);
      setVideoAttachmentMethod("zoom-sdk");
      setVideoStreamReady(true);
    }
  } catch (e: any) {
    logError("Video toggle error", e);
    setError(`Video error: ${e.message}`);
  }
}, [
  isVideoOn,
  isMediaReady,
  connectionStatus,
  cameraPermission,
  getGlobalState,
  setGlobalState,
]);



  // Audio toggle with global state sync
  const toggleAudio = useCallback(async () => {
    const globalState = getGlobalState();
    if (!globalState?.mediaStream || !isMediaReady || connectionStatus !== "connected") {
      return;
    }

    try {
      if (isAudioOn) {
        if (typeof globalState.mediaStream.stopAudio === "function") {
          await globalState.mediaStream.stopAudio();
          setAudioOn(false);
          setGlobalState({ ...globalState, isAudioOn: false });
        }
      } else {
        if (typeof globalState.mediaStream.startAudio === "function") {
          await globalState.mediaStream.startAudio();
          setAudioOn(true);
          setGlobalState({ ...globalState, isAudioOn: true });
        }
      }
    } catch (e: any) {
      logError("Audio toggle error", e);
      if (e.reason === 'INSUFFICIENT_PRIVILEGES') {
        setError('Microphone access denied. Please allow microphone access and refresh.');
      } else {
        setError(`Audio error: ${e.message}`);
      }
    }
  }, [isAudioOn, isMediaReady, connectionStatus, getGlobalState, setGlobalState]);

  // Leave session
  const leave = useCallback(async () => {
    log("User leaving session...");
    setConnectionStatus("disconnecting");
    await cleanup(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }, [cleanup]);

  // Manual video retry
  const retryVideoAttachment = useCallback(async () => {
    if (!isVideoOn) return;

    log("🔄 Manual video attachment retry...");
    retryCountRef.current = 0;

    const result = await attachLocalVideo();
    if (!result) {
      scheduleVideoRetry();
    }
  }, [isVideoOn, attachLocalVideo, scheduleVideoRetry]);

  // Debug info
  const debugInfo = useCallback(() => {
    const globalState = getGlobalState();
    console.log("🔍 DEBUG INFO:", {
      timestamp: new Date().toISOString(),
      mounted: mountedRef.current,
      initializing: initializationRef.current,
      connectionStatus,
      isVideoOn,
      isAudioOn,
      localVideoAttached,
      videoAttachmentMethod,
      videoStreamReady,
      retryCount: retryCountRef.current,
      isMediaReady,
      isInitialized,
      participants: participants.length,
      sessionKey,
      cameraPermission,
      globalState: globalState
        ? {
            hasClient: !!globalState.client,
            hasMediaStream: !!globalState.mediaStream,
            isVideoOn: globalState.isVideoOn,
            isAudioOn: globalState.isAudioOn,
            connectionStatus: globalState.connectionStatus,
            isJoined: globalState.isJoined,
            participants: globalState.participants?.length || 0,
            lastActivity: new Date(globalState.lastActivity).toISOString(),
          }
        : null,
      domElements: {
        localVideo: !!localVideoRef.current,
        remoteVideo: !!remoteVideoRef.current,
        localVideoReady: localVideoRef.current
          ? {
              readyState: localVideoRef.current.readyState,
              videoWidth: localVideoRef.current.videoWidth,
              videoHeight: localVideoRef.current.videoHeight,
              paused: localVideoRef.current.paused,
            }
          : null,
      },
    });
  }, [
    connectionStatus,
    isVideoOn,
    isAudioOn,
    localVideoAttached,
    videoAttachmentMethod,
    videoStreamReady,
    isMediaReady,
    isInitialized,
    participants.length,
    sessionKey,
    cameraPermission,
    getGlobalState,
  ]);

  // Render logic
  const isProvider = sessionInfo?.provider.id === auth?.user?.id;
  const other = isProvider ? sessionInfo?.client : sessionInfo?.provider;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Se încarcă sesiunea...</p>
        </div>
      </div>
    );
  }

  if (!auth?.user) {
    return <div className="text-red-500 p-4">Acces neautorizat</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <p className="font-semibold">Eroare:</p>
        <p className="mt-2">{error}</p>
        <div className="mt-4 space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reîncarcă
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
          <p>Se pregătește sesiunea...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between">
        <div>
          <h2 className="text-xl font-bold">Sesiune Video</h2>
          <p>
            <strong>Client:</strong> {sessionInfo.client.name}
          </p>
          <p>
            <strong>Furnizor:</strong> {sessionInfo.provider.name}
          </p>
          <div className="mt-1">
            <span>Status:</span>
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                connectionStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-100 text-yellow-800"
                  : connectionStatus === "disconnecting"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {connectionStatus === "connected"
                ? "Conectat"
                : connectionStatus === "connecting"
                ? "Se conectează..."
                : connectionStatus === "disconnecting"
                ? "Se deconectează..."
                : connectionStatus === "failed"
                ? "Conexiune eșuată"
                : "Deconectat"}
            </span>
            {isMediaReady && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Media Ready
              </span>
            )}
            {cameraPermission === 'denied' && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Camera Denied
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
          <p className="text-sm text-gray-500">
            Participanți: {participants.length}
          </p>
        </div>
      </div>

      {/* CAMERA PERMISSION WARNING */}
      {cameraPermission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                Camera access is denied. Please allow camera access in your browser settings:
              </p>
              <ul className="text-xs text-red-600 mt-1 list-disc ml-5">
                <li>Click the camera icon in the address bar</li>
                <li>Select "Allow" for camera access</li>
                <li>Refresh this page</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO ATTACHMENT WARNING */}
      {isVideoOn && !localVideoAttached && connectionStatus === "connected" && cameraPermission !== 'denied' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-orange-600">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-orange-800">
                  Video-ul este pornit dar nu se afișează corect.
                  {retryCountRef.current > 3 && " Încercați să reîncărcați pagina."}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Retry: {retryCountRef.current}/5
                </p>
              </div>
            </div>
            <button
              onClick={retryVideoAttachment}
              disabled={retryCountRef.current > 5}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {retryCountRef.current > 5 ? "Prea multe încercări" : "Reconectează Video"}
            </button>
          </div>
        </div>
      )}

      {/* VIDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Video */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">
              📹 Tu ({auth.user.name})
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? "(Furnizor)" : "(Client)"}
              </span>
            </h3>
            <div className="flex gap-2 items-center">
              <span
                className={`w-3 h-3 rounded-full ${
                  isVideoOn ? "bg-green-500" : "bg-red-500"
                }`}
                title={isVideoOn ? "Video pornit" : "Video oprit"}
              />
              <span
                className={`w-3 h-3 rounded-full ${
                  isAudioOn ? "bg-green-500" : "bg-red-500"
                }`}
                title={isAudioOn ? "Audio pornit" : "Audio oprit"}
              />
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3 relative">
            {isVideoOn && localVideoAttached ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  {!isVideoOn ? (
                    <p>Camera oprită</p>
                  ) : cameraPermission === 'denied' ? (
                    <p>Camera access denied</p>
                  ) : !videoStreamReady ? (
                    <div>
                      <p>Se inițializează stream-ul...</p>
                      <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-blue-600 rounded-full mx-auto mt-2"></div>
                    </div>
                  ) : !localVideoAttached ? (
                    <div>
                      <p>Se conectează video-ul...</p>
                      <p className="text-xs mt-1">Încercări: {retryCountRef.current}/5</p>
                      <button
                        onClick={retryVideoAttachment}
                        disabled={retryCountRef.current > 5}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {retryCountRef.current > 5 ? "Prea multe încercări" : "Reconectează"}
                      </button>
                    </div>
                  ) : (
                    <p>Se încarcă...</p>
                  )}
                  {/* Always render video element for attachment */}
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleVideo}
              disabled={!isMediaReady || connectionStatus !== "connected"}
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                isVideoOn
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isVideoOn ? "📹 Oprește Video" : "📹 Pornește Video"}
            </button>
            <button
              onClick={toggleAudio}
              disabled={!isMediaReady || connectionStatus !== "connected"}
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                isAudioOn
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
              <span className="text-sm text-gray-600 ml-1">
                {isProvider ? "(Client)" : "(Furnizor)"}
              </span>
            </h3>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: "none" }}
            />
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <p>Așteptăm ca {other?.name} să se conecteze…</p>
              <p className="text-sm mt-1">Status: {connectionStatus}</p>
              {participants.length > 0 && (
                <p className="text-xs mt-1">Participanți: {participants.length}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button
            onClick={debugInfo}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            🔍 Debug Info
          </button>
          <span className="text-sm text-gray-500">Sesiune: {sessionId}</span>
        </div>
        <button
          onClick={leave}
          disabled={connectionStatus === "disconnecting"}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {connectionStatus === "disconnecting" ? "🔃 Se deconectează..." : "🚪 Părăsește"}
        </button>
      </div>
    </div>
  );
}