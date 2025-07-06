// app/api/video/session-info/[sessionId]/route.ts
// ✅ VERSIUNEA COMPLETĂ CORECTATĂ - Ready for production

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ✅ IMPORT CORECT - verificat și functional
import {
  generateClientToken,
  isVideoSDKTokenValid,
  parseZoomToken
} from '@/lib/zoomVideoSDK';

interface SessionInfo {
  sessionId: string;
  sessionName: string;
  token: string;
  userId: string;
  userRole: 'provider' | 'client';
  roleType: number;
  startDate: string;
  endDate: string;
  status: string;
  provider: { id: string; name: string };
  client: { id: string; name: string };
  zoomSessionId: string;
  sessionKey?: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  console.log('[SessionInfo] ========== Starting session info request ==========');
  
  try {
    // ✅ GESTIONARE PARAMS CORECTĂ PENTRU NEXT.JS 15
    let sessionId: string;
    try {
      // În Next.js 15, params trebuie să fie awaited
      const params = await context.params;
      sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      console.log('[SessionInfo] Extracted sessionId:', sessionId);
    } catch (paramsError) {
      console.error('[SessionInfo] Error extracting params:', String(paramsError));
      return NextResponse.json(
        { 
          error: 'Invalid session parameters',
          details: process.env.NODE_ENV === 'development' ? String(paramsError) : undefined
        }, 
        { status: 400 }
      );
    }

    if (!sessionId || sessionId.trim() === '') {
      console.log('[SessionInfo] Missing or empty session ID');
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // ✅ VERIFICĂ IMPORTURILE ZOOM SDK
    console.log('[SessionInfo] Testing Zoom SDK imports...');
    try {
      // Test simplu pentru a verifica dacă funcțiile sunt disponibile
      if (typeof generateClientToken !== 'function') {
        throw new Error('generateClientToken is not a function');
      }
      if (typeof isVideoSDKTokenValid !== 'function') {
        throw new Error('isVideoSDKTokenValid is not a function');
      }
      if (typeof parseZoomToken !== 'function') {
        throw new Error('parseZoomToken is not a function');
      }
      console.log('[SessionInfo] ✅ Zoom SDK functions imported successfully');
    } catch (importError) {
      console.error('[SessionInfo] ❌ Zoom SDK import error:', String(importError));
      return NextResponse.json({
        error: 'Video SDK configuration error',
        details: process.env.NODE_ENV === 'development' ? String(importError) : 'SDK import failed'
      }, { status: 500 });
    }

    // ✅ VERIFICĂ VARIABILELE DE MEDIU
    console.log('[SessionInfo] Checking environment variables...');
    const requiredEnvVars = ['ZOOM_SDK_KEY', 'ZOOM_SDK_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error('[SessionInfo] Missing environment variables:', missingEnvVars);
      return NextResponse.json({
        error: 'Video SDK configuration incomplete',
        details: process.env.NODE_ENV === 'development' 
          ? `Missing env vars: ${missingEnvVars.join(', ')}` 
          : 'SDK configuration missing'
      }, { status: 500 });
    }
    console.log('[SessionInfo] ✅ Environment variables present');

    // ✅ VERIFICĂ AUTENTIFICAREA
    console.log('[SessionInfo] Checking authentication...');
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error('[SessionInfo] Authentication error:', String(authError));
      return NextResponse.json({
        error: 'Authentication service error',
        details: process.env.NODE_ENV === 'development' ? String(authError) : undefined
      }, { status: 500 });
    }

    if (!session?.user?.id) {
      console.log('[SessionInfo] Unauthenticated request');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const currentUserId = session.user.id;
    console.log('[SessionInfo] ✅ Authenticated user:', currentUserId);

    // ✅ VERIFICĂ CONEXIUNEA LA BAZA DE DATE
    console.log('[SessionInfo] Testing database connection...');
    try {
      await prisma.$connect();
      console.log('[SessionInfo] ✅ Database connected');
    } catch (dbError) {
      console.error('[SessionInfo] Database connection error:', String(dbError));
      return NextResponse.json({
        error: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
      }, { status: 500 });
    }

    // ✅ GĂSEȘTE SESIUNEA ÎN BAZA DE DATE
    console.log('[SessionInfo] Querying session from database...');
    let consultingSession;
    try {
      consultingSession = await prisma.consultingSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          providerId: true,
          clientId: true,
          zoomSessionName: true,
          zoomSessionId: true,
          zoomTokens: true,
          startDate: true,
          endDate: true,
          isFinished: true, // În loc de status, folosim isFinished
          duration: true,
          scheduledAt: true,
          provider: {
            select: {
              id: true,
              userId: true,
              user: {
                select: { id: true, name: true }
              }
            }
          },
          client: {
            select: { id: true, name: true }
            }
          }
        });
      console.log('[SessionInfo] ✅ Database query completed');
    } catch (dbQueryError) {
      console.error('[SessionInfo] Database query error:', String(dbQueryError));
      return NextResponse.json({
        error: 'Database query failed',
        details: process.env.NODE_ENV === 'development' ? String(dbQueryError) : undefined
      }, { status: 500 });
    }

    if (!consultingSession) {
      console.log('[SessionInfo] Session not found:', sessionId);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!consultingSession.zoomSessionName) {
      console.log('[SessionInfo] Session exists but no Zoom session name');
      return NextResponse.json({ 
        error: 'Video session not initialized',
        details: 'Zoom session has not been created yet'
      }, { status: 400 });
    }

    // ✅ VERIFICĂ AUTORIZAREA UTILIZATORULUI
    const providerUserId = consultingSession.provider?.userId;
    const clientUserId = consultingSession.clientId;
    
    if (!providerUserId || !clientUserId) {
      console.error('[SessionInfo] Invalid session data - missing user IDs');
      return NextResponse.json({ 
        error: 'Invalid session data',
        details: 'Session missing required user information'
      }, { status: 500 });
    }
    
    const isProvider = providerUserId === currentUserId;
    const isClient = clientUserId === currentUserId;
    
    console.log('[SessionInfo] User authorization check:', {
      currentUserId,
      providerUserId,
      clientUserId,
      isProvider,
      isClient
    });

    if (!isProvider && !isClient) {
      console.log('[SessionInfo] User not authorized for this session');
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'You are not authorized to access this session'
      }, { status: 403 });
    }

    // ✅ DETERMINĂ ROLUL ȘI TOKEN KEY
    const userRole = isProvider ? 'provider' : 'client';
    const roleType = isProvider ? 1 : 0; // 1 = host, 0 = participant
    const tokenKey = currentUserId;

    console.log('[SessionInfo] User role determined:', {
      userRole,
      roleType,
      tokenKey
    });

    // ✅ GESTIONARE TOKEN-URI
    let tokensMap: Record<string, string> = {};
    if (consultingSession.zoomTokens && typeof consultingSession.zoomTokens === 'object') {
      tokensMap = consultingSession.zoomTokens as Record<string, string>;
    }

    const existingToken = tokensMap[tokenKey];
    let token: string | null = null;
    let tokenGenerated = false;

    // ✅ VERIFICĂ TOKEN-UL EXISTENT
    if (existingToken) {
      console.log('[SessionInfo] Found existing token, validating...');
      try {
        if (isVideoSDKTokenValid(existingToken)) {
          console.log('[SessionInfo] ✅ Using existing valid token');
          token = existingToken;
          
          // Debug token existent
          const tokenInfo = parseZoomToken(existingToken);
          if (tokenInfo) {
            console.log('[SessionInfo] Existing token info:', {
              expiresInMinutes: tokenInfo.expiresInMinutes,
              roleType: tokenInfo.roleType,
              sessionName: tokenInfo.sessionName,
              hasAllRequiredFields: tokenInfo.hasAllRequiredFields
            });
          }
        } else {
          console.log('[SessionInfo] Existing token is invalid/expired');
        }
      } catch (tokenValidationError) {
        console.error('[SessionInfo] Token validation error:', String(tokenValidationError));
        // Continue to generate new token
      }
    }

    // ✅ GENEREAZĂ TOKEN NOU DACĂ E NECESAR
    if (!token) {
      console.log('[SessionInfo] Generating new token:', {
        reason: existingToken ? 'Token expired or invalid' : 'No existing token',
        tokenKey,
        roleType,
        sessionName: consultingSession.zoomSessionName
      });
      
      try {
        token = generateClientToken(
          consultingSession.zoomSessionName,
          String(tokenKey),
          roleType
        );

        if (!token) {
          throw new Error('Generated token is null or empty');
        }

        // Actualizează token-ul în baza de date
        tokensMap[tokenKey] = token;
        tokenGenerated = true;

        await prisma.consultingSession.update({
          where: { id: sessionId },
          data: { zoomTokens: tokensMap }
        });

        console.log('[SessionInfo] ✅ Generated and saved new token');
        
        // Debug token nou generat
        const newTokenInfo = parseZoomToken(token);
        if (newTokenInfo) {
          console.log('[SessionInfo] New token info:', {
            hasAllRequiredFields: newTokenInfo.hasAllRequiredFields,
            expiresInMinutes: newTokenInfo.expiresInMinutes,
            roleType: newTokenInfo.roleType
          });
        }
      } catch (tokenError: any) {
        console.error('[SessionInfo] Failed to generate token:', String(tokenError));
        return NextResponse.json({
          error: 'Failed to generate session token',
          details: process.env.NODE_ENV === 'development' ? String(tokenError) : undefined
        }, { status: 500 });
      }
    }

    if (!token) {
      console.error('[SessionInfo] No valid token available');
      return NextResponse.json({
        error: 'Unable to create session token',
        details: 'Token generation failed'
      }, { status: 500 });
    }

    // ✅ CONSTRUIEȘTE RĂSPUNSUL
    const response: SessionInfo = {
      sessionId: consultingSession.id,
      sessionName: consultingSession.zoomSessionName,
      token: token,
      userId: currentUserId,
      userRole,
      roleType,
      startDate: consultingSession.startDate?.toISOString() || '',
      endDate: consultingSession.endDate?.toISOString() || '',
      status: consultingSession.isFinished ? 'COMPLETED' : 'SCHEDULED', // Convertim isFinished la status
      
      // Informații despre participanți
      provider: {
        id: consultingSession.provider.user.id,
        name: consultingSession.provider.user.name || ''
      },
      client: {
        id: consultingSession.client.id,
        name: consultingSession.client.name || ''
      },

      // Info sesiune Zoom
      zoomSessionId: consultingSession.zoomSessionId || '',
      sessionKey: '', // Nu folosim parole
    };

    // ✅ ADD DEBUG INFO IN DEVELOPMENT
    if (process.env.NODE_ENV === 'development') {
      (response as any).debug = {
        implementation: 'CORRECTED - fixed Prisma schema fields',
        tokenGenerated,
        tokenInfo: parseZoomToken(token),
        credentialsUsed: 'ZOOM_SDK_KEY/SECRET for client tokens',
        sessionDetails: {
          zoomSessionName: consultingSession.zoomSessionName,
          zoomSessionId: consultingSession.zoomSessionId,
          hasStoredTokens: Object.keys(tokensMap).length,
          storedTokenUsers: Object.keys(tokensMap),
          isFinished: consultingSession.isFinished,
          duration: consultingSession.duration,
          scheduledAt: consultingSession.scheduledAt?.toISOString()
        }
      };
    }

    console.log('[SessionInfo] ✅ Session info prepared successfully:', {
      sessionId,
      userId: currentUserId,
      userRole,
      hasToken: !!token,
      tokenGenerated
    });

    console.log('[SessionInfo] ========== Session info request completed successfully ==========');
    return NextResponse.json(response);

  } catch (error: any) {
    // ✅ SAFE ERROR LOGGING - evită problemele cu null/undefined serialization
    console.error('[SessionInfo] ❌ Unexpected error:');
    console.error('Message:', error?.message || 'Unknown message');
    console.error('Name:', error?.name || 'Unknown error type');
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
    
    // ✅ ALWAYS RETURN VALID JSON
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message || 'Unknown error',
        type: error?.constructor?.name || 'Error',
        timestamp: new Date().toISOString()
      } : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}