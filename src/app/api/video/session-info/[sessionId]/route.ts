// File: app/api/video/session-info/[sessionId]/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

interface SessionInfo {
  sessionName: string;
  token:       string;
  userId:      string;
  startDate:   string;
  endDate:     string;
  provider:    { id: string; name: string };
  client:      { id: string; name: string };
  sessionKey?: string;
}

// Helper function to generate Zoom Video SDK token
function generateZoomToken(sessionName: string, userId: string, roleType: number = 0): string {
  const now = Math.floor(Date.now() / 1000);
  
  // Video SDK JWT payload format (verified against Zoom docs)
  const payload = {
    iss: process.env.ZOOM_SDK_KEY!, // Use 'iss' instead of 'app_key' for newer SDK versions
    alg: 'HS256',
    typ: 'JWT',
    exp: now + (60 * 60 * 2), // 2 hours from now
    iat: now,
    aud: 'zoom',
    appKey: process.env.ZOOM_SDK_KEY!, // Include both for compatibility
    tokenExp: now + (60 * 60 * 2),
    
    // Video SDK specific fields
    tpc: sessionName, // topic/session name
    role_type: roleType, // 0 = participant, 1 = host
    user_identity: userId,
    
    // Enhanced fields for better compatibility
    sessionKey: '', // Can be used for session passwords
    geoRegions: 'US', // or 'EU', 'CN', 'IN', 'AU' based on your location
    
    // Enable WebRTC for better performance (critical!)
    videoWebRtcMode: 1,
    audioWebRtcMode: 1,
    
    // Additional compatibility fields
    version: 1,
    cloud_recording_option: 0, // 0 = disabled, 1 = enabled
    cloud_recording_election: 0
  };

  console.log('[Debug] Generating Zoom Video SDK token:', {
    sessionName,
    userId,
    roleType,
    sdkKey: process.env.ZOOM_SDK_KEY,
    issuedAt: new Date(now * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    payload: { ...payload, sessionKey: '[REDACTED]' } // Don't log session key
  });

  try {
    const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET!, { 
      algorithm: 'HS256',
      expiresIn: '2h'
    });
    
    console.log('[Debug] Token generated successfully');
    return token;
  } catch (error) {
    console.error('[Debug] Token generation failed:', error);
    throw new Error('Failed to generate Zoom token');
  }
}

// Helper function to validate if existing token is still valid
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[Debug] Invalid JWT format - wrong number of parts:', parts.length);
      return false;
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    // Check if the SDK key matches current environment
    const hasValidKey = payload.iss === process.env.ZOOM_SDK_KEY || 
                       payload.app_key === process.env.ZOOM_SDK_KEY ||
                       payload.appKey === process.env.ZOOM_SDK_KEY;
    
    console.log('[Debug] Token validation:', {
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      currentTime: new Date().toISOString(),
      minutesUntilExpiry: Math.round(timeUntilExpiry / 60),
      hasValidKey,
      tokenKeys: {
        iss: payload.iss,
        app_key: payload.app_key,
        appKey: payload.appKey
      },
      currentSDKKey: process.env.ZOOM_SDK_KEY,
      isValid: timeUntilExpiry > 300 && hasValidKey
    });
    
    // Token is valid if it has more than 5 minutes left AND uses the correct SDK key
    return timeUntilExpiry > 300 && hasValidKey;
  } catch (e) {
    console.error('[Debug] Token parsing failed:', e);
    return false;
  }
}

