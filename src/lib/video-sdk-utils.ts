// ✅ IMPLEMENTARE CORECTĂ PENTRU VIDEO SDK TOKEN
// Versiunea corectată care rezolvă eroarea 6001

const KJUR = require('jsrsasign');

/**
 * Generează un user_identity scurt și unic (max 16 caractere)
 * @param {string} fullUserId - ID-ul complet al utilizatorului 
 * @param {boolean} isProvider - True dacă utilizatorul este provider
 * @returns {string} User identity scurt pentru Zoom
 */
function generateShortUserIdentity(fullUserId, isProvider = false) {
  // ✅ REZOLVĂ PROBLEMA: user_identity trebuie să fie <= 16 caractere
  const prefix = isProvider ? 'p' : 'c'; // provider sau client
  const hash = fullUserId.slice(-10); // Ultimele 10 caractere
  const shortId = `${prefix}_${hash}`.substring(0, 16); // Max 16 caractere
  
  console.log('🔤 Generated short user identity:', {
    original: fullUserId,
    shortened: shortId,
    length: shortId.length,
    isProvider
  });
  
  return shortId;
}

/**
 * Generează token corect pentru Zoom Video SDK
 * @param {string} sessionName - Numele sesiunii (tpc)
 * @param {string} userId - ID-ul utilizatorului
 * @param {number} roleType - 0 = participant, 1 = host
 * @param {string} sessionKey - Password opțional pentru sesiune
 * @param {number} expirationSeconds - Expirare în secunde (default: 2 ore)
 * @returns {string} JWT token pentru Video SDK
 */
function generateVideoSDKToken(
  sessionName, 
  userId, 
  roleType = 0, 
  sessionKey = '',
  expirationSeconds = 7200
) {
  console.log('🔐 Generating CORRECT Video SDK Token...');
  
  // ✅ VERIFICĂ CREDENȚIALELE CORECTE
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    throw new Error('Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET (Video SDK credentials required)');
  }

  // ✅ VALIDĂRI PARAMETRI
  if (!sessionName || typeof sessionName !== 'string') {
    throw new Error('sessionName este obligatoriu și trebuie să fie string');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId este obligatoriu și trebuie să fie string');
  }
  if (![0, 1].includes(roleType)) {
    throw new Error('roleType trebuie să fie 0 (participant) sau 1 (host)');
  }

  // ✅ GENEREAZĂ USER_IDENTITY SCURT (max 16 caractere)
  const isProvider = roleType === 1;
  const shortUserIdentity = generateShortUserIdentity(userId, isProvider);

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + expirationSeconds;

  // ✅ HEADER CORECT
  const oHeader = { 
    alg: 'HS256', 
    typ: 'JWT' 
  };

  // ✅ PAYLOAD CORECT CU TOATE CÂMPURILE OBLIGATORII
  const oPayload = {
    app_key: process.env.ZOOM_SDK_KEY,     // ✅ Video SDK Key
    tpc: sessionName,                      // ✅ Session name/topic
    role_type: roleType,                   // ✅ 0 = participant, 1 = host  
    version: 1,                            // ✅ OBLIGATORIU pentru Video SDK
    iat: iat,                              // ✅ Issued at
    exp: exp,                              // ✅ Expires at
    
    // ✅ USER_IDENTITY SCURT (REZOLVĂ EROAREA 6001!)
    user_identity: shortUserIdentity,      // ✅ Max 16 caractere!
    session_key: sessionKey,               // ✅ Password pentru sesiune
  };

  console.log('📋 Token payload (CORRECT format):', {
    app_key: oPayload.app_key?.substring(0, 10) + '...',
    tpc: oPayload.tpc,
    role_type: oPayload.role_type,
    version: oPayload.version,
    user_identity: oPayload.user_identity,
    user_identity_length: oPayload.user_identity.length, // ✅ Verifică lungimea
    session_key: oPayload.session_key,
    iat: new Date(oPayload.iat * 1000).toISOString(),
    exp: new Date(oPayload.exp * 1000).toISOString(),
    duration_hours: (oPayload.exp - oPayload.iat) / 3600
  });

  // ✅ VERIFICARE LUNGIME USER_IDENTITY
  if (oPayload.user_identity.length > 16) {
    throw new Error(`user_identity prea lung: ${oPayload.user_identity.length} caractere (max 16)`);
  }

  try {
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    
    // ✅ GENERARE CU ZOOM_SDK_SECRET
    const VIDEO_SDK_JWT = KJUR.jws.JWS.sign(
      'HS256', 
      sHeader, 
      sPayload, 
      process.env.ZOOM_SDK_SECRET
    );

    console.log('✅ Video SDK Token generated successfully');
    console.log('- Token length:', VIDEO_SDK_JWT.length);
    console.log('- Token preview:', VIDEO_SDK_JWT.substring(0, 50) + '...');

    // ✅ VERIFICARE TOKEN GENERAT
    try {
      const parts = VIDEO_SDK_JWT.split('.');
      const decodedPayload = JSON.parse(atob(parts[1]));
      
      console.log('🔍 Token verification:', {
        hasAppKey: !!decodedPayload.app_key,
        hasTpc: !!decodedPayload.tpc,
        hasRoleType: decodedPayload.role_type !== undefined,
        hasVersion: !!decodedPayload.version,
        hasUserIdentity: !!decodedPayload.user_identity,
        userIdentityLength: decodedPayload.user_identity?.length,
        hasIat: !!decodedPayload.iat,
        hasExp: !!decodedPayload.exp,
        allRequiredFields: !!(
          decodedPayload.app_key && 
          decodedPayload.tpc && 
          decodedPayload.role_type !== undefined && 
          decodedPayload.version &&
          decodedPayload.user_identity &&
          decodedPayload.iat && 
          decodedPayload.exp
        ),
        isUserIdentityValid: decodedPayload.user_identity?.length <= 16 // ✅ Verifică lungimea
      });
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError);
    }

    return VIDEO_SDK_JWT;
    
  } catch (error) {
    console.error('❌ Video SDK Token generation failed:', error);
    throw new Error('Failed to generate Video SDK token: ' + error.message);
  }
}

