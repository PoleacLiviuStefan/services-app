// File: app/api/video/session-info/[sessionId]/route.ts
// Corrected version based on official Zoom Video SDK requirements

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import KJUR from 'jsrsasign';

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

// ✅ CORRECTED: Generate JWT using official Zoom Video SDK format
function generateVideoSDKToken(
  sessionName: string, 
  userId: string, 
  roleType: number = 0,
  sessionKey: string = '',
  expirationSeconds: number = 7200 // 2 hours
): string {
  
  console.log('[Debug] ========== CORRECTED Video SDK Token Generation ==========');
  
  // Validate environment variables
  if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
    throw new Error('Missing ZOOM_API_PUBLIC or ZOOM_API_SECRET environment variables');
  }

  const iat = Math.round(new Date().getTime() / 1000) - 30; // 30 seconds ago to account for clock skew
  const exp = iat + expirationSeconds;
  
  // ✅ CRITICAL: Use exact field names from official Zoom Video SDK documentation
  const payload = {
    // Required fields (exact naming from Zoom docs)
    app_key: process.env.ZOOM_API_PUBLIC,        // Video SDK Key (NOT API key)
    tpc: sessionName,                            // Session name/topic
    role_type: roleType,                         // 0 = participant, 1 = host
    iat: iat,                                    // Issued at
    exp: exp,                                    // Expires at
    
    // Optional fields
    user_identity: userId,                       // User identifier
    session_key: sessionKey,                     // Session password (optional)
    
    // Additional recommended fields
    alg: 'HS256'                                // Algorithm
  };

  console.log('[Debug] Video SDK Token Payload:', {
    app_key: payload.app_key?.substring(0, 10) + '...',
    tpc: payload.tpc,
    role_type: payload.role_type,
    user_identity: payload.user_identity,
    session_key: payload.session_key,
    iat: new Date(payload.iat * 1000).toISOString(),
    exp: new Date(payload.exp * 1000).toISOString(),
    duration_hours: (payload.exp - payload.iat) / 3600
  });

  try {
    // Header for JWT
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const sHeader = JSON.stringify(header);
    const sPayload = JSON.stringify(payload);
    
    // Generate token using jsrsasign
    const token = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET);
    
    console.log('[Debug] Video SDK Token generated successfully');
    
    // Verify token structure
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error(`Token has ${parts.length} parts, expected 3`);
      }
      
      const decodedPayload = JSON.parse(atob(parts[1]));
      console.log('[Debug] Token verification:', {
        hasAppKey: !!decodedPayload.app_key,
        hasTpc: !!decodedPayload.tpc,
        hasRoleType: decodedPayload.role_type !== undefined,
        hasIat: !!decodedPayload.iat,
        hasExp: !!decodedPayload.exp,
        tokenParts: parts.length,
        isValidStructure: true
      });
    } catch (verifyError) {
      console.error('[Debug] Token verification failed:', verifyError);
      throw new Error('Generated token has invalid structure');
    }
    
    return token;
  } catch (error) {
    console.error('[Debug] Video SDK Token generation failed:', error);
    throw new Error('Failed to generate Video SDK token: ' + error.message);
  }
}

