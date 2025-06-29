"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

// Import ZoomVideo - this is where it might fail
let ZoomVideo: any = null;
try {
  ZoomVideo = require("@zoom/videosdk");
  console.log("✅ Zoom Video SDK imported successfully", ZoomVideo);
} catch (error) {
  console.error("❌ Failed to import Zoom Video SDK:", error);
}

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

export default function MinimalZoomDebug() {
  const { data: auth, status } = useSession();
  const { sessionId } = useParams();

  const [step, setStep] = useState<string>("idle");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [zoomClient, setZoomClient] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>({});
  
  const mountedRef = useRef(true);

  // Add log function
  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || "");
    setLogs(prev => [...prev.slice(-20), logEntry]); // Keep last 20 logs
  };

  // System diagnostics
  const checkSystem = () => {
    const info = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecure: window.isSecureContext,
      hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      hasWebGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) { return false; }
      })(),
      userAgent: navigator.userAgent,
      zoomSDKAvailable: !!ZoomVideo,
      zoomSDKMethods: ZoomVideo ? Object.getOwnPropertyNames(ZoomVideo).filter(name => typeof ZoomVideo[name] === 'function') : []
    };
    
    setSystemInfo(info);
    addLog("🔍 System check completed", info);
    
    return info;
  };

  // Step 1: Fetch session info
  const fetchSessionInfo = async () => {
    if (!sessionId) {
      setError("No session ID provided");
      return;
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
      setError(`Session fetch failed: ${error.message}`);
      throw error;
    }
  };

  // Step 2: Initialize Zoom SDK
  const initializeZoomSDK = async (sessionData: SessionInfo) => {
    if (!ZoomVideo) {
      throw new Error("Zoom Video SDK not available");
    }

    setStep("sdk-init");
    addLog("🚀 Initializing Zoom Video SDK...");

    try {
      // Destroy any existing client
      if (typeof ZoomVideo.destroyClient === 'function') {
        ZoomVideo.destroyClient();
        addLog("🧹 Destroyed existing client");
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create client
      addLog("📱 Creating Zoom client...");
      const client = ZoomVideo.createClient();
      
      if (!client) {
        throw new Error("Failed to create Zoom client");
      }

      addLog("✅ Zoom client created");
      setZoomClient(client);

      // Initialize SDK
      addLog("⚙️ Initializing SDK...");
      const initConfig = {
        patchJsMedia: true,
        stayAwake: true,
        logLevel: "info",
        webEndpoint: "zoom.us"
      };

      await client.init("en-US", "Global", initConfig);
      addLog("✅ SDK initialized");

      return client;
    } catch (error: any) {
      addLog("❌ SDK initialization failed", error);
      setError(`SDK init failed: ${error.message}`);
      throw error;
    }
  };

  // Step 3: Join session
  const joinSession = async (client: any, sessionData: SessionInfo) => {
    setStep("joining");
    addLog("🔗 Joining session...");

    try {
      addLog("🔑 Using token and session details", {
        sessionName: sessionData.sessionName,
        userName: auth?.user?.name,
        hasToken: !!sessionData.token,
        tokenLength: sessionData.token?.length
      });

      // Validate token format
      if (!sessionData.token || sessionData.token.split('.').length !== 3) {
        throw new Error("Invalid JWT token format");
      }

      // Parse token to check contents
      try {
        const payload = JSON.parse(atob(sessionData.token.split('.')[1]));
        addLog("🔑 Token payload", {
          iss: payload.iss,
          exp: new Date(payload.exp * 1000).toISOString(),
          tpc: payload.tpc,
          user_identity: payload.user_identity,
          role_type: payload.role_type
        });
      } catch (e) {
        addLog("⚠️ Could not parse token payload");
      }

      await client.join(
        sessionData.sessionName,
        sessionData.token,
        auth?.user?.name || "User",
        sessionData.sessionKey || ""
      );

      addLog("✅ Successfully joined session");
      setStep("connected");
      return true;
    } catch (error: any) {
      addLog("❌ Failed to join session", error);
      setError(`Join failed: ${error.message}`);
      throw error;
    }
  };

  // Main initialization flow
  const initialize = async () => {
    try {
      setError("");
      setStep("starting");
      
      // System check
      const sysInfo = checkSystem();
      
      if (!sysInfo.isSecure) {
        throw new Error("HTTPS required for Zoom Video SDK");
      }
      
      if (!sysInfo.zoomSDKAvailable) {
        throw new Error("Zoom Video SDK not loaded");
      }

      // Fetch session
      const sessionData = await fetchSessionInfo();
      
      // Initialize SDK
      const client = await initializeZoomSDK(sessionData);
      
      // Join session
      await joinSession(client, sessionData);

      addLog("🎉 Initialization completed successfully!");

    } catch (error: any) {
      addLog("💥 Initialization failed", error);
      setStep("failed");
    }
  };

  // Auto-start when ready
  useEffect(() => {
    if (auth?.user && sessionId && step === "idle") {
      initialize();
    }
  }, [auth?.user, sessionId, step]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (zoomClient && typeof zoomClient.leave === 'function') {
        zoomClient.leave().catch(console.error);
      }
    };
  }, [zoomClient]);

  // Render
  if (status === "loading") {
    return <div className="p-4">Loading authentication...</div>;
  }

  if (!auth?.user) {
    return <div className="p-4 text-red-500">Not authenticated</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">🔍 Zoom Video SDK Debug</h1>
        
        {/* Current Status */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Current Status</h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              step === "connected" ? "bg-green-100 text-green-800" :
              step === "failed" ? "bg-red-100 text-red-800" :
              "bg-yellow-100 text-yellow-800"
            }`}>
              {step === "connected" ? "✅ Connected" :
               step === "failed" ? "❌ Failed" :
               step === "idle" ? "⏳ Starting..." :
               `🔄 ${step}`}
            </span>
            <span className="text-sm text-gray-600">Session: {sessionId}</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* System Information */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">System Information</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Protocol: <span className={systemInfo.protocol === 'https:' ? 'text-green-600' : 'text-red-600'}>{systemInfo.protocol}</span></div>
              <div>Secure Context: <span className={systemInfo.isSecure ? 'text-green-600' : 'text-red-600'}>{systemInfo.isSecure ? 'Yes' : 'No'}</span></div>
              <div>WebRTC: <span className={systemInfo.hasWebRTC ? 'text-green-600' : 'text-red-600'}>{systemInfo.hasWebRTC ? 'Available' : 'Missing'}</span></div>
              <div>WebGL: <span className={systemInfo.hasWebGL ? 'text-green-600' : 'text-orange-600'}>{systemInfo.hasWebGL ? 'Available' : 'Missing'}</span></div>
              <div>SharedArrayBuffer: <span className={systemInfo.hasSharedArrayBuffer ? 'text-green-600' : 'text-orange-600'}>{systemInfo.hasSharedArrayBuffer ? 'Available' : 'Missing'}</span></div>
              <div>Zoom SDK: <span className={systemInfo.zoomSDKAvailable ? 'text-green-600' : 'text-red-600'}>{systemInfo.zoomSDKAvailable ? 'Loaded' : 'Missing'}</span></div>
            </div>
            {systemInfo.userAgent && (
              <div className="mt-2 text-xs text-gray-600">
                <strong>Browser:</strong> {systemInfo.userAgent}
              </div>
            )}
          </div>
        </div>

        {/* Session Information */}
        {sessionInfo && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Session Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <div><strong>Session Name:</strong> {sessionInfo.sessionName}</div>
              <div><strong>Provider:</strong> {sessionInfo.provider.name}</div>
              <div><strong>Client:</strong> {sessionInfo.client.name}</div>
              <div><strong>Your Role:</strong> {sessionInfo.provider.id === auth.user.id ? 'Provider (Host)' : 'Client (Participant)'}</div>
              <div><strong>Token Length:</strong> {sessionInfo.token?.length} characters</div>
            </div>
          </div>
        )}

        {/* Debug Logs */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Debug Logs</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? "No logs yet..." : logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              setStep("idle");
              setError("");
              setLogs([]);
              initialize();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            🔃 Reload Page
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({ systemInfo, logs, error }, null, 2))}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📋 Copy Debug Info
          </button>
        </div>
      </div>
    </div>
  );
}