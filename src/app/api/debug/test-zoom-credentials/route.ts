// File: app/api/debug/test-zoom-credentials/route.ts
// Test endpoint for debugging Zoom Video SDK credentials

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import KJUR from 'jsrsasign';

interface TestRequest {
  sessionName: string;
  userIdentity: string;
  roleType: number;
}

interface TestResult {
  success: boolean;
  token?: string;
  payload?: any;
  error?: string;
  credentialsValid: boolean;
  recommendations: string[];
}

function generateTestVideoSDKToken(sessionName: string, userIdentity: string, roleType: number): string {
  const iat = Math.round(Date.now() / 1000) - 30; // 30 seconds ago
  const exp = iat + 7200; // 2 hours

  // Correct Video SDK payload format
  const payload = {
    app_key: process.env.ZOOM_API_PUBLIC,
    tpc: sessionName,
    role_type: roleType,
    iat: iat,
    exp: exp,
    user_identity: userIdentity,
    session_key: '',
    alg: 'HS256'
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const token = KJUR.jws.JWS.sign(
    'HS256',
    JSON.stringify(header),
    JSON.stringify(payload),
    process.env.ZOOM_API_SECRET!
  );

  return token;
}

function validateCredentials(): { valid: boolean; issues: string[]; recommendations: string[] } {
  const issues = [];
  const recommendations = [];

  if (!process.env.ZOOM_API_PUBLIC) {
    issues.push('ZOOM_API_PUBLIC environment variable is missing');
    recommendations.push('Set ZOOM_API_PUBLIC with your Video SDK key from Zoom Marketplace');
  }

  if (!process.env.ZOOM_API_SECRET) {
    issues.push('ZOOM_API_SECRET environment variable is missing');
    recommendations.push('Set ZOOM_API_SECRET with your Video SDK secret from Zoom Marketplace');
  }

  if (process.env.ZOOM_API_PUBLIC) {
    // Video SDK keys typically start with certain patterns
    const key = process.env.ZOOM_API_PUBLIC;
    if (key.length < 10) {
      issues.push('API key seems too short');
      recommendations.push('Verify you copied the complete Video SDK key');
    }
  }

  if (process.env.ZOOM_API_SECRET) {
    const secret = process.env.ZOOM_API_SECRET;
    if (secret.length < 10) {
      issues.push('API secret seems too short');
      recommendations.push('Verify you copied the complete Video SDK secret');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    recommendations
  };
}

function analyzeToken(token: string): { valid: boolean; issues: string[]; recommendations: string[] } {
  const issues = [];
  const recommendations = [];

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      issues.push(`Token has ${parts.length} parts, should have 3`);
      recommendations.push('Check token generation - should be header.payload.signature');
      return { valid: false, issues, recommendations };
    }

    const payload = JSON.parse(atob(parts[1]));

    // Check required fields
    if (!payload.app_key) {
      issues.push('Missing app_key field');
      recommendations.push('Add app_key field with your Video SDK key');
    }

    if (!payload.tpc) {
      issues.push('Missing tpc field');
      recommendations.push('Add tpc field with session name');
    }

    if (payload.role_type === undefined) {
      issues.push('Missing role_type field');
      recommendations.push('Add role_type field (0 for participant, 1 for host)');
    }

    if (!payload.iat) {
      issues.push('Missing iat field');
      recommendations.push('Add iat field with issued timestamp');
    }

    if (!payload.exp) {
      issues.push('Missing exp field');
      recommendations.push('Add exp field with expiration timestamp');
    }

    // Check for common mistakes (Meeting SDK fields)
    if (payload.iss && !payload.app_key) {
      issues.push('Using Meeting SDK field "iss" instead of Video SDK field "app_key"');
      recommendations.push('Replace "iss" with "app_key" for Video SDK');
    }

    if (payload.aud) {
      issues.push('Found Meeting SDK field "aud" - not needed for Video SDK');
      recommendations.push('Remove "aud" field - not used in Video SDK');
    }

    if (payload.appKey && !payload.app_key) {
      issues.push('Using camelCase "appKey" instead of snake_case "app_key"');
      recommendations.push('Change "appKey" to "app_key"');
    }

    if (payload.topic && !payload.tpc) {
      issues.push('Using "topic" instead of "tpc"');
      recommendations.push('Change "topic" to "tpc"');
    }

    if (payload.roleType !== undefined && payload.role_type === undefined) {
      issues.push('Using camelCase "roleType" instead of snake_case "role_type"');
      recommendations.push('Change "roleType" to "role_type"');
    }

    // Check expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        issues.push('Token is expired');
        recommendations.push('Generate new token with future expiration time');
      } else if (payload.exp - now < 300) {
        issues.push('Token expires very soon');
        recommendations.push('Use longer expiration time (recommended: 1-2 hours)');
      }
    }

    // Check issued time
    if (payload.iat) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.iat > now + 300) {
        issues.push('Token issued time is in the future');
        recommendations.push('Set iat to current time or slightly in the past');
      }
    }

    return { valid: issues.length === 0, issues, recommendations };
  } catch (error) {
    issues.push('Failed to parse token');
    recommendations.push('Check token format and base64 encoding');
    return { valid: false, issues, recommendations };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: TestRequest = await req.json();
    const { sessionName, userIdentity, roleType } = body;

    // Validate input
    if (!sessionName || !userIdentity || roleType === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: sessionName, userIdentity, roleType',
        credentialsValid: false,
        recommendations: ['Provide all required test parameters']
      } as TestResult);
    }

    // Check credentials
    const credentialCheck = validateCredentials();
    
    if (!credentialCheck.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials configuration',
        credentialsValid: false,
        recommendations: credentialCheck.recommendations
      } as TestResult);
    }

    // Try to generate token
    try {
      const token = generateTestVideoSDKToken(sessionName, userIdentity, roleType);
      
      // Analyze the generated token
      const tokenAnalysis = analyzeToken(token);
      
      // Parse payload for response
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));

      const result: TestResult = {
        success: tokenAnalysis.valid,
        token,
        payload,
        credentialsValid: true,
        recommendations: tokenAnalysis.recommendations
      };

      if (!tokenAnalysis.valid) {
        result.error = 'Generated token has issues: ' + tokenAnalysis.issues.join(', ');
      }

      return NextResponse.json(result);

    } catch (tokenError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate token: ' + (tokenError instanceof Error ? tokenError.message : 'Unknown error'),
        credentialsValid: true,
        recommendations: [
          'Check that ZOOM_API_SECRET is correct',
          'Verify environment variables are properly loaded',
          'Test with Zoom\'s official sample code'
        ]
      } as TestResult);
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Request processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      credentialsValid: false,
      recommendations: ['Check request format and try again']
    } as TestResult, { status: 400 });
  }
}

// GET endpoint for basic health check
export async function GET() {
  const credentialCheck = validateCredentials();
  
  return NextResponse.json({
    status: 'Debug endpoint active',
    credentialsConfigured: credentialCheck.valid,
    issues: credentialCheck.issues,
    recommendations: credentialCheck.recommendations,
    usage: 'POST with { sessionName, userIdentity, roleType } to test token generation'
  });
}