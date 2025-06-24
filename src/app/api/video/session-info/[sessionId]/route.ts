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

  // Get provider's user ID
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

  // Authorization - check if current user is either the provider or the client
  const isProvider = providerRelation.userId === currentUserId;
  const isClient = record.clientId === currentUserId;
  
  console.log('[Debug] isProvider:', isProvider, 'isClient:', isClient);
  console.log('[Debug] providerUserId:', providerRelation.userId, 'clientId:', record.clientId);

  if (!isProvider && !isClient) {
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
  const tokensMap = record.zoomTokens as Record<string, string>;
  console.log('[Debug] tokensMap:', tokensMap);

  // Get the correct token for the current user
  // For providers, use the provider ID as key
  // For clients, use the client ID (user ID) as key
  let tokenKey: string;
  if (isProvider) {
    tokenKey = record.providerId;
  } else {
    tokenKey = currentUserId; // client ID
  }

  const token = tokensMap[tokenKey];
  console.log('[Debug] tokenKey:', tokenKey, 'token found:', !!token);
  if (!token) {
    console.log('[Debug] No token for user, available keys:', Object.keys(tokensMap));
    return NextResponse.json(
      { error: 'Token Zoom indisponibil.' },
      { status: 500 }
    );
  }

  // Fetch both user records
  const [providerUser, clientUser] = await Promise.all([
    prisma.user.findUnique({ 
      where: { id: providerRelation.userId }, 
      select: { id: true, name: true } 
    }),
    prisma.user.findUnique({ 
      where: { id: record.clientId }, 
      select: { id: true, name: true } 
    }),
  ]);
  
  console.log('[Debug] providerUser:', providerUser, 'clientUser:', clientUser);
  if (!providerUser || !clientUser) {
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
    provider:    { id: providerUser.id, name: providerUser.name! },
    client:      { id: clientUser.id, name: clientUser.name! },
  };
  console.log('[Debug] response:', response);

  return NextResponse.json(response);
}