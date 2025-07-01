"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface VideoLayoutProps {
  children: React.ReactNode;
}

export default function VideoLayout({ children }: VideoLayoutProps) {
  const [systemReady, setSystemReady] = useState<boolean>(false);
  const [systemChecks, setSystemChecks] = useState<any>({});
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const pathname = usePathname();

  // Check if we're on a video page
  const isVideoPage = pathname?.includes('/video') || pathname?.includes('/sessions');

  useEffect(() => {
    // Only run system checks on video pages
    if (!isVideoPage) {
      setSystemReady(true);
      return;
    }

    const performSystemChecks = () => {
      const checks = {
        // Critical for Zoom Video SDK
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        crossOriginIsolated: window.crossOriginIsolated,
        
        // Browser requirements
        isSecure: window.isSecureContext,
        hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasWebGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch (e) { 
            return false; 
          }
        })(),
        
        // Environment info
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        
        // Derived checks
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        isHTTPS: window.location.protocol === 'https:',
        
        // Browser detection
        isChrome: /Chrome/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        
        // Overall status
        timestamp: new Date().toISOString()
      };

      // Determine if system is ready for Zoom
      const criticalChecks = checks.hasSharedArrayBuffer && checks.crossOriginIsolated && checks.hasWebRTC;
      const systemReady = criticalChecks && (checks.isHTTPS || checks.isLocalhost);

      console.log('[VideoLayout] System checks completed:', {
        ...checks,
        systemReady,
        criticalChecks
      });

      setSystemChecks(checks);
      setSystemReady(systemReady);
    };

    // Run checks immediately
    performSystemChecks();

    // Also run checks when page becomes visible (handles tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performSystemChecks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVideoPage]);

  // If not a video page, render children normally
  if (!isVideoPage) {
    return <>{children}</>;
  }

  // If system not ready, show requirements page
  if (!systemReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-4 pt-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">System Requirements Not Met</h1>
              <p className="text-gray-600">Your browser needs additional configuration for video calls.</p>
            </div>

            {/* Requirements Status */}
            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-gray-900">System Status:</h2>
              
              <div className="grid gap-3">
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  systemChecks.hasSharedArrayBuffer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      systemChecks.hasSharedArrayBuffer ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">SharedArrayBuffer</span>
                  </div>
                  <span className={`text-sm ${
                    systemChecks.hasSharedArrayBuffer ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {systemChecks.hasSharedArrayBuffer ? 'Available' : 'Missing'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  systemChecks.crossOriginIsolated ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      systemChecks.crossOriginIsolated ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">Cross-Origin Isolation</span>
                  </div>
                  <span className={`text-sm ${
                    systemChecks.crossOriginIsolated ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {systemChecks.crossOriginIsolated ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  systemChecks.hasWebRTC ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      systemChecks.hasWebRTC ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">WebRTC</span>
                  </div>
                  <span className={`text-sm ${
                    systemChecks.hasWebRTC ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {systemChecks.hasWebRTC ? 'Available' : 'Missing'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  (systemChecks.isHTTPS || systemChecks.isLocalhost) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      (systemChecks.isHTTPS || systemChecks.isLocalhost) ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">Secure Context</span>
                  </div>
                  <span className={`text-sm ${
                    (systemChecks.isHTTPS || systemChecks.isLocalhost) ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {systemChecks.protocol} {systemChecks.isLocalhost ? '(localhost)' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Solutions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">How to Fix:</h3>
              <div className="text-blue-800 text-sm space-y-2">
                {!systemChecks.hasSharedArrayBuffer && (
                  <div>
                    <strong>SharedArrayBuffer Missing:</strong>
                    <p>The server needs to send CORS headers. Check that next.config.js has:</p>
                    <code className="block bg-blue-100 p-2 mt-1 rounded text-xs">
                      Cross-Origin-Embedder-Policy: require-corp<br/>
                      Cross-Origin-Opener-Policy: same-origin
                    </code>
                  </div>
                )}
                {!systemChecks.crossOriginIsolated && (
                  <div>
                    <strong>Cross-Origin Isolation Disabled:</strong>
                    <p>This is automatically enabled when the CORS headers above are set correctly.</p>
                  </div>
                )}
                {!systemChecks.isHTTPS && !systemChecks.isLocalhost && (
                  <div>
                    <strong>HTTPS Required:</strong>
                    <p>Video calls require a secure connection (HTTPS) in production.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh Page
              </button>
              
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔍 {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                ← Go Back
              </button>
            </div>

            {/* Debug Information */}
            {showDebug && (
              <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Debug Information:</h4>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(systemChecks, null, 2)}
                </pre>
              </div>
            )}

            {/* Additional Help */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm text-center">
                If problems persist, contact support with the debug information above.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // System is ready, render video interface
  return (
    <div className="video-sdk-environment">
      {/* Optional: Add environment indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 z-50 bg-green-600 text-white px-3 py-1 text-xs">
          SharedArrayBuffer: ✅ | CORS: ✅
        </div>
      )}
      
      {children}
    </div>
  );
}