// Validate token structure and expiration
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[Debug] Token invalid: wrong number of parts');
      return false;
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    // Check required fields for Video SDK
    const hasRequiredFields = !!(
      payload.app_key && 
      payload.tpc && 
      payload.role_type !== undefined &&
      payload.iat && 
      payload.exp
    );
    
    const isValid = timeUntilExpiry > 300 && hasRequiredFields; // 5 minutes buffer
    
    console.log('[Debug] Token validation:', {
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      minutesUntilExpiry: Math.round(timeUntilExpiry / 60),
      hasRequiredFields,
      missingFields: [
        !payload.app_key && 'app_key',
        !payload.tpc && 'tpc',
        payload.role_type === undefined && 'role_type',
        !payload.iat && 'iat',
        !payload.exp && 'exp'
      ].filter(Boolean),
      isValid
    });
    
    return isValid;
  } catch (e) {
    console.error('[Debug] Token parsing failed:', e);
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: { sessionId: string } }
) {
  console.log('[Debug] ========== CORRECTED Video SDK Session Info Request ==========');

  const { sessionId } = await context.params;
  console.log('[Debug] Processing session ID:', sessionId);

  // Validate Zoom Video SDK credentials
  if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
    console.error('[Debug] Missing Zoom Video SDK credentials');
    return NextResponse.json({ 
      error: 'Zoom Video SDK configuration missing',
      details: 'Ensure ZOOM_API_PUBLIC and ZOOM_API_SECRET are set with Video SDK credentials (not Meeting SDK)'
    }, { status: 500 });
  }

  console.log('[Debug] Using Zoom Video SDK credentials:', {
    hasApiKey: !!process.env.ZOOM_API_PUBLIC,
    hasApiSecret: !!process.env.ZOOM_API_SECRET,
    apiKeyPrefix: process.env.ZOOM_API_PUBLIC?.substring(0, 10) + '...',
    credentialType: 'Video SDK (app_key/app_secret)'
  });

  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('[Debug] Unauthenticated request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = session.user.id;
  console.log('[Debug] Authenticated user:', currentUserId);

  // Find consulting session
  const record = await prisma.consultingSession.findFirst({
    where: { id: sessionId },
    select: {
      providerId: true,
      clientId: true,
      zoomSessionName: true,
      zoomSessionId: true,
      zoomTokens: true,
      startDate: true,
      endDate: true,
    },
  });
  
  if (!record) {
    console.log('[Debug] Consulting session not found:', sessionId);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (!record.zoomSessionName) {
    console.error('[Debug] Session exists but no Zoom session name');
    return NextResponse.json({ 
      error: 'Zoom session not initialized',
      details: 'Please create the Video SDK session first'
    }, { status: 400 });
  }

  console.log('[Debug] Found session:', {
    sessionId,
    zoomSessionName: record.zoomSessionName,
    zoomSessionId: record.zoomSessionId,
    hasTokens: !!record.zoomTokens
  });

  // Get provider user ID
  const providerRelation = await prisma.provider.findUnique({
    where: { id: record.providerId },
    select: { userId: true }
  });
  
  if (!providerRelation) {
    console.error('[Debug] Provider relation not found');
    return NextResponse.json({ error: 'Provider data missing' }, { status: 500 });
  }

  // Check authorization
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

  // Determine role and token key
  let tokenKey: string;
  let roleType: number;
  
  if (isProvider) {
    tokenKey = record.providerId;
    roleType = 1; // Host role for provider
  } else {
    tokenKey = currentUserId; // client ID
    roleType = 0; // Participant role for client
  }

  console.log('[Debug] Video SDK Token parameters:', {
    tokenKey,
    roleType: roleType === 1 ? 'host' : 'participant',
    sessionName: record.zoomSessionName,
    userType: isProvider ? 'provider' : 'client'
  });

  // Check existing token
  let tokensMap: Record<string, string> = {};
  if (record.zoomTokens && typeof record.zoomTokens === 'object') {
    tokensMap = record.zoomTokens as Record<string, string>;
  }

  const existingToken = tokensMap[tokenKey];
  let token: string;
  let needsUpdate = false;

  if (existingToken && isTokenValid(existingToken)) {
    console.log('[Debug] Using existing valid Video SDK token for user:', tokenKey);
    token = existingToken;
  } else {
    console.log('[Debug] Generating new Video SDK token for user:', tokenKey, {
      hasExistingToken: !!existingToken,
      existingTokenValid: existingToken ? isTokenValid(existingToken) : false,
      reason: existingToken ? 'Token expired or invalid' : 'No existing token'
    });
    
    // Generate new Video SDK token
    token = generateVideoSDKToken(
      record.zoomSessionName, 
      tokenKey, 
      roleType,
      '', // session key (optional)
      7200 // 2 hours expiration
    );
    
    // Update tokens map
    tokensMap[tokenKey] = token;
    needsUpdate = true;
  }

  // Update database if needed
  if (needsUpdate) {
    try {
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { zoomTokens: tokensMap }
      });
      console.log('[Debug] Updated Video SDK tokens in database');
    } catch (updateError) {
      console.error('[Debug] Failed to update tokens in database:', updateError);
    }
  }

  // Get user data
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
    console.error('[Debug] Missing user data');
    return NextResponse.json({ error: 'User data missing' }, { status: 500 });
  }

  // Build response
  const response: SessionInfo = {
    sessionName: record.zoomSessionName,  // Video SDK session name
    token,                                // Video SDK JWT token
    userId: currentUserId,
    startDate: record.startDate!.toISOString(),
    endDate: record.endDate!.toISOString(),
    provider: { id: providerUser.id, name: providerUser.name! },
    client: { id: clientUser.id, name: clientUser.name! },
    sessionKey: ''
  };

  // Final token verification log
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    console.log('[Debug] Final Video SDK token details:', {
      app_key: tokenPayload.app_key?.substring(0, 10) + '...',
      tpc: tokenPayload.tpc,
      role_type: tokenPayload.role_type,
      user_identity: tokenPayload.user_identity,
      expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
      tokenType: 'Video SDK JWT',
      structure: 'CORRECTED'
    });
  } catch (e) {
    console.warn('[Debug] Could not parse final token for logging');
  }

  console.log('[Debug] ========== Video SDK Session Info Request Completed ==========');
  return NextResponse.json(response);
}