import { prisma } from '@/lib/prisma';
import { isError } from '@/utils/util';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const speciality = searchParams.get('speciality');
    const tool = searchParams.get('tool');
    const reading = searchParams.get('reading');
    const search = searchParams.get('search') || '';
    console.log("search este: ",search);
    const providers = await prisma.provider.findMany({
      where: {
        AND: [
          search
            ? {
                user: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              }
            : {},
          speciality
            ? {
                specialities: {
                  some: {
                    name: {
                      contains: speciality,
                      mode: 'insensitive',
                    },
                  },
                },
              }
            : {},
          tool
            ? {
                tools: {
                  some: {
                    name: {
                      contains: tool,
                      mode: 'insensitive',
                    },
                  },
                },
              }
            : {},
          reading
            ? {
                reading: {
                  name: {
                    contains: reading,
                    mode: 'insensitive',
                  },
                },
              }
            : {},
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            gender: true,
          },
        },
        tools: true,
        specialities: true,
        reading: true,
      },
    });

    return new Response(JSON.stringify({ providers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    console.error('Eroare la obținerea providerilor:', message);
  
    return new Response(
      JSON.stringify({ error: 'A apărut o eroare la obținerea providerilor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
