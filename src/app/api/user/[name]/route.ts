// src/app/api/user/[name]/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * În App Router, context.params este un Promise<{ name: string }>.
 */
type AsyncRouteContext = {
  params: Promise<{ name: string }>;
};

/**
 * Caută user-ul în baza de date direct după slug.
 * Acum că avem câmpul slug în DB, nu mai e nevoie de logica complexă de decodificare.
 */
async function findUserBySlug(slug: string) {
  console.log("Căutare user după slug:", slug);
  
  const user = await prisma.user.findUnique({
    where: {
      slug: slug, // Căutare directă după slug
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      slug: true,
      provider: {
        select: {
          id: true,
          online: true,
          description: true,
          videoUrl: true,
          grossVolume: true,
          calendlyCalendarUri: true,
          isCalendlyConnected: true,
          stripeAccountId: true,
          reading: { select: { id: true, name: true, description: true } },
          specialities: {
            select: { id: true, name: true, description: true, price: true },
          },
          tools: { select: { id: true, name: true, description: true } },
          mainSpeciality: { select: { id: true, name: true } },
          mainTool: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
          providerPackages: {
            select: {
              id: true,
              service: true,
              totalSessions: true,
              price: true,
              createdAt: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });

  return user;
}

/**
 * GET /api/user/[name]
 * Returnează datele provider-ului asociat user-ului găsit după slug.
 */
export async function GET(
  _req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  const { name: slug } = await params;
  
  // Decodează slug-ul dacă vine URL-encoded
  const decodedSlug = decodeURIComponent(slug);
  
  const user = await findUserBySlug(decodedSlug);

  if (!user || !user.provider) {
    return NextResponse.json(
      { error: `Providerul pentru slug '${decodedSlug}' nu a fost găsit.` },
      { status: 404 }
    );
  }

  const p = user.provider;
  const reviewsCount = p.reviews.length;
  const avg =
    reviewsCount > 0
      ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
      : 0;
  const averageRating = parseFloat(avg.toFixed(2));

  const payload = {
    id: p.id,
    user: {
      id: user.id,
      name: user.name!,
      email: user.email!,
      image: user.image || null,
      slug: user.slug, // 🆕 Includă slug-ul în răspuns
    },
    online: p.online,
    description: p.description || "",
    videoUrl: p.videoUrl || null,
    grossVolume: p.grossVolume,
    scheduleLink: p.calendlyCalendarUri || null,
    reading: p.reading || null,
    specialities: p.specialities,
    tools: p.tools,
    mainSpeciality: p.mainSpeciality,
    mainTool: p.mainTool,
    reviewsCount,
    averageRating,
    providerPackages: p.providerPackages,
    stripeAccountId: p.stripeAccountId || null,
    isCalendlyConnected: p.isCalendlyConnected || false,
  };

  return NextResponse.json({ provider: payload }, { status: 200 });
}

/**
 * PATCH /api/user/[name]
 * Body: { online: boolean }
 * Actualizează câmpul `online` în provider-ul găsit.
 */
export async function PATCH(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("online" in payload) ||
    typeof (payload as { online: unknown }).online !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Aștept `{ online: boolean }` ca payload." },
      { status: 400 }
    );
  }

  const { name: slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  
  const user = await findUserBySlug(decodedSlug);

  if (!user) {
    return NextResponse.json(
      { error: "User nu a fost găsit." },
      { status: 404 }
    );
  }
  if (!user.provider) {
    return NextResponse.json(
      { error: "Provider pentru acest user nu există." },
      { status: 404 }
    );
  }

  try {
    const updated = await prisma.provider.update({
      where: { userId: user.id },
      data: { online: (payload as { online: boolean }).online },
      select: { online: true },
    });
    return NextResponse.json({ ok: true, online: updated.online });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Provider pentru acest user nu există." },
        { status: 404 }
      );
    }
    console.error("PATCH /api/user/[name] error:", err);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}

/**
 * POST /api/user/[name]
 * Redirecționăm POST către PATCH (pentru cererile care vin cu POST).
 */
export async function POST(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  return PATCH(req, { params });
}