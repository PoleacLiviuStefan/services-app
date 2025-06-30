"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

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
  const [sdkLoaded, setSdkLoaded] = useState<boolean>(false);
  
  const mountedRef = useRef(true);
  const zoomSdkRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);

  // Add log function
  const addLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || "");
    setLogs(prev => [...prev.slice(-20), logEntry]);
  }, []);

  // Load Zoom SDK safely after component mount
  const loadZoomSDK = useCallback(async () => {
    if (zoomSdkRef.current || !mountedRef.current) {
      return zoomSdkRef.current;
    }

    try {
      addLog("📦 Loading Zoom Video SDK...");
      
      // Wait for DOM to be ready
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve(true);
        } else {
          window.addEventListener('load', () => resolve(true), { once: true });
        }
      });

      let zoomSDK = null;

      // Method 1: Check if already loaded on window
      if (typeof window !== 'undefined' && (window as any).ZoomVideo) {
        addLog("✅ Found Zoom SDK on window object");
        zoomSDK = (window as any).ZoomVideo;
      } else {
        // Method 2: Try dynamic import with error handling
        try {
          const zoomModule = await import("@zoom/videosdk");
          zoomSDK = zoomModule.default || zoomModule;
          addLog("✅ Zoom SDK loaded via dynamic import");
        } catch (importError) {
          addLog("⚠️ Dynamic import failed, trying script injection");
          
          // Method 3: Script injection fallback
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://source.zoom.us/videosdk/1.11.8/lib/index.js';
            script.onload = () => {
              if ((window as any).ZoomVideo) {
                zoomSDK = (window as any).ZoomVideo;
                addLog("✅ Zoom SDK loaded via script injection");
                resolve(true);
              } else {
                reject(new Error("SDK script loaded but ZoomVideo not found"));
              }
            };
            script.onerror = () => reject(new Error("Failed to load SDK script"));
            document.head.appendChild(script);
          });
        }
      }

      if (!zoomSDK) {
        throw new Error("Could not load Zoom Video SDK");
      }

      // Validate SDK has required methods
      if (typeof zoomSDK.createClient !== 'function') {
        addLog("🔍 SDK object structure", {
          type: typeof zoomSDK,
          keys: Object.keys(zoomSDK),
          hasCreateClient: 'createClient' in zoomSDK,
          constructor: zoomSDK.constructor?.name
        });
        
        // Try to find createClient in nested objects
        if (zoomSDK.default && typeof zoomSDK.default.createClient === 'function') {
          zoomSDK = zoomSDK.default;
          addLog("✅ Using SDK default export");
        } else {
          throw new Error("createClient method not found in SDK");
        }
      }

      zoomSdkRef.current = zoomSDK;
      setSdkLoaded(true);
      addLog("✅ Zoom SDK ready for use");
      
      return zoomSDK;
    } catch (error: any) {
      addLog("❌ Failed to load Zoom SDK", error);
      throw error;
    }
  }, [addLog]);

  // Enhanced system diagnostics
  const checkSystem = useCallback(() => {
    const info = {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      isSecure: window.isSecureContext,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      crossOriginIsolated: window.crossOriginIsolated,
      hasWebGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) { return false; }
      })(),
      userAgent: navigator.userAgent,
      sdkLoaded: sdkLoaded,
      windowZoomVideo: typeof window !== 'undefined' ? !!(window as any).ZoomVideo : false,
      sdkMethods: zoomSdkRef.current ? Object.getOwnPropertyNames(zoomSdkRef.current).filter(name => 
        typeof zoomSdkRef.current[name] === 'function') : []
    };
    
    setSystemInfo(info);
    addLog("🔍 System check completed", info);
    
    return info;
  }, [addLog, sdkLoaded]);

  // Step 1: Fetch session info
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

  // Step 2: Initialize Zoom SDK
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
          zoomSDK.destroyClient();
          addLog("🧹 Destroyed existing client");
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create client
      addLog("📱 Creating Zoom client...");
      const client = zoomSDK.createClient();
      
      if (!client) {
        throw new Error("Failed to create Zoom client - returned null");
      }

      addLog("✅ Zoom client created");
      setZoomClient(client);

      // Initialize SDK with error handling
      addLog("⚙️ Initializing SDK...");
      const initConfig = {
        patchJsMedia: false, // Disable patching to avoid conflicts
        stayAwake: true,
        logLevel: "info",
        webEndpoint: "zoom.us"
      };

      await client.init("en-US", "Global", initConfig);
      addLog("✅ SDK initialized successfully");

      return client;
    } catch (error: any) {
      addLog("❌ SDK initialization failed", error);
      throw error;
    }
  }, [addLog]);

  // Step 3: Join session
  const joinSession = useCallback(async (client: any, sessionData: SessionInfo) => {
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
      throw error;
    }
  }, [auth?.user?.name, addLog]);

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
      
      // Load SDK first
      const zoomSDK = await loadZoomSDK();
      
      // System check
      const sysInfo = checkSystem();
      
      // Check requirements
      if (!sysInfo.isSecure && !sysInfo.isLocalhost) {
        throw new Error("HTTPS required for Zoom Video SDK (except localhost)");
      }
      
      if (!zoomSDK) {
        throw new Error("Zoom Video SDK failed to load");
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
      setError(error.message);
      setStep("failed");
    } finally {
      initializingRef.current = false;
    }
  }, [loadZoomSDK, checkSystem, fetchSessionInfo, initializeZoomSDK, joinSession, addLog]);

  // Load SDK on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Load SDK immediately but don't start initialization
    loadZoomSDK().catch(err => {
      addLog("❌ Failed to load SDK on mount", err);
    });

    return () => {
      mountedRef.current = false;
      initializingRef.current = false;
    };
  }, [loadZoomSDK, addLog]);

  // Auto-start when ready
  useEffect(() => {
    if (auth?.user && sessionId && step === "idle" && sdkLoaded && !initializingRef.current) {
      addLog("🚀 Starting initialization...");
      initialize();
    }
  }, [auth?.user, sessionId, step, sdkLoaded, initialize, addLog]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (zoomClient && typeof zoomClient.leave === 'function') {
        zoomClient.leave().catch(console.error);
      }
    };
  }, [zoomClient]);

  // Check for missing requirements and show warnings
  const getSystemWarnings = () => {
    const warnings = [];
    
    if (!systemInfo.isSecure && !systemInfo.isLocalhost) {
      warnings.push("⚠️ HTTPS required for production use");
    }
    
    if (!systemInfo.hasSharedArrayBuffer) {
      warnings.push("⚠️ SharedArrayBuffer missing - may affect performance");
    }
    
    if (!systemInfo.crossOriginIsolated) {
      warnings.push("⚠️ Cross-Origin Isolation not enabled");
    }
    
    return warnings;
  };

  // Manual retry function
  const handleRetry = () => {
    setStep("idle");
    setError("");
    setLogs([]);
    setSdkLoaded(false);
    zoomSdkRef.current = null;
    setZoomClient(null);
    initializingRef.current = false;
    
    // Reload SDK and restart
    loadZoomSDK().then(() => {
      if (auth?.user && sessionId) {
        initialize();
      }
    }).catch(err => {
      addLog("❌ Retry failed", err);
      setError(err.message);
    });
  };

  // Render
  if (status === "loading") {
    return <div className="p-4">Loading authentication...</div>;
  }

  if (!auth?.user) {
    return <div className="p-4 text-red-500">Not authenticated</div>;
  }

  const warnings = getSystemWarnings();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">🔍 Zoom Video SDK Debug</h1>
        
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800">System Warnings:</h3>
            <ul className="text-yellow-700 mt-1">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
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
               step === "idle" ? "⏳ Ready..." :
               `🔄 ${step}`}
            </span>
            <span className="text-sm text-gray-600">Session: {sessionId}</span>
            <span className={`text-sm ${sdkLoaded ? 'text-green-600' : 'text-orange-600'}`}>
              SDK: {sdkLoaded ? 'Loaded' : 'Loading...'}
            </span>
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
              <div>Protocol: <span className={systemInfo.protocol === 'https:' ? 'text-green-600' : systemInfo.isLocalhost ? 'text-yellow-600' : 'text-red-600'}>{systemInfo.protocol}</span></div>
              <div>Secure Context: <span className={systemInfo.isSecure ? 'text-green-600' : 'text-red-600'}>{systemInfo.isSecure ? 'Yes' : 'No'}</span></div>
              <div>WebRTC: <span className={systemInfo.hasWebRTC ? 'text-green-600' : 'text-red-600'}>{systemInfo.hasWebRTC ? 'Available' : 'Missing'}</span></div>
              <div>WebGL: <span className={systemInfo.hasWebGL ? 'text-green-600' : 'text-orange-600'}>{systemInfo.hasWebGL ? 'Available' : 'Missing'}</span></div>
              <div>SharedArrayBuffer: <span className={systemInfo.hasSharedArrayBuffer ? 'text-green-600' : 'text-orange-600'}>{systemInfo.hasSharedArrayBuffer ? 'Available' : 'Missing'}</span></div>
              <div>Cross-Origin Isolated: <span className={systemInfo.crossOriginIsolated ? 'text-green-600' : 'text-orange-600'}>{systemInfo.crossOriginIsolated ? 'Yes' : 'No'}</span></div>
              <div>Zoom SDK: <span className={systemInfo.sdkLoaded ? 'text-green-600' : 'text-orange-600'}>{systemInfo.sdkLoaded ? 'Loaded' : 'Loading...'}</span></div>
              <div>Window ZoomVideo: <span className={systemInfo.windowZoomVideo ? 'text-green-600' : 'text-gray-600'}>{systemInfo.windowZoomVideo ? 'Available' : 'Not Found'}</span></div>
            </div>
            {systemInfo.sdkMethods && systemInfo.sdkMethods.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <strong>SDK Methods:</strong> {systemInfo.sdkMethods.join(', ')}
              </div>
            )}
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
            onClick={handleRetry}
            disabled={initializingRef.current}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 {initializingRef.current ? 'Retrying...' : 'Retry'}
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