// Helper function to validate Zoom SDK configuration
function validateZoomConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.ZOOM_SDK_KEY) {
    errors.push('ZOOM_SDK_KEY environment variable is missing');
  } else if (process.env.ZOOM_SDK_KEY.length < 10) {
    errors.push('ZOOM_SDK_KEY appears to be invalid (too short)');
  }
  
  if (!process.env.ZOOM_SDK_SECRET) {
    errors.push('ZOOM_SDK_SECRET environment variable is missing');
  } else if (process.env.ZOOM_SDK_SECRET.length < 10) {
    errors.push('ZOOM_SDK_SECRET appears to be invalid (too short)');
  }
  
  // Check if accidentally using API credentials instead of SDK
  if (process.env.ZOOM_SDK_KEY && process.env.ZOOM_SDK_KEY.includes('api')) {
    errors.push('ZOOM_SDK_KEY appears to be an API key instead of SDK key');
  }
  
  console.log('[Debug] Zoom configuration validation:', {
    hasSDKKey: !!process.env.ZOOM_SDK_KEY,
    hasSDKSecret: !!process.env.ZOOM_SDK_SECRET,
    sdkKeyLength: process.env.ZOOM_SDK_KEY?.length || 0,
    sdkSecretLength: process.env.ZOOM_SDK_SECRET?.length || 0,
    errors
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: { sessionId: string } }
) {
  console.log('[Debug] ========== Starting Zoom Video SDK session-info request ==========');

  const { sessionId } = await context.params;
  console.log('[Debug] sessionId:', sessionId);

  // Validate Zoom configuration first
  const configValidation = validateZoomConfig();
  if (!configValidation.isValid) {
    console.error('[Debug] Zoom SDK configuration invalid:', configValidation.errors);
    return NextResponse.json({ 
      error: 'Zoom SDK configuration error',
      details: process.env.NODE_ENV === 'development' ? configValidation.errors : undefined
    }, { status: 500 });
  }

  // Authenticate
  const sess = await getServerSession(authOptions);
  if (!sess?.user?.id) {
    console.log('[Debug] Unauthenticated request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = sess.user.id;
  console.log('[Debug] Authenticated user:', currentUserId);

  // Find active session record
  const now = new Date();
  console.log('[Debug] Current time:', now.toISOString());
  
  const record = await prisma.consultingSession.findFirst({
    where: {
      id: sessionId,
      // Optional: Add time-based validation if needed
      // startDate: { lte: now },
      // endDate: { gte: now }
    },
    select: {
      providerId:      true,
      clientId:        true,
      zoomSessionName: true,
      zoomTokens:      true,
      startDate:       true,
      endDate:         true,
    },
  });
  
  console.log('[Debug] Session record found:', !!record);
  if (!record) {
    console.log('[Debug] No session found with ID:', sessionId);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get provider's user ID
  const providerRelation = await prisma.provider.findUnique({
    where: { id: record.providerId },
    select: { userId: true }
  });
  
  if (!providerRelation) {
    console.error('[Debug] Provider relation not found for providerId:', record.providerId);
    return NextResponse.json({ error: 'Provider data missing' }, { status: 500 });
  }

  // Authorization - check if current user is either the provider or the client
  const isProvider = providerRelation.userId === currentUserId;
  const isClient = record.clientId === currentUserId;
  
  console.log('[Debug] User authorization:', {
    currentUserId,
    providerUserId: providerRelation.userId,
    clientId: record.clientId,
    isProvider,
    isClient
  });

  if (!isProvider && !isClient) {
    console.log('[Debug] User not authorized for this session');
    return NextResponse.json({ error: 'Access denied to this session' }, { status: 403 });
  }

  // Extract existing tokens from DB
  console.log('[Debug] Raw zoomTokens from DB:', record.zoomTokens);
  let tokensMap: Record<string, string> = {};
  if (record.zoomTokens && typeof record.zoomTokens === 'object') {
    tokensMap = record.zoomTokens as Record<string, string>;
  }

  // Determine the correct token key and role for the current user
  let tokenKey: string;
  let roleType: number;
  
  if (isProvider) {
    tokenKey = record.providerId;
    roleType = 1; // Host role for provider
  } else {
    tokenKey = currentUserId; // client ID
    roleType = 0; // Participant role for client
  }

  console.log('[Debug] Token generation parameters:', {
    tokenKey,
    roleType,
    sessionName: record.zoomSessionName
  });

  // Check if we have a valid existing token
  const existingToken = tokensMap[tokenKey];
  let token: string;
  let needsUpdate = false;

  if (existingToken && isTokenValid(existingToken)) {
    console.log('[Debug] Using existing valid token for user:', tokenKey);
    token = existingToken;
  } else {
    console.log('[Debug] Generating new token for user:', tokenKey, {
      hasExistingToken: !!existingToken,
      existingTokenValid: existingToken ? isTokenValid(existingToken) : false,
      reason: existingToken ? 'Token expired or invalid' : 'No existing token'
    });
    
    try {
      // Generate new token with current SDK credentials
      token = generateZoomToken(record.zoomSessionName!, tokenKey, roleType);
      
      // Update the tokens map
      tokensMap[tokenKey] = token;
      needsUpdate = true;
    } catch (error) {
      console.error('[Debug] Failed to generate token:', error);
      return NextResponse.json({ 
        error: 'Failed to generate session token',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 500 });
    }
  }

  // Update database with new token if needed
  if (needsUpdate) {
    try {
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { zoomTokens: tokensMap }
      });
      console.log('[Debug] Successfully updated tokens in database');
    } catch (updateError) {
      console.error('[Debug] Failed to update tokens in database:', updateError);
      // Continue anyway - the token is still valid for this request
    }
  }

  // Fetch both user records
  const [providerUser, clientUser] = await Promise.all([
    prisma.user.findUnique({ 
      where: { id: providerRelation.userId }, 
      select: { id: true, name: true } 
    }),
    prisma.user.findUnique({ 
      where: { id: record.clientId }, 
      select: { id: true, name: true } 
    }),
  ]);
  
  if (!providerUser || !clientUser) {
    console.error('[Debug] Missing user data:', { 
      hasProvider: !!providerUser, 
      hasClient: !!clientUser 
    });
    return NextResponse.json({ error: 'User data missing' }, { status: 500 });
  }

  // Build response
  const response: SessionInfo = {
    sessionName: record.zoomSessionName!,
    token,
    userId: currentUserId,
    startDate: record.startDate!.toISOString(),
    endDate: record.endDate!.toISOString(),
    provider: { id: providerUser.id, name: providerUser.name! },
    client: { id: clientUser.id, name: clientUser.name! },
    sessionKey: '' // Can be used for session passwords
  };

  // Log final token info for debugging (without exposing sensitive data)
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    console.log('[Debug] Final token details:', {
      issuedAt: new Date(tokenPayload.iat * 1000).toISOString(),
      expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
      minutesUntilExpiry: Math.round((tokenPayload.exp - Math.floor(Date.now() / 1000)) / 60),
      sessionName: tokenPayload.tpc,
      userIdentity: tokenPayload.user_identity,
      roleType: tokenPayload.role_type,
      hasWebRTCEnabled: {
        video: tokenPayload.videoWebRtcMode === 1,
        audio: tokenPayload.audioWebRtcMode === 1
      }
    });
  } catch (e) {
    console.warn('[Debug] Could not parse token for logging');
  }

  console.log('[Debug] ========== Session-info request completed successfully ==========');
  return NextResponse.json(response);
}