import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET() {
  // Folosește SDK Key & Secret, nu API Key/Secret
  const sdkKey    = process.env.ZOOM_SDK_KEY!;
  const sdkSecret = process.env.ZOOM_SDK_SECRET!;

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60; // valabil 1h

  const payload = {
    app_key:       sdkKey,                               // SDK Key
    version:       1,                                    // obligatoriu
    tpc:           process.env.NEXT_PUBLIC_SESSION_NAME, // numele sesiunii
    role_type:     0,                                    // 0=participant, 1=host
    user_identity: process.env.NEXT_PUBLIC_USER_ID,      // ID-ul tău unic
    iat,
    exp,
  };

  const token = jwt.sign(payload, sdkSecret, {
    algorithm: 'HS256'
  });

  return NextResponse.json({ token });
}
