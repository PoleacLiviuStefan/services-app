// ✅ IMPLEMENTARE CORECTĂ PENTRU VIDEO SDK TOKEN
// Folosește această funcție în ambele endpoint-uri

const KJUR = require('jsrsasign');

/**
 * Generează token corect pentru Zoom Video SDK
 * @param {string} sessionName - Numele sesiunii (tpc)
 * @param {string} userId - ID-ul utilizatorului
 * @param {number} roleType - 0 = participant, 1 = host
 * @param {string} sessionKey - Password opțional pentru sesiune
 * @returns {string} JWT token pentru Video SDK
 */
function generateVideoSDKToken(
  sessionName, 
  userId, 
  roleType = 0, 
  sessionKey = ''
) {
  console.log('🔐 Generating CORRECT Video SDK Token...');
  
  // ✅ VERIFICĂ CREDENȚIALELE CORECTE
  if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
    throw new Error('Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET (Video SDK credentials required)');
  }

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 ore

  // ✅ HEADER CORECT
  const oHeader = { 
    alg: 'HS256', 
    typ: 'JWT' 
  };

  // ✅ PAYLOAD CORECT CU TOATE CÂMPURILE OBLIGATORII
  const oPayload = {
    app_key: process.env.ZOOM_SDK_KEY,     // ✅ Video SDK Key (NU ZOOM_API_PUBLIC!)
    tpc: sessionName,                      // ✅ Session name/topic
    role_type: roleType,                   // ✅ 0 = participant, 1 = host  
    version: 1,                            // ✅ OBLIGATORIU pentru Video SDK
    iat: iat,                              // ✅ Issued at
    exp: exp,                              // ✅ Expires at
    
    // ✅ OPȚIONALE (dar recomandate)
    user_identity: userId,                 // User ID
    session_key: sessionKey,               // Password pentru sesiune (dacă ai)
    
    // ✅ ALTE CÂMPURI OPȚIONALE (decomentează dacă ai nevoie)
    // geo_regions: "",
    // cloud_recording_option: 0,
    // cloud_recording_election: 0,
    // telemetry_tracking_id: "",
    // video_webrtc_mode: 0,
    // audio_webrtc_mode: 0
  };

  console.log('📋 Token payload (CORRECT format):', {
    app_key: oPayload.app_key?.substring(0, 10) + '...',
    tpc: oPayload.tpc,
    role_type: oPayload.role_type,
    version: oPayload.version, // ✅ Acum include version!
    user_identity: oPayload.user_identity,
    iat: new Date(oPayload.iat * 1000).toISOString(),
    exp: new Date(oPayload.exp * 1000).toISOString(),
    duration_hours: (oPayload.exp - oPayload.iat) / 3600
  });

  try {
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    
    // ✅ GENERARE CU ZOOM_SDK_SECRET (NU ZOOM_API_SECRET!)
    const VIDEO_SDK_JWT = KJUR.jws.JWS.sign(
      'HS256', 
      sHeader, 
      sPayload, 
      process.env.ZOOM_SDK_SECRET  // ✅ Video SDK Secret
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
        hasVersion: !!decodedPayload.version,  // ✅ Verifică version
        hasIat: !!decodedPayload.iat,
        hasExp: !!decodedPayload.exp,
        allRequiredFields: !!(
          decodedPayload.app_key && 
          decodedPayload.tpc && 
          decodedPayload.role_type !== undefined && 
          decodedPayload.version &&
          decodedPayload.iat && 
          decodedPayload.exp
        )
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
      payload.version &&  // ✅ Verifică version
      payload.iat && 
      payload.exp
    );

    console.log('🔍 Token validation:', {
      timeLeftMinutes: Math.round(timeLeft / 60),
      notExpired,
      hasRequiredFields,
      missingFields: [
        !payload.app_key && 'app_key',
        !payload.tpc && 'tpc', 
        payload.role_type === undefined && 'role_type',
        !payload.version && 'version',  // ✅ Include version în verificare
        !payload.iat && 'iat',
        !payload.exp && 'exp'
      ].filter(Boolean)
    });

    return notExpired && hasRequiredFields;
    
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return false;
  }
}

// ✅ EXPORT PENTRU UTILIZARE
module.exports = {
  generateVideoSDKToken,
  isVideoSDKTokenValid
};

// ✅ EXEMPLU DE UTILIZARE:
/*
// Pentru participant (client)
const clientToken = generateVideoSDKToken(
  'my-session-name',
  'user-123', 
  0,  // participant
  ''  // no session password
);

// Pentru host (provider) 
const hostToken = generateVideoSDKToken(
  'my-session-name',
  'provider-456',
  1,  // host
  ''  // no session password
);
*/