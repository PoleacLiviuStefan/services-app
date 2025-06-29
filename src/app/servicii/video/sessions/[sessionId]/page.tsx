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

// Fix: Make Participant interface match ZoomUser exactly
interface Participant {
  userId: number | string;
  displayName: string;
  bVideoOn: boolean;
  bAudioOn: boolean; // Added missing property
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
  
  // Remote video tracking
  const [remoteVideoAttached, setRemoteVideoAttached] = useState(false);
  const [remoteParticipantWithVideo, setRemoteParticipantWithVideo] = useState<ZoomUser | null>(null);

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

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    try {
      log("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: "user"
        } 
      });
      
      // Permission granted, stop the temporary stream
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      log("✅ Camera permission granted");
      
      // Clear any permission-related errors
      setError("");
      return true;
    } catch (error: any) {
      logError("Camera permission denied", error);
      setCameraPermission('denied');
      setError("Camera access is required for video calls. Please allow camera access and try again.");
      return false;
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

  // Helper function to wait for video track to be ready
  const waitForVideoTrackReady = useCallback(async (track: MediaStreamTrack, timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (track.readyState === 'live') {
        resolve(true);
        return;
      }

      let timeoutId: NodeJS.Timeout; // Fix: Keep as let since we reassign it
      
      const checkReady = () => {
        if (track.readyState === 'live') {
          clearTimeout(timeoutId);
          resolve(true);
        }
      };

      // Check every 100ms
      const intervalId = setInterval(checkReady, 100);
      
      // Timeout after specified time - Fix: Now properly reassigning timeoutId
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        resolve(false);
      }, timeout);

      // Also listen for track events
      track.addEventListener('unmute', checkReady);
      track.addEventListener('started', checkReady);
    });
  }, []);

  // Enhanced video attachment with browser-specific logic
  const attachLocalVideo = useCallback(async () => {
    if (!mediaStream || !isVideoOn || !localVideoRef.current) return false;
    const videoElement = localVideoRef.current;
    const globalState = getGlobalState();

    try {
      // Check browser capabilities
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      
      // 1) Check if video track is available and ready
      let videoTrack = null;
      if (typeof mediaStream.getVideoTrack === 'function') {
        videoTrack = mediaStream.getVideoTrack();
      }
      
      log('👀 Attach video attempt:', {
        hasMediaStream: !!mediaStream,
        hasVideoTrack: !!videoTrack,
        trackReadyState: videoTrack?.readyState,
        hasSharedArrayBuffer,
        hasAttachVideo: typeof mediaStream.attachVideo === 'function',
        elementReady: !!videoElement,
        hasClient: !!globalState?.client
      });

      // 2) For non-SharedArrayBuffer browsers, video should already be attached via videoElement
      if (!hasSharedArrayBuffer) {
        log('ℹ️ Non-SAB browser detected, video should be attached via videoElement');
        // Just verify the element is working
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          log('✅ Video element has dimensions, considering attached');
          setLocalVideoAttached(true);
          setVideoAttachmentMethod('videoElement');
          setVideoStreamReady(true);
          return true;
        } else {
          log('⚠️ Video element has no dimensions yet, waiting...');
          return false;
        }
      }

      // 3) For SharedArrayBuffer browsers, wait for video track to be ready
      if (videoTrack && videoTrack.readyState !== 'live') {
        log('⏳ Waiting for video track to be ready...');
        const trackReady = await waitForVideoTrackReady(videoTrack, 5000);
        if (!trackReady) {
          log('❌ Video track did not become ready in time');
          return false;
        }
      }

      // 4) Try attachVideo method for SAB browsers
      if (hasSharedArrayBuffer && typeof mediaStream.attachVideo === 'function') {
        await mediaStream.attachVideo(videoElement);
        log('✅ attachVideo succeeded');
        setLocalVideoAttached(true);
        setVideoAttachmentMethod('attachVideo');
        setVideoStreamReady(true);
        return true;
      }

      // 5) Fallback: try getting the raw MediaStream
      if (typeof mediaStream.getMediaStream === 'function') {
        const nativeStream = mediaStream.getMediaStream();
        if (nativeStream && nativeStream.getVideoTracks().length > 0) {
          log("Using fallback MediaStream approach");
          videoElement.srcObject = nativeStream;
          await videoElement.play();
          setLocalVideoAttached(true);
          setVideoAttachmentMethod('mediastream');
          setVideoStreamReady(true);
          return true;
        }
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
  }, [mediaStream, isVideoOn, getGlobalState, waitForVideoTrackReady]);

  // Enhanced retry mechanism with exponential backoff
  const scheduleVideoRetry = useCallback(() => {
    if (!mountedRef.current || retryCountRef.current >= 5 || !isVideoOn) {
      if (retryCountRef.current >= 5) {
        logError("Maximum video attachment retries reached");
        setError("Could not connect video after multiple attempts. Try refreshing the page.");
      }
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 16000);
    retryCountRef.current++;

    log(`Scheduling video retry ${retryCountRef.current}/5 in ${delay}ms`);

    if (attachmentTimeoutRef.current) {
      clearTimeout(attachmentTimeoutRef.current);
    }

    attachmentTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || !isVideoOn) return;

      log(`Executing retry attempt ${retryCountRef.current}/5`);
      const success = await attachLocalVideo();
      
      if (!success && isVideoOn && mediaStream && mountedRef.current) {
        scheduleVideoRetry();
      } else if (success) {
        log("✅ Video retry successful!");
        retryCountRef.current = 0; // Reset on success
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
              globalState.client.off("video-active-change");
              globalState.client.off("media-sdk-change");
              globalState.client.off("active-video-change");
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
          setRemoteVideoAttached(false);
          setRemoteParticipantWithVideo(null);
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

  // Helper function to convert Participant to ZoomUser
  const convertToZoomUsers = useCallback((participants: any[]): ZoomUser[] => {
    return participants.map((p: any) => ({
      userId: p.userId,
      displayName: p.displayName,
      bVideoOn: p.bVideoOn,
      bAudioOn: p.bAudioOn ?? false, // Default to false if missing
      isHost: p.isHost
    }));
  }, []);

  // Render remote video for a participant
  const renderRemoteVideo = useCallback(async (participant: ZoomUser) => {
    const globalState = getGlobalState();
    if (!globalState?.client || !remoteVideoRef.current) {
      logError("Cannot render remote video: missing client or video element");
      return false;
    }

    try {
      log(`🎥 Attempting to render remote video for ${participant.displayName}`, {
        userId: participant.userId,
        bVideoOn: participant.bVideoOn,
      });

      const mediaStream = globalState.mediaStream;
      const videoElement = remoteVideoRef.current;
      
      // Method 1: Use renderVideo with proper parameters based on your SDK version
      if (mediaStream && typeof mediaStream.renderVideo === 'function') {
        try {
          // Try different parameter combinations for renderVideo
          log("🎬 Trying renderVideo method...");
          
          // Version 1: Standard renderVideo call
          const result1 = await mediaStream.renderVideo(
            videoElement,
            participant.userId,
            640,
            360,
            0,
            0,
            1
          );
          
          if (result1 !== undefined) {
            log(`✅ renderVideo succeeded with standard params for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }
          
          // Version 2: Try with different quality parameter
          log("🔄 Trying renderVideo with different params...");
          const result2 = await mediaStream.renderVideo(
            videoElement,
            participant.userId,
            640,
            360,
            0,
            0,
            3 // Try different quality
          );
          
          if (result2 !== undefined) {
            log(`✅ renderVideo succeeded with quality=3 for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }

          // Version 3: Try without quality parameter
          log("🔄 Trying renderVideo without quality param...");
          const result3 = await mediaStream.renderVideo(
            videoElement,
            participant.userId,
            640,
            360
          );
          
          if (result3 !== undefined) {
            log(`✅ renderVideo succeeded without quality param for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }

          log(`⚠️ All renderVideo attempts returned undefined`);
        } catch (err: any) {
          log(`⚠️ renderVideo failed: ${err.message}`);
        }
      }

      // Method 2: Try attachVideo for remote participants
      if (mediaStream && typeof mediaStream.attachVideo === 'function') {
        try {
          log("🔗 Trying attachVideo method...");
          
          // Version 1: attachVideo with userId
          const attachResult1 = await mediaStream.attachVideo(videoElement, participant.userId);
          
          if (attachResult1 !== undefined) {
            log(`✅ attachVideo with userId succeeded for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }

          // Version 2: attachVideo without userId (sometimes works for remote)
          log("🔄 Trying attachVideo without userId...");
          const attachResult2 = await mediaStream.attachVideo(videoElement);
          
          if (attachResult2 !== undefined) {
            log(`✅ attachVideo without userId succeeded for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }

          log(`⚠️ All attachVideo attempts returned undefined`);
        } catch (err: any) {
          log(`⚠️ attachVideo failed: ${err.message}`);
        }
      }

      // Method 3: Try using client renderVideo (some SDKs have it on client)
      const client = globalState.client;
      if (typeof client.renderVideo === 'function') {
        try {
          log("🎬 Trying client.renderVideo method...");
          
          const clientResult = await client.renderVideo(
            videoElement,
            participant.userId,
            640,
            360,
            0,
            0,
            1
          );
          
          if (clientResult !== undefined) {
            log(`✅ client.renderVideo succeeded for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
            return true;
          }

          log(`⚠️ client.renderVideo returned undefined`);
        } catch (err: any) {
          log(`⚠️ client.renderVideo failed: ${err.message}`);
        }
      }

      // Method 4: Subscribe to video events and wait for stream
      if (typeof client.subscribe === 'function') {
        try {
          log("📡 Trying subscribe method...");
          
          // Subscribe to video for this participant
          await client.subscribe(participant.userId, 'video');
          log(`✅ Subscribed to video for ${participant.displayName}`);
          
          // Wait a bit for the stream to be ready
          setTimeout(async () => {
            if (!mountedRef.current) return;
            
            // Try renderVideo again after subscription
            try {
              const subscribeResult = await mediaStream.renderVideo(
                videoElement,
                participant.userId,
                640,
                360,
                0,
                0,
                1
              );
              
              if (subscribeResult !== undefined) {
                log(`✅ renderVideo after subscribe succeeded for ${participant.displayName}`);
                setRemoteVideoAttached(true);
                setRemoteParticipantWithVideo(participant);
              } else {
                log(`⚠️ renderVideo after subscribe still returned undefined`);
              }
            } catch (postSubErr: any) {
              log(`⚠️ renderVideo after subscribe failed: ${postSubErr.message}`);
            }
          }, 2000);
          
          return true; // Return true for subscription success
        } catch (err: any) {
          log(`⚠️ subscribe failed: ${err.message}`);
        }
      }

      // Method 5: Try event-based approach - listen for video streams
      log("👂 Setting up video stream listeners...");
      
      // Listen for video stream events
      if (typeof client.on === 'function') {
        const videoStreamHandler = (payload: any) => {
          if (payload.userId === participant.userId && payload.action === 'Start') {
            log(`📹 Video stream started for ${participant.displayName}, attempting render`);
            
            setTimeout(async () => {
              if (!mountedRef.current || !remoteVideoRef.current) return;
              
              try {
                const streamResult = await mediaStream.renderVideo(
                  remoteVideoRef.current,
                  participant.userId,
                  640,
                  360,
                  0,
                  0,
                  1
                );
                
                if (streamResult !== undefined) {
                  log(`✅ renderVideo on stream event succeeded for ${participant.displayName}`);
                  setRemoteVideoAttached(true);
                  setRemoteParticipantWithVideo(participant);
                  
                  // Remove the event listener after success
                  client.off('video-stream-change', videoStreamHandler);
                }
              } catch (streamErr: any) {
                log(`⚠️ renderVideo on stream event failed: ${streamErr.message}`);
              }
            }, 1000);
          }
        };
        
        client.on('video-stream-change', videoStreamHandler);
        client.on('media-stream-change', videoStreamHandler);
        client.on('active-video-change', videoStreamHandler);
        
        // Clean up listeners after 10 seconds
        setTimeout(() => {
          if (client && typeof client.off === 'function') {
            client.off('video-stream-change', videoStreamHandler);
            client.off('media-stream-change', videoStreamHandler);
            client.off('active-video-change', videoStreamHandler);
          }
        }, 10000);
      }

      // If we reach here, try one more fallback approach
      log("🔧 Trying final fallback approach...");
      
      // Sometimes the video element needs to be prepared first
      videoElement.style.width = '640px';
      videoElement.style.height = '360px';
      videoElement.setAttribute('data-user-id', participant.userId.toString());
      
      // Try a delayed renderVideo call
      setTimeout(async () => {
        if (!mountedRef.current || !remoteVideoRef.current) return;
        
        try {
          const fallbackResult = await mediaStream.renderVideo(
            remoteVideoRef.current,
            participant.userId,
            640,
            360,
            0,
            0,
            1
          );
          
          if (fallbackResult !== undefined) {
            log(`✅ Fallback renderVideo succeeded for ${participant.displayName}`);
            setRemoteVideoAttached(true);
            setRemoteParticipantWithVideo(participant);
          }
        } catch (fallbackErr: any) {
          log(`⚠️ Fallback renderVideo failed: ${fallbackErr.message}`);
        }
      }, 3000);

      log(`🔍 Remote video setup completed for ${participant.displayName} - waiting for streams...`);
      return true; // Return true to indicate setup was attempted

    } catch (error: any) {
      logError(`❌ Failed to render remote video for ${participant.displayName}`, error);
      return false;
    }
  }, [getGlobalState]);

  // Stop remote video rendering
  const stopRemoteVideo = useCallback(async () => {
    const globalState = getGlobalState();
    if (!globalState?.client || !remoteVideoRef.current) return;

    try {
      const client = globalState.client;
      const mediaStream = globalState.mediaStream;
      
      if (remoteParticipantWithVideo) {
        // Try different stop methods
        if (typeof client.stopReceiveVideo === 'function') {
          await client.stopReceiveVideo(remoteParticipantWithVideo.userId);
        }
        
        if (mediaStream && typeof mediaStream.stopRenderVideo === 'function') {
          await mediaStream.stopRenderVideo(
            remoteVideoRef.current,
            remoteParticipantWithVideo.userId
          );
        }
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.load();
      }
      
      setRemoteVideoAttached(false);
      setRemoteParticipantWithVideo(null);
      log("✅ Remote video stopped");
    } catch (error: any) {
      logError("❌ Error stopping remote video", error);
    }
  }, [getGlobalState, remoteParticipantWithVideo]);

  // Debug function to inspect available APIs
  const debugZoomAPIs = useCallback(() => {
    const globalState = getGlobalState();
    if (!globalState?.client || !globalState?.mediaStream) {
      log("❌ No client or mediaStream available for debugging");
      return;
    }

    const client = globalState.client;
    const mediaStream = globalState.mediaStream;

    // Get all available methods
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter(prop => typeof client[prop] === 'function');
    
    const mediaStreamMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(mediaStream))
      .filter(prop => typeof mediaStream[prop] === 'function');

    log("🔍 ZOOM CLIENT METHODS:", clientMethods.sort());
    log("🔍 ZOOM MEDIASTREAM METHODS:", mediaStreamMethods.sort());

    // Check specific video-related methods
    const videoMethods = {
      client: {
        renderVideo: typeof client.renderVideo === 'function',
        attachVideo: typeof client.attachVideo === 'function',
        startReceiveVideo: typeof client.startReceiveVideo === 'function',
        stopReceiveVideo: typeof client.stopReceiveVideo === 'function',
        subscribe: typeof client.subscribe === 'function',
        unsubscribe: typeof client.unsubscribe === 'function',
        getUser: typeof client.getUser === 'function',
        getAllUser: typeof client.getAllUser === 'function',
        getCurrentUserInfo: typeof client.getCurrentUserInfo === 'function',
      },
      mediaStream: {
        renderVideo: typeof mediaStream.renderVideo === 'function',
        attachVideo: typeof mediaStream.attachVideo === 'function',
        stopRenderVideo: typeof mediaStream.stopRenderVideo === 'function',
        getVideoTrack: typeof mediaStream.getVideoTrack === 'function',
        startVideo: typeof mediaStream.startVideo === 'function',
        stopVideo: typeof mediaStream.stopVideo === 'function',
      }
    };

    log("🔍 VIDEO-SPECIFIC METHODS:", videoMethods);

    // Try to get current participants and their info
    if (typeof client.getAllUser === 'function') {
      const users = client.getAllUser();
      log("👥 CURRENT PARTICIPANTS:", users);
      
      users.forEach((user: any) => {
        log(`👤 USER ${user.displayName}:`, {
          userId: user.userId,
          bVideoOn: user.bVideoOn,
          bAudioOn: user.bAudioOn,
          isHost: user.isHost,
          allProperties: Object.keys(user)
        });
      });
    }

    return { clientMethods, mediaStreamMethods, videoMethods };
  }, [getGlobalState]);

  // Update participants and handle video rendering
  const updateParticipants = useCallback(async (force = false) => {
    const globalState = getGlobalState();
    if (!globalState?.client || !mountedRef.current) return;

    try {
      if (typeof globalState.client.getAllUser === "function") {
        const users = globalState.client.getAllUser();
        const zoomUsers = convertToZoomUsers(users);
        
        log("👥 Updating participants", {
          count: zoomUsers.length,
          participants: zoomUsers.map(u => ({
            name: u.displayName,
            video: u.bVideoOn,
            audio: u.bAudioOn
          }))
        });

        setParticipants(zoomUsers);
        
        // Update global state
        const currentGlobal = getGlobalState();
        if (currentGlobal) {
          setGlobalState({ ...currentGlobal, participants: zoomUsers });
        }

        // Handle remote video rendering
        const currentUserId = globalState.client.getCurrentUserInfo?.()?.userId;
        const remoteParticipants = zoomUsers.filter(u => u.userId !== currentUserId);
        
        // Find participant with video on
        const participantWithVideo = remoteParticipants.find(p => p.bVideoOn);
        
        if (participantWithVideo && (!remoteParticipantWithVideo || 
            remoteParticipantWithVideo.userId !== participantWithVideo.userId || force)) {
          // Stop current remote video if different participant
          if (remoteParticipantWithVideo && remoteParticipantWithVideo.userId !== participantWithVideo.userId) {
            await stopRemoteVideo();
          }
          
          // Start new remote video
          setTimeout(async () => {
            if (mountedRef.current) {
              const success = await renderRemoteVideo(participantWithVideo);
              if (!success) {
                log("⚠️ Failed to render remote video, will retry");
              }
            }
          }, 1000);
        } else if (!participantWithVideo && remoteParticipantWithVideo) {
          // No one has video on anymore, stop remote video
          await stopRemoteVideo();
        }
      }
    } catch (error: any) {
      logError("❌ Error updating participants", error);
    }
  }, [getGlobalState, setGlobalState, convertToZoomUsers, remoteParticipantWithVideo, renderRemoteVideo, stopRemoteVideo]);

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

        // Initialize with settings optimized for video reliability
        // Fix: Removed videoSourceTimeout as it doesn't exist in InitOptions
        await zmClient.init("en-US", "Global", {
          patchJsMedia: true,
          stayAwake: true,
          enforceMultipleVideos: false,
          logLevel: "info",
          leaveOnPageUnload: false,
          // Add these for better video handling
          dependentFeatures: ['video'],
          enableVideoElementAttachment: true,
        });

        // Join session
        await zmClient.join(
          sessionInfo.sessionName,
          sessionInfo.token,
          auth.user.name || "Unknown User",
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
            if (mountedRef.current) {
              updateParticipants();
            }
          }, 1000);
        });

        zmClient.on("user-removed", (payload: any) => {
          if (!mountedRef.current) return;
          log("👤 User removed", payload);
          setTimeout(() => {
            if (mountedRef.current) {
              updateParticipants();
            }
          }, 500);
        });

        zmClient.on("peer-video-state-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("📹 Peer video state change", payload);
          
          // Try to immediately handle the video state change
          if (payload.action === 'Start' && payload.userId) {
            log(`🎬 User ${payload.userId} started video, attempting to render`);
            
            setTimeout(async () => {
              if (mountedRef.current) {
                // Find the participant and try to render their video
                const globalState = getGlobalState();
                if (globalState?.client && typeof globalState.client.getAllUser === 'function') {
                  const users = globalState.client.getAllUser();
                  const participant = users.find((u: any) => u.userId === payload.userId);
                  if (participant && participant.bVideoOn) {
                    log(`🎯 Found participant with video ON: ${participant.displayName}`);
                    
                    // Try multiple approaches for immediate rendering
                    let success = false;
                    
                    // Approach 1: Direct renderVideo call
                    try {
                      const mediaStream = globalState.mediaStream;
                      if (mediaStream && typeof mediaStream.renderVideo === 'function' && remoteVideoRef.current) {
                        const result = await mediaStream.renderVideo(
                          remoteVideoRef.current,
                          participant.userId,
                          640,
                          360,
                          0,
                          0,
                          1
                        );
                        
                        if (result !== undefined) {
                          log(`✅ Immediate renderVideo successful for ${participant.displayName}`);
                          setRemoteVideoAttached(true);
                          setRemoteParticipantWithVideo(participant);
                          success = true;
                        }
                      }
                    } catch (directErr: any) {
                      log(`⚠️ Direct renderVideo failed: ${directErr.message}`);
                    }
                    
                    // Approach 2: Subscribe then render
                    if (!success && typeof globalState.client.subscribe === 'function') {
                      try {
                        await globalState.client.subscribe(participant.userId, 'video');
                        log(`📡 Subscribed to video for ${participant.displayName}`);
                        
                        // Try render after subscription
                        setTimeout(async () => {
                          if (!mountedRef.current || !remoteVideoRef.current) return;
                          
                          try {
                            const mediaStream = globalState.mediaStream;
                            const result = await mediaStream.renderVideo(
                              remoteVideoRef.current,
                              participant.userId,
                              640,
                              360,
                              0,
                              0,
                              1
                            );
                            
                            if (result !== undefined) {
                              log(`✅ Post-subscribe renderVideo successful for ${participant.displayName}`);
                              setRemoteVideoAttached(true);
                              setRemoteParticipantWithVideo(participant);
                              success = true;
                            }
                          } catch (postSubErr: any) {
                            log(`⚠️ Post-subscribe renderVideo failed: ${postSubErr.message}`);
                          }
                        }, 1500);
                        
                      } catch (subErr: any) {
                        log(`⚠️ Subscribe failed: ${subErr.message}`);
                      }
                    }
                    
                    // Approach 3: Use full renderRemoteVideo as fallback
                    if (!success) {
                      log("🔄 Using full renderRemoteVideo as fallback");
                      const renderSuccess = await renderRemoteVideo(participant);
                      if (!renderSuccess) {
                        log("⚠️ Full renderRemoteVideo also failed, will try via updateParticipants");
                        updateParticipants(true);
                      }
                    }
                  }
                }
              }
            }, 500);
          } else if (payload.action === 'Stop' && payload.userId) {
            log(`⏹️ User ${payload.userId} stopped video`);
            if (remoteParticipantWithVideo && remoteParticipantWithVideo.userId === payload.userId) {
              stopRemoteVideo();
            }
          }
          
          // Always update participants after a delay
          setTimeout(() => {
            if (mountedRef.current) {
              updateParticipants(true); // Force update
            }
          }, 2000);
        });

        zmClient.on("peer-audio-state-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("🔊 Peer audio state change", payload);
          setTimeout(() => {
            if (mountedRef.current) {
              updateParticipants();
            }
          }, 500);
        });

        // Additional event listeners for video handling
        zmClient.on("video-active-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("🎥 Video active change", payload);
          setTimeout(() => {
            if (mountedRef.current) {
              updateParticipants(true);
            }
          }, 500);
        });

        zmClient.on("media-sdk-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("📱 Media SDK change", payload);
          if (payload.type === 'video' && payload.result === 'success') {
            setTimeout(() => {
              if (mountedRef.current) {
                updateParticipants(true);
              }
            }, 1000);
          }
        });

        // Listen for any video-related events
        zmClient.on("active-video-change", (payload: any) => {
          if (!mountedRef.current) return;
          log("🎯 Active video change", payload);
          setTimeout(() => {
            if (mountedRef.current) {
              updateParticipants(true);
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
          if (mountedRef.current) {
            updateParticipants();
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
    convertToZoomUsers,
    updateParticipants,
    renderRemoteVideo,
    stopRemoteVideo,
    remoteParticipantWithVideo,
  ]);

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Video element readiness check
  useEffect(() => {
    if (localVideoRef.current) {
      log("✅ Video element ref is ready", {
        nodeName: localVideoRef.current.nodeName,
        readyState: localVideoRef.current.readyState,
        videoWidth: localVideoRef.current.videoWidth,
        videoHeight: localVideoRef.current.videoHeight,
      });
    } else {
      log("⚠️ Video element ref is not ready yet");
    }
  }, [localVideoRef.current]);

  // Video attachment effect with improved logic
  useEffect(() => {
    if (isVideoOn && mediaStream && !localVideoAttached && mountedRef.current) {
      log("Attempting video attachment due to state change");
      
      // For non-SharedArrayBuffer browsers, video might already be working via videoElement
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      
      if (!hasSharedArrayBuffer) {
        // Check if video element already has video content
        setTimeout(() => {
          if (!mountedRef.current || !localVideoRef.current) return;
          
          const videoEl = localVideoRef.current;
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            log("✅ Non-SAB browser: Video element already has content");
            setLocalVideoAttached(true);
            setVideoAttachmentMethod('videoElement');
            setVideoStreamReady(true);
          } else {
            // If still no content, try normal attachment
            setTimeout(async () => {
              if (!mountedRef.current) return;
              const success = await attachLocalVideo();
              if (!success) {
                scheduleVideoRetry();
              }
            }, 1000);
          }
        }, 500);
      } else {
        // For SAB browsers, use normal attachment flow
        setTimeout(async () => {
          if (!mountedRef.current) return;
          const success = await attachLocalVideo();
          if (!success) {
            scheduleVideoRetry();
          }
        }, 1000);
      }
    }
  }, [isVideoOn, mediaStream, localVideoAttached, attachLocalVideo, scheduleVideoRetry]);

  // Updated video toggle with proper SDK usage based on browser capabilities
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

        // 2) Wait for video element to be ready with retry
        let videoEl = localVideoRef.current;
        if (!videoEl) {
          log("⏳ Video element not ready, waiting...");
          
          // Wait up to 3 seconds for the video element to be ready
          let attempts = 0;
          while (!videoEl && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            videoEl = localVideoRef.current;
            attempts++;
          }
          
          if (!videoEl) {
            logError("Video element still not ready after waiting");
            setError("Video element initialization failed. Please refresh the page.");
            return;
          }
        }

        log("✅ Video element ready, starting video...");

        try {
          // Check if browser supports SharedArrayBuffer
          const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
          log(`Browser capabilities: SharedArrayBuffer=${hasSharedArrayBuffer}`);

          if (hasSharedArrayBuffer) {
            // Modern approach for SAB-enabled browsers
            await globalState.mediaStream.startVideo({
              videoQuality: "360p",
              facingMode: "user",
            });
          } else {
            // Legacy approach for non-SAB browsers (like this one)
            // Use deprecated videoElement option as SDK specifically requests it
            await globalState.mediaStream.startVideo({
              videoElement: videoEl,
              videoQuality: "360p", 
              facingMode: "user",
            });
          }

          log("✅ startVideo() succeeded");
          
          // Update state first
          setVideoOn(true);
          setGlobalState({ ...globalState, isVideoOn: true });

          // For non-SAB browsers, video should already be attached via videoElement
          if (!hasSharedArrayBuffer) {
            log("✅ Video attached via videoElement (legacy mode)");
            setLocalVideoAttached(true);
            setVideoAttachmentMethod('videoElement');
            setVideoStreamReady(true);
            
            // CRITICAL: Force video track publishing for remote participants
            setTimeout(async () => {
              try {
                // Try to publish/share the video track
                log("🚀 Attempting to publish video track for remote participants");
                
                // Check if there's a publishVideo or similar method
                if (typeof globalState.mediaStream.publishVideo === 'function') {
                  await globalState.mediaStream.publishVideo();
                  log("✅ Video track published successfully");
                } else if (typeof globalState.mediaStream.muteVideo === 'function') {
                  // Some SDKs require unmuting to start sharing
                  await globalState.mediaStream.muteVideo(false);
                  log("✅ Video unmuted (started sharing)");
                } else {
                  // For non-SAB browsers, we need to force create a video track
                  log("⚡ Attempting to force create video track for sharing");
                  
                  // Try getting the native MediaStream from the video element
                  if (videoEl.srcObject) {
                    const nativeStream = videoEl.srcObject as MediaStream;
                    const videoTracks = nativeStream.getVideoTracks();
                    
                    if (videoTracks.length > 0) {
                      const videoTrack = videoTracks[0];
                      log("✅ Found native video track from element", {
                        id: videoTrack.id,
                        kind: videoTrack.kind,
                        enabled: videoTrack.enabled,
                        muted: videoTrack.muted,
                        readyState: videoTrack.readyState,
                        label: videoTrack.label
                      });
                      
                      // Ensure track is enabled
                      if (!videoTrack.enabled) {
                        videoTrack.enabled = true;
                        log("✅ Video track enabled for sharing");
                      }
                      
                      // Try to manually add the track to the Zoom media stream
                      if (typeof globalState.mediaStream.replaceTrack === 'function') {
                        await globalState.mediaStream.replaceTrack(videoTrack);
                        log("✅ Video track replaced in Zoom stream");
                      }
                      
                    } else {
                      logError("❌ No video tracks in native stream");
                    }
                  } else {
                    // Fallback: Try to restart video with different approach
                    log("🔄 Attempting video restart for track creation");
                    try {
                      await globalState.mediaStream.stopVideo();
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      // Restart without videoElement to force track creation
                      await globalState.mediaStream.startVideo({
                        videoQuality: "360p",
                        facingMode: "user",
                      });
                      
                      // Then try to attach to element
                      setTimeout(async () => {
                        try {
                          if (typeof globalState.mediaStream.attachVideo === 'function') {
                            await globalState.mediaStream.attachVideo(videoEl);
                            log("✅ Video restarted and attached successfully");
                          }
                        } catch (attachErr) {
                          logError("❌ Failed to attach after restart", attachErr);
                        }
                      }, 1000);
                      
                    } catch (restartErr) {
                      logError("❌ Failed to restart video", restartErr);
                    }
                  }
                }
                
                // Log current participants to see who should receive video
                if (globalState.client && typeof globalState.client.getAllUser === "function") {
                  const users = globalState.client.getAllUser();
                  // Fix: Add proper typing for map function
                  log(`📺 Broadcasting video to ${users.length} participants:`, 
                    users.map((u: ZoomUser) => ({ userId: u.userId, name: u.displayName }))
                  );
                }
                
              } catch (publishError: any) {
                logError("❌ Failed to publish video track", publishError);
              }
            }, 2000);
            
          } else {
            // For SAB browsers, we need to attach manually after a delay
            setTimeout(async () => {
              if (!mountedRef.current || !isVideoOn) return;
              
              try {
                // Only use attachVideo for SAB browsers
                if (typeof globalState.mediaStream.attachVideo === 'function') {
                  await globalState.mediaStream.attachVideo(videoEl);
                  log("✅ attachVideo() succeeded");
                  setLocalVideoAttached(true);
                  setVideoAttachmentMethod('attachVideo');
                  setVideoStreamReady(true);
                }
              } catch (attachError: any) {
                logError("❌ Video attachment failed after startVideo", attachError);
                if (mountedRef.current && isVideoOn) {
                  scheduleVideoRetry();
                }
              }
            }, 1000);
          }

        } catch (e: any) {
          logError("❌ startVideo() failed", e);
          // Handle SDK errors
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
    scheduleVideoRetry,
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

  // Force video republishing for troubleshooting
  const forceVideoRepublish = useCallback(async () => {
    const globalState = getGlobalState();
    if (!globalState?.mediaStream || !isVideoOn) {
      log("❌ Cannot republish: no media stream or video not on");
      return;
    }

    try {
      log("🔄 Force republishing video...");
      
      // Try multiple methods to ensure video is being shared
      const mediaStream = globalState.mediaStream;
      
      // Method 1: Try publishVideo if available
      if (typeof mediaStream.publishVideo === 'function') {
        await mediaStream.publishVideo();
        log("✅ publishVideo() called");
      }
      
      // Method 2: Try unmuting video
      if (typeof mediaStream.muteVideo === 'function') {
        await mediaStream.muteVideo(false);
        log("✅ Video unmuted");
      }
      
      // Method 3: Check and enable video track
      const videoTrack = mediaStream.getVideoTrack?.();
      if (videoTrack) {
        if (!videoTrack.enabled) {
          videoTrack.enabled = true;
          log("✅ Video track enabled");
        }
        
        log("📊 Video track status:", {
          id: videoTrack.id,
          kind: videoTrack.kind,
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState,
          label: videoTrack.label
        });
      } else {
        logError("❌ No video track found");
      }
      
      // Method 4: Check participants
      if (globalState.client && typeof globalState.client.getAllUser === 'function') {
        const users = globalState.client.getAllUser();
        log(`📡 Should be broadcasting to ${users.length} participants:`, users);
        
        // Try to get current user info
        const currentUser = globalState.client.getCurrentUserInfo?.();
        if (currentUser) {
          log("👤 Current user info:", {
            userId: currentUser.userId,
            displayName: currentUser.displayName,
            bVideoOn: currentUser.bVideoOn,
            bAudioOn: currentUser.bAudioOn
          });
        }
      }
      
    } catch (error: any) {
      logError("❌ Force republish failed", error);
    }
  }, [getGlobalState, isVideoOn]);

  // Force remote video reconnection
  const forceRemoteVideoReconnect = useCallback(async () => {
    const globalState = getGlobalState();
    if (!globalState?.client) {
      log("❌ Cannot reconnect remote video: no client");
      return;
    }

    try {
      log("🔄 Force remote video reconnection...");
      
      // First, stop any existing remote video
      await stopRemoteVideo();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get all participants with video
      if (typeof globalState.client.getAllUser === 'function') {
        const users = globalState.client.getAllUser();
        const currentUserId = globalState.client.getCurrentUserInfo?.()?.userId;
        const remoteParticipants = users.filter((u: any) => u.userId !== currentUserId && u.bVideoOn);
        
        log(`🔍 Found ${remoteParticipants.length} remote participants with video:`, remoteParticipants);
        
        if (remoteParticipants.length > 0) {
          const participant = remoteParticipants[0]; // Take the first one
          
          log(`🎯 Attempting forced reconnection for ${participant.displayName}`);
          
          // Try all available methods
          const methods = [
            // Method 1: Subscribe + renderVideo
            async () => {
              if (typeof globalState.client.subscribe === 'function') {
                await globalState.client.subscribe(participant.userId, 'video');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const result = await globalState.mediaStream.renderVideo(
                  remoteVideoRef.current,
                  participant.userId,
                  640,
                  360,
                  0,
                  0,
                  1
                );
                return result !== undefined;
              }
              return false;
            },
            
            // Method 2: Direct renderVideo with multiple attempts
            async () => {
              for (let i = 0; i < 3; i++) {
                try {
                  const result = await globalState.mediaStream.renderVideo(
                    remoteVideoRef.current,
                    participant.userId,
                    640,
                    360,
                    0,
                    0,
                    1
                  );
                  if (result !== undefined) return true;
                } catch (e) {
                  // Continue to next attempt
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              return false;
            },
            
            // Method 3: AttachVideo approach
            async () => {
              if (typeof globalState.mediaStream.attachVideo === 'function') {
                try {
                  const result = await globalState.mediaStream.attachVideo(
                    remoteVideoRef.current,
                    participant.userId
                  );
                  return result !== undefined;
                } catch (e) {
                  return false;
                }
              }
              return false;
            }
          ];
          
          // Try each method
          for (let i = 0; i < methods.length; i++) {
            try {
              log(`🔧 Trying reconnection method ${i + 1}...`);
              const success = await methods[i]();
              
              if (success) {
                log(`✅ Reconnection method ${i + 1} succeeded for ${participant.displayName}`);
                setRemoteVideoAttached(true);
                setRemoteParticipantWithVideo(participant);
                return;
              } else {
                log(`⚠️ Reconnection method ${i + 1} failed`);
              }
            } catch (methodErr: any) {
              log(`❌ Reconnection method ${i + 1} threw error: ${methodErr.message}`);
            }
          }
          
          log(`❌ All reconnection methods failed for ${participant.displayName}`);
        } else {
          log("ℹ️ No remote participants with video found");
        }
      }
      
    } catch (error: any) {
      logError("❌ Force remote video reconnect failed", error);
    }
  }, [getGlobalState, stopRemoteVideo]);

  // Enhanced debugging for remote video
  const debugRemoteVideo = useCallback(() => {
    const globalState = getGlobalState();
    if (!globalState?.client || !globalState?.mediaStream) {
      log("❌ No client or mediaStream for remote video debugging");
      return;
    }

    try {
      log("🔍 REMOTE VIDEO DEBUG INFO:");
      
      // Check all participants
      if (typeof globalState.client.getAllUser === 'function') {
        const users = globalState.client.getAllUser();
        const currentUserId = globalState.client.getCurrentUserInfo?.()?.userId;
        
        log("👥 All participants:", users.map((u: any) => ({
          userId: u.userId,
          displayName: u.displayName,
          bVideoOn: u.bVideoOn,
          bAudioOn: u.bAudioOn,
          isCurrentUser: u.userId === currentUserId
        })));
        
        const remoteUsers = users.filter((u: any) => u.userId !== currentUserId);
        const usersWithVideo = remoteUsers.filter((u: any) => u.bVideoOn);
        
        log(`📊 Remote users: ${remoteUsers.length}, With video: ${usersWithVideo.length}`);
        
        // Check video element status
        if (remoteVideoRef.current) {
          const videoEl = remoteVideoRef.current;
          log("📺 Remote video element status:", {
            readyState: videoEl.readyState,
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight,
            paused: videoEl.paused,
            currentTime: videoEl.currentTime,
            duration: videoEl.duration,
            srcObject: !!videoEl.srcObject,
            src: videoEl.src,
            style: {
              display: videoEl.style.display,
              width: videoEl.style.width,
              height: videoEl.style.height,
            },
            attributes: {
              'data-user-id': videoEl.getAttribute('data-user-id')
            }
          });
        }
        
        // Check current remote video state
        log("🎥 Current remote video state:", {
          remoteVideoAttached,
          remoteParticipantWithVideo: remoteParticipantWithVideo ? {
            userId: remoteParticipantWithVideo.userId,
            displayName: remoteParticipantWithVideo.displayName,
            bVideoOn: remoteParticipantWithVideo.bVideoOn
          } : null
        });
        
        // Try to get more info about video streams
        usersWithVideo.forEach((user: any) => {
          log(`🔍 Checking user ${user.displayName} (${user.userId}):`);
          
          // Check if we can get more info about this user
          if (typeof globalState.client.getUser === 'function') {
            try {
              const userInfo = globalState.client.getUser(user.userId);
              log(`📋 User info for ${user.displayName}:`, userInfo);
            } catch (e) {
              log(`⚠️ Could not get user info for ${user.displayName}`);
            }
          }
        });
      }
      
    } catch (error: any) {
      logError("❌ Remote video debug failed", error);
    }
  }, [getGlobalState, remoteVideoAttached, remoteParticipantWithVideo]);

  // Check video sharing status periodically
  useEffect(() => {
    if (!isVideoOn || !isMediaReady) return;
    
    const checkVideoSharing = () => {
      const globalState = getGlobalState();
      if (!globalState?.mediaStream) return;
      
      const videoTrack = globalState.mediaStream.getVideoTrack?.();
      if (videoTrack) {
        log("🔍 Periodic video track check:", {
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState,
          participants: participants.length
        });
      }
    };
    
    // Check every 10 seconds
    const interval = setInterval(checkVideoSharing, 10000);
    
    return () => clearInterval(interval);
  }, [isVideoOn, isMediaReady, participants.length, getGlobalState]);

  // Periodic participants update to ensure real-time status
  useEffect(() => {
    if (!isMediaReady || connectionStatus !== "connected") return;
    
    const interval = setInterval(() => {
      if (mountedRef.current) {
        updateParticipants();
      }
    }, 3000); // Update every 3 seconds
    
    return () => clearInterval(interval);
  }, [isMediaReady, connectionStatus, updateParticipants]);

  // Enhanced debug info
  const debugInfo = useCallback(() => {
    const globalState = getGlobalState();
    const mediaStreamInfo = globalState?.mediaStream ? {
      hasStartVideo: typeof globalState.mediaStream.startVideo === 'function',
      hasStopVideo: typeof globalState.mediaStream.stopVideo === 'function',
      hasAttachVideo: typeof globalState.mediaStream.attachVideo === 'function',
      hasRenderVideo: typeof globalState.mediaStream.renderVideo === 'function',
      hasGetVideoTrack: typeof globalState.mediaStream.getVideoTrack === 'function',
      hasGetMediaStream: typeof globalState.mediaStream.getMediaStream === 'function',
      videoTrack: globalState.mediaStream.getVideoTrack ? {
        exists: !!globalState.mediaStream.getVideoTrack(),
        readyState: globalState.mediaStream.getVideoTrack()?.readyState,
        enabled: globalState.mediaStream.getVideoTrack()?.enabled,
        muted: globalState.mediaStream.getVideoTrack()?.muted,
      } : null
    } : null;

    console.log("🔍 DETAILED DEBUG INFO:", {
      timestamp: new Date().toISOString(),
      component: {
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
        cameraPermission,
      },
      session: {
        sessionKey,
        sessionId,
        hasSessionInfo: !!sessionInfo,
      },
      browser: {
        userAgent: navigator.userAgent,
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        isSecureContext: window.isSecureContext,
        // Add WebGL detection since we saw WebGL errors
        webGLSupport: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch (e) {
            return false;
          }
        })(),
      },
      zoomSDK: {
        version: (window as any).ZoomVideo?.version || 'unknown',
        capabilities: (window as any).ZoomVideo?.getCapabilities?.() || 'unknown',
      },
      mediaStream: mediaStreamInfo,
      globalState: globalState ? {
        hasClient: !!globalState.client,
        hasMediaStream: !!globalState.mediaStream,
        isVideoOn: globalState.isVideoOn,
        isAudioOn: globalState.isAudioOn,
        connectionStatus: globalState.connectionStatus,
        isJoined: globalState.isJoined,
        participants: globalState.participants?.length || 0,
        lastActivity: new Date(globalState.lastActivity).toISOString(),
      } : null,
      domElements: {
        localVideo: !!localVideoRef.current,
        remoteVideo: !!remoteVideoRef.current,
        localVideoDetails: localVideoRef.current ? {
          readyState: localVideoRef.current.readyState,
          videoWidth: localVideoRef.current.videoWidth,
          videoHeight: localVideoRef.current.videoHeight,
          paused: localVideoRef.current.paused,
          srcObject: !!localVideoRef.current.srcObject,
          currentSrc: localVideoRef.current.currentSrc,
          style: {
            display: localVideoRef.current.style.display,
            transform: localVideoRef.current.style.transform,
          },
          dataset: localVideoRef.current.dataset,
          // Add element events state
          hasVideoContent: localVideoRef.current.videoWidth > 0 && localVideoRef.current.videoHeight > 0,
        } : {
          error: "Video element ref is null",
          timestamp: new Date().toISOString(),
        },
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
    sessionId,
    sessionInfo,
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
          <div className="flex items-start">
            <div className="text-red-600 text-xl mr-3">🚫</div>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Camera Access Required</h3>
              <p className="text-sm text-red-700 mt-1">
                This video session requires camera access. Please:
              </p>
              <ol className="text-xs text-red-600 mt-2 list-decimal ml-5 space-y-1">
                <li>Click the camera icon (🎥) in your browser&apos;s address bar</li>
                <li>Select &quot;Allow&quot; for camera access</li>
                <li>Click &quot;Request Permission&quot; below or refresh this page</li>
              </ol>
              <button
                onClick={requestCameraPermission}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Request Camera Permission
              </button>
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
                  Retry: {retryCountRef.current}/5 | Method: {videoAttachmentMethod || 'detecting...'}
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
            {/* Video element is always present in DOM */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                display: (isVideoOn && localVideoAttached) ? 'block' : 'none',
                transform: 'scaleX(-1)' // Mirror the video for better UX
              }}
              onLoadedMetadata={() => {
                log("Video metadata loaded");
                setVideoStreamReady(true);
              }}
              onError={(e) => {
                logError("Video element error", e);
              }}
            />
            
            {/* Overlay content */}
            {isVideoOn && !localVideoAttached ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                  <p>Connecting video...</p>
                  <p className="text-xs mt-1">Method: {videoAttachmentMethod || 'detecting...'}</p>
                  <p className="text-xs">Retry: {retryCountRef.current}/5</p>
                </div>
              </div>
            ) : !isVideoOn ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p>Camera is off</p>
                  {cameraPermission === 'denied' && (
                    <p className="text-red-400 text-sm mt-1">Camera access denied</p>
                  )}
                </div>
              </div>
            ) : null}
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
            <div className="text-sm text-gray-500">
              {participants.length > 0 && (
                <>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs mr-2">
                    {participants.length} connected
                  </span>
                  {participants.map(p => (
                    <div key={p.userId} className="text-xs">
                      {p.displayName}: 
                      <span className={p.bVideoOn ? "text-green-600" : "text-red-600"}> 📹{p.bVideoOn ? "ON" : "OFF"}</span>
                      <span className={p.bAudioOn ? "text-green-600" : "text-red-600"}> 🔊{p.bAudioOn ? "ON" : "OFF"}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: remoteVideoAttached ? "block" : "none" }}
              onLoadedMetadata={() => {
                log("Remote video metadata loaded");
              }}
              onError={(e) => {
                logError("Remote video element error", e);
              }}
            />
            
            {/* Overlay content */}
            <div className={`absolute inset-0 flex items-center justify-center text-gray-400 ${remoteVideoAttached ? 'bg-transparent' : 'bg-gray-900'}`}>
              {participants.length === 0 ? (
                <>
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Așteptăm ca {other?.name} să se conecteze…</p>
                  <p className="text-sm mt-1">Status: {connectionStatus}</p>
                </>
              ) : remoteVideoAttached ? (
                // Show minimal overlay when video is playing
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {remoteParticipantWithVideo?.displayName}
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">👥</div>
                  <p>{participants.length} participant(s) connected</p>
                  <div className="text-sm mt-2 space-y-1">
                    {participants.map(p => (
                      <div key={p.userId} className="text-xs">
                        <strong>{p.displayName}</strong>
                        <br />
                        Video: <span className={p.bVideoOn ? "text-green-400" : "text-red-400"}>
                          {p.bVideoOn ? "ON" : "OFF"}
                        </span> | 
                        Audio: <span className={p.bAudioOn ? "text-green-400" : "text-red-400"}>
                          {p.bAudioOn ? "ON" : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {participants.some(p => p.bVideoOn) ? (
                    <div className="text-center mt-3">
                      <p className="text-sm text-yellow-400">
                        Someone has video ON but it&apos;s not rendering...
                      </p>
                      <div className="flex gap-2 justify-center mt-2">
                        <button
                          onClick={() => updateParticipants(true)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                        >
                          🔄 Retry Connection
                        </button>
                        <button
                          onClick={forceRemoteVideoReconnect}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          🔧 Force Reconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mt-2 text-gray-500">
                      Waiting for someone to turn on video
                    </p>
                  )}
                </>
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
          <button
            onClick={debugZoomAPIs}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            🔬 Debug Zoom APIs
          </button>
          <button
            onClick={forceVideoRepublish}
            disabled={!isVideoOn || !isMediaReady}
            className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            📡 Force Video Share
          </button>
          <button
            onClick={forceRemoteVideoReconnect}
            disabled={!isMediaReady || connectionStatus !== "connected"}
            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
          >
            🔄 Force Remote Video
          </button>
          <button
            onClick={debugRemoteVideo}
            className="px-3 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700"
          >
            🔍 Debug Remote Video
          </button>
          <button
            onClick={() => updateParticipants(true)}
            disabled={!isMediaReady || connectionStatus !== "connected"}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            🔄 Refresh Participants
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