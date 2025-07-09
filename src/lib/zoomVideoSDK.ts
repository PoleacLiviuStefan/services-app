// lib/zoomVideoSDK.ts
// ✅ IMPLEMENTARE COMPLETĂ ZOOM VIDEO SDK

import jwt from 'jsonwebtoken';

// ===== TYPES =====
export interface ZoomVideoSDKCredentials {
  sdkKey: string;
  sdkSecret: string;
}

export interface VideoSDKSession {
  sessionName: string;
  sessionPassword?: string;
  roleType: number; // 0 = participant, 1 = host
  userIdentity: string;
  sessionKey?: string;
  geoRegions?: string;
  cloudRecording?: string;
  telemetry?: boolean;
  webEndpoint?: string;
}

export interface VideoSDKTokenPayload {
  app_key: string;
  tpc: string; // topic/session name
  user_identity: string;
  pwd?: string; // session password (optional)
  role_type: number; // 0 or 1
  session_key?: string;
  geo_regions?: string;
  cloud_recording?: string;
  telemetry?: boolean;
  webinar?: boolean;
  iat: number;
  exp: number;
  version: number;
}

export interface ParsedTokenInfo {
  valid: boolean;
  expired: boolean;
  payload?: VideoSDKTokenPayload;
  expiresAt?: Date;
  expiresInMinutes?: number;
  roleType?: number;
  sessionName?: string;
  userIdentity?: string;
  hasAllRequiredFields?: boolean;
  error?: string;
}

// ===== CREDENTIAL VALIDATION =====
export function validateZoomCredentials(): {
  allValid: boolean;
  sdkKey: boolean;
  sdkSecret: boolean;
  details: Record<string, any>;
} {
  const sdkKey = process.env.ZOOM_SDK_KEY || '';
  const sdkSecret = process.env.ZOOM_SDK_SECRET || '';

  const validation = {
    sdkKey: sdkKey.length > 0,
    sdkSecret: sdkSecret.length > 0,
    allValid: false,
    details: {
      sdkKeyLength: sdkKey.length,
      sdkSecretLength: sdkSecret.length,
      sdkKeyFormat: /^[A-Za-z0-9_-]+$/.test(sdkKey),
      environment: process.env.NODE_ENV
    }
  };

  validation.allValid = validation.sdkKey && validation.sdkSecret;

  return validation;
}

// ===== TOKEN GENERATION =====
export function generateVideoSDKToken(
  sessionName: string,
  userIdentity: string,
  roleType: number = 0, // 0 = participant, 1 = host
  sessionPassword?: string,
  sessionKey?: string,
  expirationMinutes: number = 120 // 2 hours default
): string {
  // Validate inputs
  if (!sessionName || !userIdentity) {
    throw new Error('Session name and user identity are required');
  }

  if (roleType !== 0 && roleType !== 1) {
    throw new Error('Role type must be 0 (participant) or 1 (host)');
  }

  // Get credentials
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    throw new Error('Zoom SDK credentials not configured');
  }

  // Calculate expiration
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (expirationMinutes * 60);

  // Create payload - EXACT format required by Video SDK
  const payload: VideoSDKTokenPayload = {
    app_key: sdkKey,
    version: 1,
    tpc: sessionName.trim(),
    user_identity: userIdentity.trim(),
    role_type: roleType,
    iat: iat,
    exp: exp
  };

  // Add optional fields only if provided
  if (sessionPassword) {
    payload.pwd = sessionPassword;
  }

  if (sessionKey) {
    payload.session_key = sessionKey;
  }

  // Sign token
  try {
    const token = jwt.sign(payload, sdkSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256'
      }
    });

    return token;
  } catch (error: any) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
}

// ===== ALIAS FOR BACKWARD COMPATIBILITY =====
export const generateClientToken = generateVideoSDKToken;

