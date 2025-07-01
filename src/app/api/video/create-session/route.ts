export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import KJUR from 'jsrsasign'; // npm install jsrsasign @types/jsrsasign
import { v4 as uuidv4 } from 'uuid';

interface ZoomSessionResponse {
  session_id: string;
  session_number: number;
  session_name: string;
  created_at: string;
  settings: {
    auto_recording: string;
  };
}

// ✅ Generare JWT pentru API requests (server-to-server)
function generateZoomApiToken(): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 ore
  
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    iss: process.env.ZOOM_API_PUBLIC!,  // API Key
    iat: iat,
    exp: exp
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET!);
}

// ✅ Generare JWT COMPLET pentru client authentication
function generateClientToken(sessionName: string, userId: string, roleType: number = 0): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 ore
  
  // Header oficial
  const oHeader = { 
    alg: 'HS256', 
    typ: 'JWT' 
  };
  
  // ✅ Payload COMPLET cu toate câmpurile obligatorii
  const oPayload = {
    iss: process.env.ZOOM_API_PUBLIC!,           // API Key (issuer)
    exp: exp,                                    // Expires at
    iat: iat,                                    // ✅ OBLIGATORIU - Issued at  
    aud: 'zoom',                                 // ✅ OBLIGATORIU - Audience
    appKey: process.env.ZOOM_API_PUBLIC!,        // ✅ OBLIGATORIU - App Key (același ca iss)
    tokenExp: exp,                               // ✅ OBLIGATORIU - Token expiration
    tpc: sessionName,                            // Topic/Session name
    role_type: roleType,                         // 0 = participant, 1 = host
    user_identity: userId,                       // User identifier
    session_key: '',                             // Session password (opțional)
    
    // Câmpuri suplimentare pentru compatibilitate
    version: 1,                                  // Version
    geo_regions: 'US',                           // Geographic regions
  };

  console.log('[Debug] Complete JWT payload generation:', {
    method: 'jsrsasign',
    apiKey: process.env.ZOOM_API_PUBLIC?.substring(0, 10) + '...',
    timing: {
      iat: new Date(iat * 1000).toISOString(),
      exp: new Date(exp * 1000).toISOString(),
      tokenExp: new Date(oPayload.tokenExp * 1000).toISOString(),
      durationMinutes: (exp - iat) / 60
    },
    sessionName,
    userId,
    roleType,
    payloadKeys: Object.keys(oPayload)
  });

  try {
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    
    // Generare JWT cu metoda oficială
    const token = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET!);
    
    console.log('[Debug] Complete token generated successfully');
    
    // Debug token structure
    try {
      const decodedPayload = JSON.parse(atob(token.split('.')[1]));
      console.log('[Debug] Generated token verification:', {
        hasIat: !!decodedPayload.iat,
        hasAud: !!decodedPayload.aud,
        hasAppKey: !!decodedPayload.appKey,
        hasTokenExp: !!decodedPayload.tokenExp,
        roleType: decodedPayload.role_type,
        allFields: Object.keys(decodedPayload)
      });
    } catch (e) {
      console.warn('[Debug] Could not verify generated token structure');
    }
    
    return token;
  } catch (error) {
    console.error('[Debug] Complete token generation failed:', error);
    throw new Error('Failed to generate complete token');
  }
}

// ✅ Creează sesiune prin API-ul Zoom
async function createZoomSession(sessionName: string): Promise<ZoomSessionResponse> {
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

    const sessionData: ZoomSessionResponse = await response.json();
    
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

export async function POST(req: Request) {
  console.log('[Debug] ========== Creating new consulting session with complete JWT ==========');

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

    // Verifică credentialele Zoom
    if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
      console.error('[Debug] Missing Zoom API credentials');
      return NextResponse.json(
        { error: 'Zoom API configuration missing' },
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

    // 1. ✅ Generează un nume unic și creează sesiunea prin API-ul Zoom
    const sessionName = `session-${uuidv4()}`;
    console.log('[Debug] Creating Zoom session with name:', sessionName);
    
    const zoomSession = await createZoomSession(sessionName);

    // 2. ✅ Generează token-uri per user cu payload complet
    const tokens: Record<string, string> = {};
    
    for (const userId of users) {
      // Determină rolul: provider = host (1), client = participant (0)
      const roleType = (userId === providerId) ? 1 : 0;
      
      console.log('[Debug] Generating complete token for user:', {
        userId,
        roleType,
        isProvider: userId === providerId,
        sessionName: zoomSession.session_name
      });
      
      tokens[userId] = generateClientToken(zoomSession.session_name, userId, roleType);
    }

    // 3. ✅ Salvează sesiunea în baza de date
    const consultingSession = await prisma.consultingSession.create({
      data: {
        providerId,
        clientId,
        specialityId,
        packageId,
        zoomSessionName: zoomSession.session_name,   // Session name oficial
        zoomSessionId: zoomSession.session_id,       // Session ID de la Zoom
        zoomTokens: tokens,                          // Token-urile generate
        zoomCreatedAt: new Date(zoomSession.created_at),
        // Adaugă alte câmpuri dacă sunt necesare
        startDate: new Date(), // sau calculează bazat pe input
        endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 oră mai târziu
      }
    });

    console.log('[Debug] Consulting session created in database:', {
      sessionId: consultingSession.id,
      zoomSessionName: consultingSession.zoomSessionName,
      zoomSessionId: consultingSession.zoomSessionId,
      tokensGenerated: Object.keys(tokens).length
    });

    // 4. ✅ Răspunde cu informațiile complete
    const response = {
      // Informații pentru client
      sessionId: consultingSession.id,           // ID-ul din baza de date
      sessionName: zoomSession.session_name,     // Session name oficial Zoom
      tokens,                                    // Token-urile per user
      
      // Informații suplimentare
      zoomSessionId: zoomSession.session_id,     // Session ID de la Zoom
      zoomSessionNumber: zoomSession.session_number,
      createdAt: zoomSession.created_at,
      
      // Debugging info
      debug: process.env.NODE_ENV === 'development' ? {
        apiUsed: 'https://api.zoom.us/v2/videosdk/sessions',
        method: 'official_zoom_jsrsasign_complete_payload',
        credentialsUsed: 'ZOOM_API_PUBLIC/SECRET',
        tokensWithCompletePayload: true
      } : undefined
    };

    console.log('[Debug] ========== Session creation completed successfully ==========');
    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
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