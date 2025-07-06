// app/api/video/create-session/route.ts
// ✅ IMPLEMENTARE CORECTATĂ CU IMPORT-URI CORECTE

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// ✅ IMPORT CORECT DIN IMPLEMENTAREA TA REALĂ
import {
  createZoomSession,
  generateClientToken,
  validateZoomCredentials
} from '../../../../lib/zoomVideoSDK';

export async function POST(req: NextRequest) {
  console.log('[CreateSession] ========== Creating session with CORRECT implementation ==========');

  try {
    // ✅ VERIFICĂ AUTENTIFICAREA
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ✅ PARSEAZĂ REQUEST BODY
    const body = await req.json();
    const { users, providerId, clientId, specialityId, packageId } = body;

    console.log('[CreateSession] Request parameters:', {
      users,
      providerId,
      clientId,
      specialityId,
      packageId
    });

    // ✅ VALIDĂRI DE BAZĂ
    if (!Array.isArray(users) || users.length < 2) {
      return NextResponse.json(
        { error: 'users must be an array with at least 2 user IDs' },
        { status: 400 }
      );
    }

    if (!providerId || !clientId || !specialityId) {
      return NextResponse.json(
        { error: 'providerId, clientId, and specialityId are required' },
        { status: 400 }
      );
    }

    if (!users.includes(providerId) || !users.includes(clientId)) {
      return NextResponse.json(
        { error: 'providerId and clientId must be included in users array' },
        { status: 400 }
      );
    }

    // ✅ VERIFICĂ CREDENȚIALELE ZOOM
    const credentialsValidation = validateZoomCredentials();
    if (!credentialsValidation.allValid) {
      console.error('[CreateSession] Invalid Zoom credentials:', credentialsValidation);
      return NextResponse.json({
        error: 'Zoom credentials configuration error',
        details: process.env.NODE_ENV === 'development' ? credentialsValidation : undefined
      }, { status: 500 });
    }

    // ✅ GENEREAZĂ NUME SESIUNE UNIC
    const sessionName = `consultation-${uuidv4().substring(0, 8)}`;
    console.log('[CreateSession] Generated session name:', sessionName);

    // ✅ CREEAZĂ SESIUNEA ZOOM PRIN API
    let zoomSession;
    try {
      zoomSession = await createZoomSession(sessionName);
      console.log('[CreateSession] Zoom session created:', {
        sessionId: zoomSession.session_id,
        sessionName: zoomSession.session_name
      });
    } catch (zoomError: any) {
      console.error('[CreateSession] Zoom session creation failed:', zoomError);
      return NextResponse.json({
        error: 'Failed to create Zoom session',
        details: process.env.NODE_ENV === 'development' ? zoomError.message : undefined
      }, { status: 500 });
    }

    // ✅ GENEREAZĂ TOKEN-URI PENTRU TOȚI UTILIZATORII
    const tokens: Record<string, string> = {};
    try {
      for (const userId of users) {
        const roleType = userId === providerId ? 1 : 0; // Provider = host, rest = participants
        
        console.log('[CreateSession] Generating token for user:', {
          userId,
          roleType: roleType === 1 ? 'host' : 'participant',
          sessionName: zoomSession.session_name
        });
        
        // ✅ FOLOSEȘTE FUNCȚIA CORECTĂ DIN IMPLEMENTAREA TA
        tokens[userId] = generateClientToken(
          zoomSession.session_name,
          String(userId), // Ensure string
          roleType
        );
      }
      
      console.log('[CreateSession] Generated tokens for users:', Object.keys(tokens));
    } catch (tokenError: any) {
      console.error('[CreateSession] Token generation failed:', tokenError);
      
      // Cleanup Zoom session if token generation fails
      // Note: You can add deleteZoomSession here if you implement it
      
      return NextResponse.json({
        error: 'Failed to generate user tokens',
        details: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      }, { status: 500 });
    }

    // ✅ SALVEAZĂ SESIUNEA ÎN BAZA DE DATE
    let consultingSession;
    try {
      consultingSession = await prisma.consultingSession.create({
        data: {
          providerId,
          clientId,
          specialityId,
          packageId: packageId || null,
          zoomSessionName: zoomSession.session_name,
          zoomSessionId: zoomSession.session_id,
          zoomTokens: tokens,
          zoomCreatedAt: new Date(zoomSession.created_at),
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          status: 'SCHEDULED'
        }
      });

      console.log('[CreateSession] Session saved to database:', {
        sessionId: consultingSession.id,
        zoomSessionName: consultingSession.zoomSessionName
      });
    } catch (dbError: any) {
      console.error('[CreateSession] Database save failed:', dbError);
      
      return NextResponse.json({
        error: 'Failed to save session to database',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }, { status: 500 });
    }

    // ✅ RĂSPUNS DE SUCCES
    const response = {
      success: true,
      sessionId: consultingSession.id,
      sessionName: zoomSession.session_name,
      zoomSessionId: zoomSession.session_id,
      zoomSessionNumber: zoomSession.session_number,
      tokens,
      createdAt: zoomSession.created_at,
      participants: users.map(userId => ({
        userId,
        role: userId === providerId ? 'host' : 'participant',
        hasToken: !!tokens[userId]
      })),
      
      // Debug info pentru development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          implementation: 'CORRECTED - using proper imports',
          credentialsUsed: {
            apiCalls: 'ZOOM_API_PUBLIC/SECRET (Meeting SDK)',
            clientTokens: 'ZOOM_SDK_KEY/SECRET (Video SDK)'
          },
          tokenFormat: 'Video SDK JWT cu app_key, tpc, role_type, version',
          allCredentialsValid: credentialsValidation.allValid
        }
      })
    };

    console.log('[CreateSession] ========== Session creation completed successfully ==========');
    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('[CreateSession] Unexpected error:', error);
    
    return NextResponse.json({
      error: 'Internal server error during session creation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}