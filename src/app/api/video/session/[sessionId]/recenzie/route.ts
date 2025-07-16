import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: { sessionId: string };
};

/**
 * POST /api/session/[sessionId]/feedback
 * Body: { rating: number; comment?: string }
 * Authenticates the user, finds the consulting session to get providerId,
 * then creates a Review for that provider.
 */
export async function POST(
  request: Request,
  context: RouteContext
) {
  // 1. Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }
  const fromUserId = session.user.id;

  // 2. Extract sessionId from params
  const { sessionId } = context.params;

  // 3. Fetch consulting session and providerId
  const consulting = await prisma.consultingSession.findUnique({
    where: { id: sessionId },
    select: { providerId: true }
  });
  if (!consulting) {
    return NextResponse.json(
      { error: `Sesiunea cu id '${sessionId}' nu a fost găsită.` },
      { status: 404 }
    );
  }
  const providerId = consulting.providerId;

  // 4. Parse and validate body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid" }, { status: 400 });
  }
  const { rating, comment } = body;
  if (
    typeof rating !== 'number' ||
    rating < 1 || rating > 5
  ) {
    return NextResponse.json({ error: "Rating invalid" }, { status: 400 });
  }

  // 5. Create review
  try {
    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment || null,
        date: new Date(),
        service: 'MEET',
        fromUserId,
        providerId
      }
    });
    return NextResponse.json({ success: true, review });

  } catch (err: unknown) {
    console.error('POST /api/video/session/[sessionId]/feedback error:', err);
    return NextResponse.json(
      { error: 'Eroare internă la salvarea feedback-ului' },
      { status: 500 }
    );
  }
}
