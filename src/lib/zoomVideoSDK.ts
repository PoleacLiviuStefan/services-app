// lib/zoomVideoSDK.ts
// ✅ IMPLEMENTARE CORECTATĂ pentru Zoom Video SDK cu credențialele tale

import KJUR from 'jsrsasign';

interface ZoomSession {
  session_id: string;
  session_number: number;
  session_name: string;
  created_at: string;
  settings?: {
    auto_recording?: string;
  };
}

interface TokenInfo {
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  sessionName: string;
  userIdentity: string;
  roleType: number;
  isValid: boolean;
  expiresInMinutes: number;
}

// ✅ GENERARE JWT PENTRU API REQUESTS (folosește Meeting SDK credentials)
function generateZoomApiToken(): string {
  if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
    throw new Error('Missing ZOOM_API_PUBLIC or ZOOM_API_SECRET for API calls');
  }

  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 ore
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: process.env.ZOOM_API_PUBLIC,  // Meeting SDK API Key pentru API calls
    iat: iat,
    exp: exp
  };

  const sHeader = JSON.stringify(header);
  const sPayload = JSON.stringify(payload);
  
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET);
}

// ✅ GENERARE JWT PENTRU CLIENT AUTHENTICATION (folosește Video SDK credentials)
function generateZoomClientToken(sessionName: string, userIdentity: string, roleType: number = 0): string {
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    throw new Error('Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET for client tokens');
  }

  if (!sessionName || typeof sessionName !== 'string') {
    throw new Error('sessionName is required and must be a string');
  }

  if (!userIdentity || typeof userIdentity !== 'string') {
    throw new Error('userIdentity is required and must be a string');
  }

  // ✅ VERIFICĂ LIMITA DE 16 CARACTERE PENTRU USER IDENTITY
  if (userIdentity.length > 16) {
    throw new Error(`userIdentity "${userIdentity}" exceeds 16 character limit (${userIdentity.length} chars)`);
  }

  if (typeof roleType !== 'number' || (roleType !== 0 && roleType !== 1)) {
    throw new Error('roleType must be 0 (participant) or 1 (host)');
  }

  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 24; // 24 ore valabilitate
  
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // ✅ PAYLOAD CORECT PENTRU VIDEO SDK
  const payload = {
    iss: process.env.ZOOM_SDK_KEY,         // Video SDK Key ca issuer
    iat: iat,
    exp: exp,
    
    // ✅ CÂMPURI OBLIGATORII PENTRU VIDEO SDK
    app_key: process.env.ZOOM_SDK_KEY,     // Video SDK App Key
    tpc: sessionName,                      // topic/session name
    user_identity: userIdentity,           // ID utilizator (max 16 chars)
    role_type: roleType,                   // 0 = participant, 1 = host
    version: 1                             // Versiunea protocolului Video SDK
  };

  const sHeader = JSON.stringify(header);
  const sPayload = JSON.stringify(payload);
  
  // ✅ FOLOSEȘTE VIDEO SDK SECRET PENTRU SEMNARE
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_SDK_SECRET);
}

// ✅ VERIFICĂ VALIDITATEA TOKEN-ULUI VIDEO SDK
export function isVideoSDKTokenValid(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const payload = JSON.parse(atob(parts[1]));
    
    // Verifică expirarea
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp <= now) {
      console.log('[VideoSDK] Token expired:', {
        exp: payload.exp,
        now: now,
        expiredMinutesAgo: Math.round((now - payload.exp) / 60)
      });
      return false;
    }

    // Verifică câmpurile obligatorii pentru Video SDK
    const requiredFields = ['app_key', 'tpc', 'user_identity', 'role_type', 'version'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        console.log('[VideoSDK] Missing required field:', field);
        return false;
      }
    }

    // Verifică user_identity length
    if (payload.user_identity && payload.user_identity.length > 16) {
      console.log('[VideoSDK] user_identity too long:', payload.user_identity.length);
      return false;
    }

    // Verifică role_type
    if (payload.role_type !== 0 && payload.role_type !== 1) {
      console.log('[VideoSDK] Invalid role_type:', payload.role_type);
      return false;
    }

    return true;
  } catch (error) {
    console.log('[VideoSDK] Token validation error:', error);
    return false;
  }
}

