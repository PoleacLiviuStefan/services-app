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
}

// Helper function to generate Zoom token with current timestamp
function generateZoomToken(sessionName: string, userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    app_key: process.env.ZOOM_SDK_KEY!,
    version: 1,
    tpc: sessionName, // topic/session name
    role_type: 0, // participant (0 = participant, 1 = host)
    user_identity: userId,
    iat: now,
    exp: now + (60 * 60 * 2) // 2 hours from now
  };

  const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET!);
  
  console.log('[Debug] Generated new token for user:', userId, {
    issuedAt: new Date(now * 1000).toISOString(),
    expiresAt: new Date((now + (60 * 60 * 2)) * 1000).toISOString(),
    sessionName,
    userId,
    app_key: process.env.ZOOM_SDK_KEY // Log to verify correct key is used
  });
  
  return token;
}

// Helper function to validate if existing token is still valid
function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    // Also check if the app_key matches current environment
    const isValidKey = payload.app_key === process.env.ZOOM_SDK_KEY;
    
    console.log('[Debug] Token validation:', {
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      currentTime: new Date().toISOString(),
      minutesUntilExpiry: Math.round(timeUntilExpiry / 60),
      hasValidKey: isValidKey,
      tokenAppKey: payload.app_key,
      currentAppKey: process.env.ZOOM_SDK_KEY,
      isValid: timeUntilExpiry > 300 && isValidKey
    });
    
    // Token is valid if it has more than 5 minutes left AND uses the correct app key
    return timeUntilExpiry > 300 && isValidKey;
  } catch (e) {
    console.log('[Debug] Token parsing failed:', e);
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: { sessionId: string } }
) {
  console.log('[Debug] Entering session-info route');

  const { sessionId } = await context.params;
  console.log('[Debug] sessionId:', sessionId);

  // Authenticate
  const sess = await getServerSession(authOptions);
  if (!sess?.user?.id) {
    console.log('[Debug] Unauthenticated');
    return NextResponse.json({ error: 'Unautorizat.' }, { status: 401 });
  }
  const currentUserId = sess.user.id;
  console.log('[Debug] currentUserId:', currentUserId);

  // Find active session record
  const now = new Date();
  console.log('[Debug] now:', now.toISOString());
  const record = await prisma.consultingSession.findFirst({
    where: {
      id: sessionId,
      // Optional: Add time-based validation
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
  console.log('[Debug] record fetched:', record);
  if (!record) {
    console.log('[Debug] No active session');
    return NextResponse.json({ error: 'Nicio sesiune activă.' }, { status: 404 });
  }

  // Get provider's user ID
  const providerRelation = await prisma.provider.findUnique({
    where: { id: record.providerId },
    select: { userId: true }
  });
  console.log('[Debug] providerRelation:', providerRelation);
  if (!providerRelation) {
    console.log('[Debug] Missing provider relation');
    return NextResponse.json(
      { error: 'Provider data missing.' },
      { status: 500 }
    );
  }

  // Authorization - check if current user is either the provider or the client
  const isProvider = providerRelation.userId === currentUserId;
  const isClient = record.clientId === currentUserId;
  
  console.log('[Debug] isProvider:', isProvider, 'isClient:', isClient);
  console.log('[Debug] providerUserId:', providerRelation.userId, 'clientId:', record.clientId);

  if (!isProvider && !isClient) {
    console.log('[Debug] Unauthorized user');
    return NextResponse.json(
      { error: 'Nu faci parte din această sesiune.' },
      { status: 403 }
    );
  }

  // Validate required environment variables
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    console.log('[Debug] Missing Zoom SDK environment variables');
    return NextResponse.json(
      { error: 'Zoom SDK configuration missing.' },
      { status: 500 }
    );
  }

  // Extract and validate tokensMap from DB (existing tokens)
  console.log('[Debug] raw zoomTokens:', record.zoomTokens);
  let tokensMap: Record<string, string> = {};
  if (record.zoomTokens && typeof record.zoomTokens === 'object') {
    tokensMap = record.zoomTokens as Record<string, string>;
  }
  console.log('[Debug] existing tokensMap:', tokensMap);

  // Determine the correct token key for the current user
  let tokenKey: string;
  if (isProvider) {
    tokenKey = record.providerId;
  } else {
    tokenKey = currentUserId; // client ID
  }

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
      reason: existingToken ? 'Token expired or invalid SDK key' : 'No existing token'
    });
    
    // Generate new token with current SDK credentials
    token = generateZoomToken(record.zoomSessionName!, tokenKey);
    
    // Update the tokens map
    tokensMap[tokenKey] = token;
    needsUpdate = true;

    // Force regenerate all tokens if SDK key changed
    if (existingToken) {
      try {
        const oldPayload = JSON.parse(atob(existingToken.split('.')[1]));
        if (oldPayload.app_key !== process.env.ZOOM_SDK_KEY) {
          console.log('[Debug] SDK key changed, regenerating all tokens');
          // Clear all old tokens and regenerate
          tokensMap = {};
          tokensMap[tokenKey] = token;
          
          // If the other user's token exists, mark it for regeneration too
          // (they'll get a new token when they connect)
        }
      } catch (e) {
        console.log('[Debug] Could not parse old token');
      }
    }
  }

  // Update database with new token if needed
  if (needsUpdate) {
    try {
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { zoomTokens: tokensMap }
      });
      console.log('[Debug] Updated tokens in database for session:', sessionId);
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
  
  console.log('[Debug] providerUser:', providerUser, 'clientUser:', clientUser);
  if (!providerUser || !clientUser) {
    console.log('[Debug] Missing user data for provider or client');
    return NextResponse.json(
      { error: 'User data missing.' },
      { status: 500 }
    );
  }

  // Build and return response
  const response: SessionInfo = {
    sessionName: record.zoomSessionName!,
    token,
    userId:      currentUserId,
    startDate:   record.startDate!.toISOString(),
    endDate:     record.endDate!.toISOString(),
    provider:    { id: providerUser.id, name: providerUser.name! },
    client:      { id: clientUser.id, name: clientUser.name! },
  };
  console.log('[Debug] response:', response);

  // Log token info for debugging
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    console.log('[Debug] Final token info:', {
      issuedAt: new Date(tokenPayload.iat * 1000).toISOString(),
      expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
      minutesUntilExpiry: Math.round((tokenPayload.exp - Math.floor(Date.now() / 1000)) / 60),
      app_key: tokenPayload.app_key,
      user_identity: tokenPayload.user_identity,
      tpc: tokenPayload.tpc
    });
  } catch (e) {
    console.log('[Debug] Could not parse final token for logging');
  }

  return NextResponse.json(response);
}