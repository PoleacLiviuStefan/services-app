// app/api/users/by-slug/[slug]/route.ts - Fixed for Next.js 15+ with safe error handling
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isValidSlug } from '@/utils/userResolver';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Validează formatul slug-ului
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { success: false, error: 'Invalid slug format' },
        { status: 400 }
      );
    }

    console.log('Searching for user with slug:', slug);

    // Caută utilizatorul după slug
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        image: true,
        role: true
      }
    });

    if (!user) {
      console.log('User not found with slug:', slug);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found:', user.name);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        slug: user.slug,
        email: user.email,
        image: user.image,
        role: user.role
      }
    });

  } catch (error) {
    // Safe error logging
    console.log('Error finding user by slug - Raw error type:', typeof error);
    
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      if (error.stack) {
        console.log('Error stack:', error.stack);
      }
    } else if (error !== null && error !== undefined) {
      console.log('Non-Error object:', String(error));
    } else {
      console.log('Null or undefined error occurred');
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to find user' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}