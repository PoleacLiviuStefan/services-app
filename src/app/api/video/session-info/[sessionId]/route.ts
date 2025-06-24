// File: app/api/video/session-info/[sessionId]/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SessionInfo {
  sessionName: string;
  token:       string;
  userId:      string;
  startDate:   string;
  endDate:     string;
  provider:    { id: string; name: string };
  client:      { id: string; name: string };
}

export async function GET(
  _req: NextRequest,
  context: { params: { sessionId: string } }
) {
  console.log('[Debug] Entering session-info route');

  const { sessionId } = await context.params;
  console.log('[Debug] sessionId:', sessionId);

  // Authenticate
  const sess = await getServerSession(authOptions);
  if (!sess?.user?.id) {
    console.log('[Debug] Unauthenticated');
    return NextResponse.json({ error: 'Unautorizat.' }, { status: 401 });
  }
  const currentUserId = sess.user.id;
  console.log('[Debug] currentUserId:', currentUserId);

  // Find active session record
  const now = new Date();
  console.log('[Debug] now:', now.toISOString());
  const record = await prisma.consultingSession.findFirst({
    where: {
      id: sessionId,

    },
    select: {
      providerId:      true,
      clientId:        true,
      zoomSessionName: true,
      zoomTokens:      true,
      startDate:       true,
      endDate:         true,
    },
  });
  console.log('[Debug] record fetched:', record);
  if (!record) {
    console.log('[Debug] No active session');
    return NextResponse.json({ error: 'Nicio sesiune activă.' }, { status: 404 });
  }


  // Authorization
  const isCurrentUserProvider = await prisma.provider.findUnique({
  where: { id: record.providerId },
  select: { id:true,
    userId: true }
});
console.log('[Debug] isCurrentUserProvider:', isCurrentUserProvider);
console.log("[Debug] record.clientId:", record.providerId);
  if (!isCurrentUserProvider && record.clientId !== currentUserId) {
    console.log('[Debug] Unauthorized user');
    return NextResponse.json(
      { error: 'Nu faci parte din această sesiune.' },
      { status: 403 }
    );
  }

  // Extract and validate tokensMap
  console.log('[Debug] raw zoomTokens:', record.zoomTokens);
  if (!record.zoomTokens || typeof record.zoomTokens !== 'object') {
    console.log('[Debug] Invalid zoomTokens');
    return NextResponse.json(
      { error: 'Zoom tokens missing in DB.' },
      { status: 500 }
    );
  }
  const tokensMap = record.zoomTokens as Record<string,string>;
  console.log('[Debug] tokensMap:', tokensMap);

  const token = tokensMap[isCurrentUserProvider.id];
  console.log('[Debug] token for user:', token);
  if (!token) {
    console.log('[Debug] No token for user');
    return NextResponse.json(
      { error: 'Token Zoom indisponibil.' },
      { status: 500 }
    );
  }

    // Fetch provider's User record and existing client's User record
  // record.providerId refers to Provider.id, not User.id
  const providerRelation = await prisma.provider.findUnique({
    where: { id: record.providerId },
    select: { userId: true }
  });
  console.log('[Debug] providerRelation:', providerRelation);
  if (!providerRelation) {
    console.log('[Debug] Missing provider relation');
    return NextResponse.json(
      { error: 'Provider data missing.' },
      { status: 500 }
    );
  }
  const [prUser, clUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: providerRelation.userId }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { id: record.clientId       }, select: { id: true, name: true } }),
  ]);
  console.log('[Debug] prUser:', prUser, 'clUser:', clUser);
  if (!prUser || !clUser) {
    console.log('[Debug] Missing user data for provider or client');
    return NextResponse.json(
      { error: 'User data missing.' },
      { status: 500 }
    );
  }

  // Build and return response
  const response: SessionInfo = {
    sessionName: record.zoomSessionName!,
    token,
    userId:      currentUserId,
    startDate:   record.startDate!.toISOString(),
    endDate:     record.endDate!.toISOString(),
    provider:    { id: prUser.id, name: prUser.name! },
    client:      { id: clUser.id, name: clUser.name! },
  };
  console.log('[Debug] response:', response);

  return NextResponse.json(response);
}
