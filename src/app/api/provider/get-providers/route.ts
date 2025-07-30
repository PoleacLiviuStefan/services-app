// src/app/api/provider/get-providers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isError } from '@/utils/helper';

export async function GET(req: NextRequest) {
  try {
    const qs              = req.nextUrl.searchParams;
    const specialityParam = qs.get('speciality');
    const toolParam       = qs.get('tool');
    const readingParam    = qs.get('reading');
    const serviceParam    = qs.get('service');
    const search          = qs.get('search') || '';
    const nameParam       = qs.get('name');

    //  --- Extragem parametrul 'limit', dacă există, și îl transformăm în număr ---
    const limitParam = qs.get('limit');
    let take: number | undefined = undefined;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        take = parsed;
      }
    }
    // ------------------------------------------------------------------------------

    // 1) Single provider by name
    if (nameParam) {
      const raw = await prisma.provider.findFirst({
        where: { user: { name: nameParam } },
        include: {
          user:            true,
          reading:         { select: { id: true, name: true, description: true } },
          specialities:    true,
          tools:           true,
          mainSpeciality:  { select: { id: true, name: true } },
          mainTool:        { select: { id: true, name: true } },
          reviews:         { select: { rating: true } },
          providerPackages: {
            select: {
              id: true,
              service: true,
              totalSessions: true,
              price: true,
              expiresAt: true
            }
          }
        }
      });

      if (!raw) {
        return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
      }

      // calculăm average rating
      const count = raw.reviews.length;
      const avg = count > 0
        ? raw.reviews.reduce((sum, r) => sum + r.rating, 0) / count
        : 0;
      const averageRating = parseFloat(avg.toFixed(2));

      // eliminăm array-ul de reviews din obiectul final
      const { reviews, ...provider } = raw;

      return NextResponse.json({
        provider: {
          ...provider,
          reviewsCount: count,
          averageRating
        }
      }, { status: 200 });
    }

    // 2) Filtered list
    const whereClause: any = {
      AND: [
        search
          ? { user: { name: { contains: search, mode: 'insensitive' } } }
          : {},
        specialityParam
          ? {
              specialities: {
                some: { name: { contains: specialityParam, mode: 'insensitive' } }
              }
            }
          : {},
        toolParam
          ? {
              tools: {
                some: { name: { contains: toolParam, mode: 'insensitive' } }
              }
            }
          : {},
        readingParam
          ? { reading: { name: { contains: readingParam, mode: 'insensitive' } } }
          : {},
        serviceParam
          ? { providerPackages: { some: { service: serviceParam as any } } }
          : {}
      ]
    };

    // Construim obiectul de opțiuni pentru prisma.findMany(...)
    const findManyOptions: any = {
      where: whereClause,
      include: {
        user:            true,
        reading:         { select: { id: true, name: true, description: true } },
        specialities:    true,
        tools:           true,
        mainSpeciality:  { select: { id: true, name: true } },
        mainTool:        { select: { id: true, name: true } },
        reviews:         { select: { rating: true } },
        providerPackages: {
          select: {
            id: true,
            service: true,
            totalSessions: true,
            price: true,
            expiresAt: true
          }
        }
      }
    };

    // Dacă 'take' a fost setat (limit), îl adăugăm la opțiuni
    if (take !== undefined) {
      findManyOptions.take = take;
    }

    const rawList = await prisma.provider.findMany(findManyOptions);

    const providers = rawList.map(raw => {
      const count = raw.reviews.length;
      const avg = count > 0
        ? raw.reviews.reduce((sum, r) => sum + r.rating, 0) / count
        : 0;
      const averageRating = parseFloat(avg.toFixed(2));
      const { reviews, ...provider } = raw;
      return {
        ...provider,
        reviewsCount: count,
        averageRating
      };
    });

    return NextResponse.json({ providers }, { status: 200 });

  } catch (error: unknown) {
    console.error(
      'Eroare la obținerea providerilor:',
      isError(error) ? error.message : error
    );
    return NextResponse.json(
      { error: 'A apărut o eroare la obținerea providerilor.' },
      { status: 500 }
    );
  }
}
