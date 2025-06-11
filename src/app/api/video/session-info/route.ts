// File: app/api/video/session-info/route.ts
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
}

export async function GET(req: NextRequest) {
  // 1. Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unautorizat.' },
      { status: 401 }
    );
  }
  const currentUserId = session.user.id;

  // 2. Find active consulting session for this user
  const now = new Date();
  const record = await prisma.consultingSession.findFirst({
    where: {
      OR: [
        { providerId: currentUserId },
        { clientId:   currentUserId },
      ],
      startDate: { lte: now },
      endDate:   { gte: now },
      isFinished: false,
    },
    select: {
      zoomSessionName: true,
      zoomTokens:      true,
      startDate:       true,
      endDate:         true,
    },
  });

  if (!record) {
    return NextResponse.json(
      { error: 'Nicio sesiune activă.' },
      { status: 404 }
    );
  }

  // 3. Extract token for current user
  const tokensMap = record.zoomTokens as Record<string, string>;
  const token = tokensMap[currentUserId];
  if (!token) {
    return NextResponse.json(
      { error: 'Token Zoom indisponibil.' },
      { status: 500 }
    );
  }

  // 4. Build response
  const response: SessionInfo = {
    sessionName: record.zoomSessionName,
    token,
    userId:      currentUserId,
    startDate:   record.startDate.toISOString(),
    endDate:     record.endDate.toISOString(),
  };

  return NextResponse.json(response);
}
