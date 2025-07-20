// /api/user/sessions/review/route.ts - Fixed endpoint pentru gestionarea recenziilor
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verifică autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Parsează datele de intrare
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Datele de intrare nu sunt valide JSON" }, { status: 400 });
    }

    const { sessionId, providerId, rating, comment } = body;

    // Validează datele de intrare
    if (!sessionId || !providerId) {
      return NextResponse.json({ 
        error: "sessionId și providerId sunt obligatorii" 
      }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: "Rating-ul trebuie să fie între 1 și 5" 
      }, { status: 400 });
    }

    console.log(`📝 Adăugare/actualizare recenzie pentru sesiunea ${sessionId}:`, {
      userId,
      providerId,
      rating,
      hasComment: !!comment
    });

    // Verifică dacă sesiunea există și utilizatorul are dreptul să lase recenzie
    const consultingSession = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          select: { id: true }
        },
        provider: {
          select: { id: true, userId: true }
        },
        // Include existing review if any
        review: true
      }
    });

    if (!consultingSession) {
      return NextResponse.json({ 
        error: "Sesiunea nu a fost găsită" 
      }, { status: 404 });
    }

    // Verifică dacă utilizatorul este clientul din sesiune
    const isUserClient = consultingSession.clientId === userId || 
                        (consultingSession.client && consultingSession.client.id === userId);

    if (!isUserClient) {
      return NextResponse.json({ 
        error: "Nu aveți dreptul să lăsați recenzie pentru această sesiune" 
      }, { status: 403 });
    }

    // Verifică dacă providerId-ul corespunde cu sesiunea
    if (consultingSession.providerId !== providerId) {
      return NextResponse.json({ 
        error: "Provider ID incorect pentru această sesiune" 
      }, { status: 400 });
    }

    // Verifică dacă sesiunea este completată
    const isSessionCompleted = consultingSession.status === 'COMPLETED' || consultingSession.isFinished;
    if (!isSessionCompleted) {
      return NextResponse.json({ 
        error: "Puteți lăsa recenzie doar pentru sesiunile finalizate" 
      }, { status: 400 });
    }

    let review;
    let isUpdate = false;

    // Check if there's already a review for this session (using the direct relationship)
    if (consultingSession.review) {
      // Verify the review belongs to the current user
      if (consultingSession.review.fromUserId !== userId) {
        return NextResponse.json({ 
          error: "Această sesiune are deja o recenzie de la alt utilizator" 
        }, { status: 409 });
      }

      // Update existing review
      console.log(`🔄 Actualizare recenzie existentă cu ID: ${consultingSession.review.id}`);
      isUpdate = true;
      
      review = await prisma.review.update({
        where: { id: consultingSession.review.id },
        data: {
          rating: parseFloat(rating.toString()),
          comment: comment?.trim() || null,
          date: new Date(), // actualizează data la momentul modificării
          service: 'MEET'
        }
      });

    } else {
      // Create new review with sessionId
      console.log(`✨ Creare recenzie nouă pentru sesiunea ${sessionId}`);
      
      review = await prisma.review.create({
        data: {
          fromUserId: userId,
          providerId: providerId,
          sessionId: sessionId, // 🔧 FIX: Include sessionId
          rating: parseFloat(rating.toString()),
          comment: comment?.trim() || null,
          date: new Date(),
          service: 'MEET'
        }
      });
    }

    console.log(`✅ Recenzie ${isUpdate ? 'actualizată' : 'creată'} cu succes:`, {
      id: review.id,
      sessionId: sessionId,
      rating: review.rating,
      hasComment: !!review.comment,
      date: review.date.toISOString()
    });

    // Calculează noile statistici pentru provider
    const providerStats = await prisma.review.aggregate({
      where: {
        providerId: providerId
      },
      _count: {
        id: true
      },
      _avg: {
        rating: true
      }
    });

    const responseData = {
      success: true,
      action: isUpdate ? 'updated' : 'created',
      review: {
        id: review.id,
        sessionId: sessionId,
        rating: review.rating,
        comment: review.comment,
        date: review.date.toISOString()
      },
      providerStats: {
        totalReviews: providerStats._count.id || 0,
        averageRating: providerStats._avg.rating || 0
      },
      message: `Recenzia a fost ${isUpdate ? 'actualizată' : 'salvată'} cu succes!`
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("❌ Eroare la salvarea recenziei:", error);
    
    // Safer error logging
    if (error && typeof error === 'object') {
      console.error("❌ Error details:", {
        message: error.message || 'Unknown error',
        code: error.code || 'Unknown code',
        stack: error.stack || 'No stack trace'
      });
    }
    
    // Verifică dacă este o eroare de constraint unique pentru sessionId
    if (error?.code === 'P2002' && error?.meta?.target?.includes('sessionId')) {
      return NextResponse.json({
        error: "Această sesiune are deja o recenzie"
      }, { status: 409 });
    }
    
    // Verifică dacă este o eroare de constraint unique generală
    if (error?.code === 'P2002') {
      return NextResponse.json({
        error: "Ați lăsat deja o recenzie pentru această sesiune"
      }, { status: 409 });
    }
    
    return NextResponse.json(
      { 
        error: "Eroare internă la salvarea recenziei",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru ștergerea recenziilor
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const reviewId = url.searchParams.get('reviewId');
    const sessionId = url.searchParams.get('sessionId');

    // Allow deletion by reviewId OR sessionId
    if (!reviewId && !sessionId) {
      return NextResponse.json({ 
        error: "reviewId sau sessionId este obligatoriu" 
      }, { status: 400 });
    }

    let review;

    if (reviewId) {
      // Find by review ID
      review = await prisma.review.findUnique({
        where: { id: reviewId }
      });
    } else if (sessionId) {
      // Find by session ID
      review = await prisma.review.findUnique({
        where: { sessionId: sessionId }
      });
    }

    if (!review) {
      return NextResponse.json({ 
        error: "Recenzia nu a fost găsită" 
      }, { status: 404 });
    }

    if (review.fromUserId !== userId) {
      return NextResponse.json({ 
        error: "Nu aveți dreptul să ștergeți această recenzie" 
      }, { status: 403 });
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: review.id }
    });

    console.log(`🗑️ Recenzie ștearsă cu succes: ${review.id} pentru sesiunea ${review.sessionId}`);

    return NextResponse.json({
      success: true,
      message: "Recenzia a fost ștearsă cu succes"
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Eroare la ștergerea recenziei:", error);
    
    return NextResponse.json(
      { 
        error: "Eroare internă la ștergerea recenziei",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru obținerea recenziilor
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const sessionId = url.searchParams.get('sessionId');

    let whereClause: any = { fromUserId: userId };

    if (providerId) {
      whereClause.providerId = providerId;
    }

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        provider: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        session: {
          select: {
            id: true,
            startDate: true,
            status: true,
            isFinished: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({
      reviews: reviews.map(review => ({
        id: review.id,
        sessionId: review.sessionId,
        rating: review.rating,
        comment: review.comment,
        date: review.date.toISOString(),
        provider: {
          id: review.providerId,
          name: review.provider.user.name || review.provider.user.email,
          email: review.provider.user.email
        },
        session: {
          id: review.session.id,
          startDate: review.session.startDate?.toISOString(),
          status: review.session.status,
          isFinished: review.session.isFinished
        }
      }))
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Eroare la obținerea recenziilor:", error);
    
    return NextResponse.json(
      { 
        error: "Eroare internă la obținerea recenziilor",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}