// app/api/video/create-session/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {prisma} from '@/lib/prisma';

export async function POST(req: Request) {
  const { users, providerId, clientId, specialityId, packageId } = await req.json();

  // validări de bază
  if (!Array.isArray(users) || users.length !== 2) {
    return NextResponse.json({ error: 'Trebuie să specifici exact 2 user IDs.' }, { status: 400 });
  }
  if (!providerId || !clientId || !specialityId) {
    return NextResponse.json({ error: 'Lipsește providerId, clientId sau specialityId.' }, { status: 400 });
  }

  const sdkKey    = process.env.ZOOM_SDK_KEY!;
  const sdkSecret = process.env.ZOOM_SDK_SECRET!;
  const sessionName = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60;  // 1h

  // generează token pentru fiecare user
  const tokens: Record<string,string> = {};
  for (const userId of users) {
    const payload = {
      app_key:       sdkKey,
      version:       1,
      tpc:           sessionName,
      role_type:     0,
      user_identity: userId,
      iat,
      exp,
    };
    tokens[userId] = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
  }

  // persistă sesiunea în Prisma
  const created = await prisma.consultingSession.create({
    data: {
      providerId,
      clientId,
      specialityId,
      packageId,
      zoomSessionName: sessionName,
      zoomTokens: tokens,
      // zoomCreatedAt se setează automat
    }
  });

  return NextResponse.json({
    sessionName,
    tokens,
    session: created
  });
}
