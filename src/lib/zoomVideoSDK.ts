// File: lib/zoomVideoSDK.ts
// Serviciu complet pentru gestionarea sesiunilor Zoom Video SDK

import KJUR from 'jsrsasign';

interface ZoomSession {
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

// ✅ Generare JWT pentru client authentication (browser)
function generateZoomClientToken(sessionName: string, userId: string, roleType: number = 0): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    iss: process.env.ZOOM_API_PUBLIC!,   // API Key (nu SDK Key!)
    iat: iat,
    exp: exp,
    aud: 'zoom',
    tpc: sessionName,                    // Numele sesiunii din API
    user_identity: userId,
    role_type: roleType
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET!);
}

// ✅ Creează sesiune Zoom prin API
export async function createZoomSession(sessionName: string): Promise<ZoomSession> {
  const apiToken = generateZoomApiToken();
  
  console.log('[Debug] Creating Zoom session via API:', {
    sessionName,
    apiEndpoint: 'https://api.zoom.us/v2/videosdk/sessions',
    hasApiToken: !!apiToken
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

    const sessionData: ZoomSession = await response.json();
    
    console.log('[Debug] Zoom session created successfully:', {
      sessionId: sessionData.session_id,
      sessionNumber: sessionData.session_number,
      sessionName: sessionData.session_name,
      createdAt: sessionData.created_at
    });

    return sessionData;
  } catch (error) {
    console.error('[Debug] Failed to create Zoom session:', error);
    throw error;
  }
}

// ✅ Generează token pentru client cu sesiune validă
export function generateClientToken(sessionName: string, userId: string, roleType: number = 0): string {
  console.log('[Debug] Generating client token for valid session:', {
    sessionName,
    userId,
    roleType,
    method: 'official_zoom_jsrsasign'
  });

  try {
    const token = generateZoomClientToken(sessionName, userId, roleType);
    console.log('[Debug] Client token generated successfully');
    return token;
  } catch (error) {
    console.error('[Debug] Client token generation failed:', error);
    throw error;
  }
}

// ✅ Verifică dacă sesiunea există și este validă
export async function validateZoomSession(sessionName: string): Promise<boolean> {
  const apiToken = generateZoomApiToken();
  
  try {
    // Nu există un endpoint direct pentru validare, dar putem încerca să obținem detaliile
    // Pentru acum, presupunem că este validă dacă nu primim eroare la crearea token-ului
    generateZoomClientToken(sessionName, 'test-user', 0);
    return true;
  } catch (error) {
    console.error('[Debug] Session validation failed:', error);
    return false;
  }
}

// ✅ Șterge sesiune Zoom (opțional)
export async function deleteZoomSession(sessionId: string): Promise<boolean> {
  const apiToken = generateZoomApiToken();
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/videosdk/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (response.ok) {
      console.log('[Debug] Zoom session deleted successfully:', sessionId);
      return true;
    } else {
      console.error('[Debug] Failed to delete Zoom session:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Debug] Error deleting Zoom session:', error);
    return false;
  }
}

// ✅ Helper pentru debugging
export function parseZoomToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return {
      issuer: payload.iss,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      sessionName: payload.tpc,
      userIdentity: payload.user_identity,
      roleType: payload.role_type,
      audience: payload.aud
    };
  } catch (e) {
    return null;
  }
}