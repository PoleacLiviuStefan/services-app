// app/api/video/session-info/[sessionId]/route.js
// ✅ IMPLEMENTARE CORECTĂ CU VIDEO SDK

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ✅ IMPORT FUNCȚIA CORECTĂ DE GENERARE TOKEN
const { generateVideoSDKToken, isVideoSDKTokenValid } = require('../../../../../lib/video-sdk-utils');

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

export async function GET(
  _req: NextRequest,
  context: { params: { sessionId: string } }
) {
  console.log('[Debug] ========== Getting CORRECT Video SDK session info ==========');

  const { sessionId } = await context.params;
  console.log('[Debug] Processing session ID:', sessionId);

  // ✅ VERIFICĂ VIDEO SDK CREDENTIALS (pentru token-uri client)
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    console.error('[Debug] Missing Zoom Video SDK credentials');
    return NextResponse.json({ 
      error: 'Zoom Video SDK configuration missing',
      details: 'Ensure ZOOM_SDK_KEY and ZOOM_SDK_SECRET are set with Video SDK credentials'
    }, { status: 500 });
  }

  console.log('[Debug] Using CORRECT Zoom Video SDK credentials:', {
    hasSDKKey: !!process.env.ZOOM_SDK_KEY,
    hasSDKSecret: !!process.env.ZOOM_SDK_SECRET,
    sdkKeyPrefix: process.env.ZOOM_SDK_KEY?.substring(0, 10) + '...',
    credentialType: 'Video SDK (app_key/app_secret) - CORRECT'
  });

  // Autentificare utilizator
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('[Debug] Unauthenticated request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = session.user.id;
  console.log('[Debug] Authenticated user:', currentUserId);

  // Găsește sesiunea de consultanță
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

  // Obține ID-ul utilizatorului provider
  const providerRelation = await prisma.provider.findUnique({
    where: { id: record.providerId },
    select: { userId: true }
  });
  
  if (!providerRelation) {
    console.error('[Debug] Provider relation not found');
    return NextResponse.json({ error: 'Provider data missing' }, { status: 500 });
  }

  // Verifică autorizarea
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

  // Determină rolul și cheia token-ului
  let tokenKey: string;
  let roleType: number;
  
  if (isProvider) {
    tokenKey = record.providerId;
    roleType = 1; // Host pentru provider
  } else {
    tokenKey = currentUserId; // client ID
    roleType = 0; // Participant pentru client
  }

  console.log('[Debug] CORRECT Video SDK Token parameters:', {
    tokenKey,
    roleType: roleType === 1 ? 'host' : 'participant',
    sessionName: record.zoomSessionName,
    userType: isProvider ? 'provider' : 'client'
  });

  // ✅ VERIFICĂ TOKEN-UL EXISTENT SAU GENEREAZĂ UNO NOU
  let tokensMap: Record<string, string> = {};
  if (record.zoomTokens && typeof record.zoomTokens === 'object') {
    tokensMap = record.zoomTokens as Record<string, string>;
  }

  const existingToken = tokensMap[tokenKey];
  let token: string;
  let needsUpdate = false;

  // Verifică dacă token-ul existent este valid
  if (existingToken && isVideoSDKTokenValid(existingToken)) {
    console.log('[Debug] Using existing valid Video SDK token for user:', tokenKey);
    token = existingToken;
    
    // Debug token-ul existent
    try {
      const tokenPayload = JSON.parse(atob(existingToken.split('.')[1]));
      console.log('[Debug] Existing token verification:', {
        hasAppKey: !!tokenPayload.app_key,
        hasTpc: !!tokenPayload.tpc,
        hasRoleType: tokenPayload.role_type !== undefined,
        hasVersion: !!tokenPayload.version,  // ✅ Verifică version
        expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
        minutesLeft: Math.round((tokenPayload.exp - Date.now()/1000) / 60)
      });
    } catch (e) {
      console.warn('[Debug] Could not parse existing token');
    }
  } else {
    console.log('[Debug] Generating NEW CORRECT Video SDK token for user:', tokenKey, {
      hasExistingToken: !!existingToken,
      existingTokenValid: existingToken ? isVideoSDKTokenValid(existingToken) : false,
      reason: existingToken ? 'Token expired or invalid format' : 'No existing token'
    });
    
    // ✅ GENEREAZĂ TOKEN VIDEO SDK CORECT
    token = generateVideoSDKToken(
      record.zoomSessionName,  // session name
      tokenKey,                // user ID  
      roleType,                // role (0 = participant, 1 = host)
      ''                       // session password (opțional)
    );
    
    // Actualizează map-ul de token-uri
    tokensMap[tokenKey] = token;
    needsUpdate = true;
  }

  // Actualizează baza de date dacă e necesar
  if (needsUpdate) {
    try {
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { zoomTokens: tokensMap }
      });
      console.log('[Debug] Updated CORRECT Video SDK tokens in database');
    } catch (updateError) {
      console.error('[Debug] Failed to update tokens in database:', updateError);
    }
  }

  // Obține datele utilizatorilor
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

  // Construiește răspunsul
  const response: SessionInfo = {
    sessionName: record.zoomSessionName,  // Video SDK session name
    token,                                // ✅ CORRECT Video SDK JWT token
    userId: currentUserId,
    startDate: record.startDate!.toISOString(),
    endDate: record.endDate!.toISOString(),
    provider: { id: providerUser.id, name: providerUser.name! },
    client: { id: clientUser.id, name: clientUser.name! },
    sessionKey: ''
  };

  // ✅ LOG FINAL PENTRU VERIFICARE
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    console.log('[Debug] Final CORRECT Video SDK token details:', {
      app_key: tokenPayload.app_key?.substring(0, 10) + '...',
      tpc: tokenPayload.tpc,
      role_type: tokenPayload.role_type,
      version: tokenPayload.version,        // ✅ Version field
      user_identity: tokenPayload.user_identity,
      expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
      tokenType: 'Video SDK JWT - CORRECT FORMAT',
      hasAllRequiredFields: !!(
        tokenPayload.app_key && 
        tokenPayload.tpc && 
        tokenPayload.role_type !== undefined &&
        tokenPayload.version &&  // ✅ Include version
        tokenPayload.iat && 
        tokenPayload.exp
      )
    });
  } catch (e) {
    console.warn('[Debug] Could not parse final token for logging');
  }

  console.log('[Debug] ========== CORRECT Video SDK Session Info Request Completed ==========');
  return NextResponse.json(response);
}