// ===== TOKEN VALIDATION =====
export function parseZoomToken(token: string): ParsedTokenInfo {
  try {
    // Basic validation
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        expired: false,
        error: 'Invalid token format'
      };
    }

    // Check token structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        expired: false,
        error: 'Invalid JWT structure'
      };
    }

    // Decode without verification (for inspection)
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded || !decoded.payload) {
      return {
        valid: false,
        expired: false,
        error: 'Unable to decode token'
      };
    }

    const payload = decoded.payload as VideoSDKTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    const expired = payload.exp ? payload.exp < now : true;
    const expiresInMinutes = payload.exp ? Math.floor((payload.exp - now) / 60) : 0;

    // Check required fields for Video SDK
    const requiredFields = ['app_key', 'tpc', 'user_identity', 'role_type', 'version', 'iat', 'exp'];
    const hasAllRequiredFields = requiredFields.every(field => 
      payload[field as keyof VideoSDKTokenPayload] !== undefined
    );

    return {
      valid: !expired && hasAllRequiredFields,
      expired,
      payload,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
      expiresInMinutes,
      roleType: payload.role_type,
      sessionName: payload.tpc,
      userIdentity: payload.user_identity,
      hasAllRequiredFields,
      error: expired ? 'Token expired' : !hasAllRequiredFields ? 'Missing required fields' : undefined
    };
  } catch (error: any) {
    return {
      valid: false,
      expired: false,
      error: `Parse error: ${error.message}`
    };
  }
}

export function isVideoSDKTokenValid(token: string): boolean {
  const parsed = parseZoomToken(token);
  return parsed.valid && !parsed.expired && parsed.hasAllRequiredFields === true;
}

// ===== SESSION MANAGEMENT =====
// Video SDK doesn't require pre-creating sessions via API
// Sessions are created automatically when the first user joins

export interface VideoSDKSessionInfo {
  sessionName: string;
  created: boolean;
  message: string;
}

export async function createVideoSDKSession(sessionName: string): Promise<VideoSDKSessionInfo> {
  // Video SDK sessions are created automatically
  // This function is kept for API compatibility
  return {
    sessionName: sessionName.trim(),
    created: true,
    message: 'Video SDK sessions are created automatically when users join'
  };
}

// Alias for backward compatibility
export const createZoomSession = async (sessionName: string) => {
  const session = await createVideoSDKSession(sessionName);
  return {
    session_id: sessionName,
    session_name: sessionName,
    session_number: Date.now(),
    created_at: new Date().toISOString()
  };
};

// ===== HELPER FUNCTIONS =====
export function generateSessionName(prefix: string = 'session'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function getRoleTypeName(roleType: number): string {
  switch (roleType) {
    case 0:
      return 'participant';
    case 1:
      return 'host';
    default:
      return 'unknown';
  }
}

// ===== CLIENT INITIALIZATION HELPER =====
export interface VideoSDKClientConfig {
  leaveOnPageUnload?: boolean;
  patchJsMedia?: boolean;
  leaveOnViewChanged?: boolean;
  webEndpoint?: string;
  enforceGalleryView?: boolean;
  enforceVBMode?: boolean;
}

export function getVideoSDKClientConfig(): VideoSDKClientConfig {
  return {
    leaveOnPageUnload: true,
    patchJsMedia: true,
    leaveOnViewChanged: false,
    webEndpoint: process.env.ZOOM_WEB_ENDPOINT || 'zoom.us',
    enforceGalleryView: false,
    enforceVBMode: false
  };
}

// ===== DEBUGGING UTILITIES =====
export function debugToken(token: string): void {
  console.log('=== VIDEO SDK TOKEN DEBUG ===');
  
  const parsed = parseZoomToken(token);
  
  console.log('Token Info:', {
    valid: parsed.valid,
    expired: parsed.expired,
    expiresInMinutes: parsed.expiresInMinutes,
    sessionName: parsed.sessionName,
    userIdentity: parsed.userIdentity,
    roleType: `${parsed.roleType} (${getRoleTypeName(parsed.roleType || 0)})`,
    hasAllRequiredFields: parsed.hasAllRequiredFields,
    error: parsed.error
  });

  if (parsed.payload) {
    console.log('Payload Fields:', {
      app_key: parsed.payload.app_key?.substring(0, 10) + '...',
      version: parsed.payload.version,
      has_pwd: !!parsed.payload.pwd,
      has_session_key: !!parsed.payload.session_key,
      iat: new Date(parsed.payload.iat * 1000).toISOString(),
      exp: new Date(parsed.payload.exp * 1000).toISOString()
    });
  }
  
  console.log('=== END TOKEN DEBUG ===');
}

// ===== ERROR HANDLING =====
export class VideoSDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoSDKError';
  }
}

// ===== EXPORT ALL =====
export default {
  generateVideoSDKToken,
  generateClientToken,
  parseZoomToken,
  isVideoSDKTokenValid,
  validateZoomCredentials,
  createVideoSDKSession,
  createZoomSession,
  generateSessionName,
  getRoleTypeName,
  getVideoSDKClientConfig,
  debugToken,
  VideoSDKError
};