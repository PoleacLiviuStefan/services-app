// File: app/api/consulting-sessions/[sessionId]/zoom-credentials/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/** Generează un JWT compatibil Zoom Video SDK (2h valabilitate) */
function generateSdkToken(
  sdkKey: string,
  sdkSecret: string,
  meetingTopic: string,
  userId: string,
  roleType: 0 | 1
) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 2 * 60 * 60;
  const payload = {
    app_key:       sdkKey,
    version:       1,
    tpc:           meetingTopic,
    role_type:     roleType,
    user_identity: userId,
    iat,
    exp,
  };
  return jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
}

export async function GET(
  _req: Request,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = await context.params;

  // 1. Autentificare
  const sess = await getServerSession(authOptions);
  if (!sess?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentUser = sess.user.id;

  // 2. Obține din DB sesiunea
  let cs = await prisma.consultingSession.findUnique({ where:{ id: sessionId } });
  if (!cs) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // 3. Dacă n-a fost creat meeting încă, creează on-demand
  if (!cs.zoomSessionName) {
    const createRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/video/create-session`,
      { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({
        users:       [cs.providerId, cs.clientId],
        providerId:  cs.providerId,
        clientId:    cs.clientId,
        specialityId: cs.specialityId,
        packageId:   cs.packageId,
      }) }
    );
    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json({ error:'Zoom create-session failed', details: err }, { status: createRes.status });
    }
    const { sessionName } = await createRes.json();
    cs = await prisma.consultingSession.update({ where:{ id: sessionId }, data:{ zoomSessionName: sessionName } });
  }

  // 4. Alege rol și userId pentru token
  const isHost = cs.providerId === currentUser;
  const roleType = isHost ? 1 : 0;  // 1=host, 0=participant
  const userIdentity = isHost ? cs.providerId : cs.clientId;
  const meetingTopic = cs.zoomSessionName!;

  // 5. Generează token
  const sdkKey    = process.env.ZOOM_SDK_KEY!;
  const sdkSecret = process.env.ZOOM_SDK_SECRET!;
  if (!sdkKey || !sdkSecret) {
    return NextResponse.json({ error:'Zoom SDK credentials missing' }, { status:500 });
  }
  const token = generateSdkToken(sdkKey, sdkSecret, meetingTopic, userIdentity, roleType);

  // 6. Răspunde clientului
  return NextResponse.json({ sessionName: meetingTopic, token, userId: userIdentity }, { status:200 });
}
