// app/api/video/create-session/route.js
// ✅ IMPLEMENTARE CORECTĂ CU VIDEO SDK

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import KJUR from 'jsrsasign';
import { v4 as uuidv4 } from 'uuid';

// ✅ IMPORT FUNCȚIA CORECTĂ DE GENERARE TOKEN
const { generateVideoSDKToken, isVideoSDKTokenValid } = require('../../../../lib/video-sdk-utils');

// ✅ GENERARE JWT PENTRU API REQUESTS (folosește Meeting SDK credentials)
function generateZoomApiToken() {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    iss: process.env.ZOOM_API_PUBLIC,  // ✅ Pentru API calls folosim Meeting SDK
    iat: iat,
    exp: exp
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET);
}

// ✅ CREEAZĂ SESIUNE PRIN API-UL ZOOM (folosește Meeting SDK pentru API calls)
async function createZoomSession(sessionName) {
  const apiToken = generateZoomApiToken();
  
  console.log('[Debug] Creating Zoom session via API:', {
    sessionName,
    apiEndpoint: 'https://api.zoom.us/v2/videosdk/sessions'
  });

  try {
    const response = await fetch('https://api.zoom.us/v2/videosdk/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_name: sessionName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Debug] Zoom API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    }

    const sessionData = await response.json();
    
    console.log('[Debug] Zoom session created successfully:', {
      sessionId: sessionData.session_id,
      sessionNumber: sessionData.session_number,
      sessionName: sessionData.session_name
    });

    return sessionData;
  } catch (error) {
    console.error('[Debug] Failed to create Zoom session:', error);
    throw error;
  }
}

export async function POST(req) {
  console.log('[Debug] ========== Creating consulting session with CORRECT Video SDK tokens ==========');

  try {
    const { users, providerId, clientId, specialityId, packageId } = await req.json();

    // Validări de bază
    if (!Array.isArray(users) || users.length !== 2) {
      return NextResponse.json(
        { error: 'Trebuie să specifici exact 2 user IDs.' },
        { status: 400 }
      );
    }
    if (!providerId || !clientId || !specialityId) {
      return NextResponse.json(
        { error: 'Lipsește providerId, clientId sau specialityId.' },
        { status: 400 }
      );
    }

    // ✅ VERIFICĂ AMBELE TIPURI DE CREDENȚIALE
    if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
      console.error('[Debug] Missing Zoom API credentials (for session creation)');
      return NextResponse.json(
        { error: 'Zoom API configuration missing' },
        { status: 500 }
      );
    }

    if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
      console.error('[Debug] Missing Zoom Video SDK credentials (for client tokens)');
      return NextResponse.json(
        { error: 'Zoom Video SDK configuration missing' },
        { status: 500 }
      );
    }

    console.log('[Debug] Session creation parameters:', {
      users,
      providerId,
      clientId,
      specialityId,
      packageId
    });

    // 1. ✅ CREEAZĂ SESIUNEA PRIN API (folosește Meeting SDK credentials)
    const sessionName = `session-${uuidv4()}`;
    console.log('[Debug] Creating Zoom session with name:', sessionName);
    
    const zoomSession = await createZoomSession(sessionName);

    // 2. ✅ GENEREAZĂ TOKEN-URI VIDEO SDK CORECTE
    const tokens = {};
    
    for (const userId of users) {
      // Determină rolul: provider = host (1), client = participant (0)
      const roleType = (userId === providerId) ? 1 : 0;
      
      console.log('[Debug] Generating CORRECT Video SDK token for user:', {
        userId,
        roleType,
        isProvider: userId === providerId,
        sessionName: zoomSession.session_name
      });
      
      // ✅ FOLOSEȘTE FUNCȚIA CORECTĂ CU VIDEO SDK CREDENTIALS
      tokens[userId] = generateVideoSDKToken(
        zoomSession.session_name,  // session name
        userId,                    // user ID
        roleType,                  // role (0 = participant, 1 = host)
        ''                         // session password (opțional)
      );
    }

    // 3. ✅ SALVEAZĂ SESIUNEA ÎN BAZA DE DATE
    const consultingSession = await prisma.consultingSession.create({
      data: {
        providerId,
        clientId,
        specialityId,
        packageId,
        zoomSessionName: zoomSession.session_name,
        zoomSessionId: zoomSession.session_id,
        zoomTokens: tokens,
        zoomCreatedAt: new Date(zoomSession.created_at),
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 oră
      }
    });

    console.log('[Debug] Consulting session created in database:', {
      sessionId: consultingSession.id,
      zoomSessionName: consultingSession.zoomSessionName,
      zoomSessionId: consultingSession.zoomSessionId,
      tokensGenerated: Object.keys(tokens).length
    });

    // 4. ✅ RĂSPUNDE CU INFORMAȚIILE COMPLETE
    const response = {
      sessionId: consultingSession.id,
      sessionName: zoomSession.session_name,
      tokens,
      zoomSessionId: zoomSession.session_id,
      zoomSessionNumber: zoomSession.session_number,
      createdAt: zoomSession.created_at,
      
      // Debug info
      debug: process.env.NODE_ENV === 'development' ? {
        credentialsUsed: {
          apiCalls: 'ZOOM_API_PUBLIC/SECRET (Meeting SDK)',
          clientTokens: 'ZOOM_SDK_KEY/SECRET (Video SDK)'
        },
        tokenFormat: 'Video SDK with app_key, tpc, role_type, version',
        tokensWithCorrectPayload: true
      } : undefined
    };

    console.log('[Debug] ========== Session creation completed successfully ==========');
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Debug] Session creation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}