// ✅ FUNCȚIE PENTRU VERIFICARE VALIDITATE TOKEN
function isVideoSDKTokenValid(token) {
  try {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Verifică expirarea (cu 5 minute buffer)
    const timeLeft = payload.exp - now;
    const notExpired = timeLeft > 300;
    
    // Verifică câmpurile obligatorii pentru Video SDK
    const hasRequiredFields = !!(
      payload.app_key && 
      payload.tpc && 
      payload.role_type !== undefined &&
      payload.version &&
      payload.user_identity &&
      payload.iat && 
      payload.exp
    );

    // ✅ VERIFICĂ LUNGIMEA USER_IDENTITY
    const userIdentityValid = payload.user_identity && payload.user_identity.length <= 16;

    console.log('🔍 Token validation:', {
      timeLeftMinutes: Math.round(timeLeft / 60),
      notExpired,
      hasRequiredFields,
      userIdentityValid,
      userIdentityLength: payload.user_identity?.length,
      missingFields: [
        !payload.app_key && 'app_key',
        !payload.tpc && 'tpc', 
        payload.role_type === undefined && 'role_type',
        !payload.version && 'version',
        !payload.user_identity && 'user_identity',
        !payload.iat && 'iat',
        !payload.exp && 'exp'
      ].filter(Boolean)
    });

    return notExpired && hasRequiredFields && userIdentityValid;
    
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return false;
  }
}

// ✅ FUNCȚIE PENTRU DEBUGGING TOKEN
function debugToken(token) {
  try {
    const parts = token.split('.');
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('🔍 Token Debug Info:', {
      header,
      payload: {
        ...payload,
        app_key: payload.app_key?.substring(0, 10) + '...',
        iat_readable: new Date(payload.iat * 1000).toISOString(),
        exp_readable: new Date(payload.exp * 1000).toISOString(),
        time_left_minutes: Math.round((payload.exp - Date.now()/1000) / 60)
      },
      validation: {
        validStructure: parts.length === 3,
        hasAllRequiredFields: !!(
          payload.app_key && 
          payload.tpc && 
          payload.role_type !== undefined && 
          payload.version &&
          payload.user_identity &&
          payload.iat && 
          payload.exp
        ),
        userIdentityLength: payload.user_identity?.length,
        userIdentityValid: payload.user_identity?.length <= 16,
        notExpired: payload.exp > (Date.now()/1000)
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Token debug failed:', error);
    return false;
  }
}

// ✅ EXPORT PENTRU UTILIZARE
module.exports = {
  generateVideoSDKToken,
  isVideoSDKTokenValid,
  generateShortUserIdentity,
  debugToken
};

// ✅ EXEMPLU DE UTILIZARE:
/*
// Pentru participant (client) cu UUID lung
const clientToken = generateVideoSDKToken(
  'my-session-name',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', // UUID lung
  0,  // participant
  ''  // no session password
);
// user_identity va fi: "c_02b2c3d479" (16 caractere)

// Pentru host (provider) cu UUID lung
const hostToken = generateVideoSDKToken(
  'my-session-name',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // UUID lung
  1,  // host
  ''  // no session password
);
// user_identity va fi: "p_ef1234567890" (16 caractere)
*/