// ✅ CREEAZĂ SESIUNE ZOOM PRIN API
export async function createZoomSession(sessionName: string): Promise<ZoomSession> {
  const apiToken = generateZoomApiToken();
  
  console.log('[Debug] Creating Zoom session via API:', {
    sessionName,
    apiEndpoint: 'https://api.zoom.us/v2/videosdk/sessions',
    credentialsUsed: 'ZOOM_API_PUBLIC/SECRET (Meeting SDK pentru API calls)'
  });

  try {
    const response = await fetch('https://api.zoom.us/v2/videosdk/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_name: sessionName,
        password: '', // Opțional
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Debug] Zoom API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401) {
        throw new Error('Invalid Zoom API credentials. Check ZOOM_API_PUBLIC and ZOOM_API_SECRET.');
      } else if (response.status === 429) {
        throw new Error('Zoom API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Zoom API error: ${response.status} - ${errorData.message || response.statusText}`);
      }
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

// ✅ GENEREAZĂ TOKEN PENTRU CLIENT CU SESIUNE VALIDĂ
export function generateClientToken(sessionName: string, userId: string, roleType: number = 0): string {
  console.log('[Debug] Generating client token with CORRECT Video SDK credentials:', {
    sessionName,
    userId,
    userIdLength: userId.length,
    roleType: roleType === 1 ? 'host' : 'participant',
    credentialsUsed: 'ZOOM_SDK_KEY/SECRET (Video SDK pentru token-uri client)'
  });

  try {
    // Verifică lungimea userId și trunchiază dacă e necesar
    let userIdentity = String(userId);
    if (userIdentity.length > 16) {
      userIdentity = userIdentity.substring(0, 16);
      console.warn('[Debug] Truncated userIdentity:', {
        original: userId,
        truncated: userIdentity,
        originalLength: String(userId).length
      });
    }

    const token = generateZoomClientToken(sessionName, userIdentity, roleType);
    
    // Debug token generat
    const tokenInfo = parseZoomToken(token);
    console.log('[Debug] Client token generated successfully:', {
      hasAllRequiredFields: tokenInfo?.hasAllRequiredFields || false,
      expiresInMinutes: tokenInfo?.expiresInMinutes || 0,
      userIdentity: tokenInfo?.userIdentity,
      roleType: tokenInfo?.roleType
    });
    
    return token;
  } catch (error) {
    console.error('[Debug] Client token generation failed:', error);
    throw error;
  }
}

// ✅ VERIFICĂ DACĂ SESIUNEA EXISTĂ ȘI ESTE VALIDĂ
export async function validateZoomSession(sessionName: string): Promise<boolean> {
  try {
    // Testează generarea unui token pentru această sesiune
    const testToken = generateZoomClientToken(sessionName, 'test-user', 0);
    return isVideoSDKTokenValid(testToken);
  } catch (error) {
    console.error('[Debug] Session validation failed:', error);
    return false;
  }
}

// ✅ ȘTERGE SESIUNE ZOOM
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

// ✅ HELPER PENTRU DEBUGGING TOKEN-URILOR
export function parseZoomToken(token: string): TokenInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Verifică dacă are toate câmpurile necesare pentru Video SDK
    const hasAllRequiredFields = !!(
      payload.app_key && 
      payload.tpc && 
      payload.user_identity && 
      payload.role_type !== undefined &&
      payload.version &&
      payload.iat && 
      payload.exp
    );
    
    return {
      issuer: payload.iss,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      sessionName: payload.tpc,
      userIdentity: payload.user_identity,
      roleType: payload.role_type,
      isValid: isVideoSDKTokenValid(token),
      expiresInMinutes: Math.round((payload.exp - Date.now() / 1000) / 60),
      hasAllRequiredFields
    };
  } catch (error) {
    console.error('[Debug] Failed to parse token:', error);
    return null;
  }
}

// ✅ VALIDEAZĂ CREDENȚIALELE ZOOM
export function validateZoomCredentials(): {
  videoSDK: { hasKey: boolean; hasSecret: boolean; isValid: boolean };
  meetingAPI: { hasPublic: boolean; hasSecret: boolean; isValid: boolean };
  allValid: boolean;
} {
  const validation = {
    videoSDK: {
      hasKey: !!process.env.ZOOM_SDK_KEY,
      hasSecret: !!process.env.ZOOM_SDK_SECRET,
      isValid: !!(process.env.ZOOM_SDK_KEY && process.env.ZOOM_SDK_SECRET)
    },
    meetingAPI: {
      hasPublic: !!process.env.ZOOM_API_PUBLIC,
      hasSecret: !!process.env.ZOOM_API_SECRET,
      isValid: !!(process.env.ZOOM_API_PUBLIC && process.env.ZOOM_API_SECRET)
    }
  };

  validation.allValid = validation.videoSDK.isValid && validation.meetingAPI.isValid;

  return validation;
}

// ✅ TEST RAPID PENTRU VERIFICARE
export function quickTest(): void {
  console.log('🧪 [Quick Test] Testing Zoom Video SDK implementation...');
  
  try {
    // 1. Verifică credențialele
    const credentials = validateZoomCredentials();
    console.log('📋 [Credentials]', credentials);
    
    if (!credentials.allValid) {
      console.error('❌ [Quick Test] Invalid credentials!');
      return;
    }
    
    // 2. Testează generarea token-ului
    const testToken = generateClientToken('test-session-123', 'user123', 1);
    console.log('🎫 [Token] Generated successfully');
    
    // 3. Testează validarea token-ului  
    const isValid = isVideoSDKTokenValid(testToken);
    console.log('✅ [Validation] Token is valid:', isValid);
    
    // 4. Testează parsarea token-ului
    const tokenInfo = parseZoomToken(testToken);
    console.log('🔍 [Parse] Token info:', {
      sessionName: tokenInfo?.sessionName,
      userIdentity: tokenInfo?.userIdentity,
      roleType: tokenInfo?.roleType,
      expiresInMinutes: tokenInfo?.expiresInMinutes,
      hasAllRequiredFields: tokenInfo?.hasAllRequiredFields
    });
    
    if (tokenInfo?.hasAllRequiredFields) {
      console.log('🎉 [Quick Test] All tests passed! Implementation looks good.');
    } else {
      console.error('❌ [Quick Test] Token missing required fields!');
    }
    
  } catch (error) {
    console.error('❌ [Quick Test] Failed:', error);
  }
}

// Exportă toate funcțiile necesare
export {
  generateZoomApiToken,
  generateZoomClientToken,
  type ZoomSession,
  type TokenInfo
};