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
 * Decodifică slug-ul din URL într-un string cu spații simple și lowercase,
 * păstrând diacriticele:
 * 1. Înlocuiește cratimele cu spațiu.
 * 2. Colapsează orice grup de spații multiple într-unul singur.
 * 3. Taie spațiile de la început și sfârșit.
 * 4. Transformă totul la lowercase (diacriticele rămân).
 *
 * Exemplu:
 *   "vatală-georgiana" → "vatală georgiana"
 */
function decodeSlugToName(slug: string): string {
  return slug
    .replace(/-/g, " ")    // toate cratimele devin spațiu
    .replace(/\s+/g, " ")  // collapse grupuri de spații multiple
    .trim()                // elimină spațiile de la margină
    .toLowerCase();        // lowercase, dar diacriticele rămân
}

/**
 * Normalizează exact cum va fi comparat cu decodedSlugToName:
 * 1. Înlocuiește cratimele (dacă există) cu spațiu.
 * 2. Colapsează orice grup de spații multiple într-unul singur.
 * 3. Taie spațiile de la început și sfârșit.
 * 4. Transformă totul la lowercase (diacriticele rămân).
 *
 * Astfel, "Vatală  Georgiana" (cu două spații și diacritice) devine "vatală georgiana".
 */
function normalizeDbName(dbName: string): string {
  return dbName
    .replace(/-/g, " ")    // dacă există cratimă în DB, facem spațiu
    .replace(/\s+/g, " ")  // collapse spații multiple
    .trim()                // elimină spațiile de la margină
    .toLowerCase();        // lowercase, dar diacriticele rămân
}

/**
 * Caută user-ul în baza de date într-un mod tolerant la spații multiple și păstrând diacritice:
 * 1. decodeSlugToName(slug) → decodedName (ex. "vatală georgiana").
 * 2. Împarte decodedName în cuvinte: ["vatală", "georgiana"].
 * 3. Rulează findMany cu AND: [
 *      { name contains "vatală" }, 
 *      { name contains "georgiana" }
 *    ] (toate căutările case-insensitive).
 * 4. Din candidați, normalizăm fiecare `u.name` cu normalizeDbName și comparăm EXACT cu decodedName.
 *    Dacă se potrivește, returnăm acel user.
 * 5. Dacă nimeni nu se potrivește, returnăm null.
 */
async function findUserBySlug(slug: string) {
  const decodedName = decodeSlugToName(slug); // ex. "vatală georgiana"
  console.log("Decoded name:", decodedName);
  const words = decodedName.split(" ");       // ex. ["vatală", "georgiana"]

  if (words.length === 0) return null;

  // Interogăm pe baza fiecărui cuvânt, case-insensitive:
  const candidates = await prisma.user.findMany({
    where: {
      AND: words.map((w) => ({
        name: { contains: w, mode: "insensitive" },
      })),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      provider: {
        select: {
          id: true,
          online: true,
          description: true,
          videoUrl: true,
          grossVolume: true,
          calendlyCalendarUri: true,
          stripeAccountId: true,
          reading: { select: { id: true, name: true, description: true } },
          specialities: { select: { id: true, name: true, description: true, price: true } },
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

  // Filtrăm candidații: normalizăm u.name și comparăm exact cu decodedName
  for (const u of candidates) {
    if (normalizeDbName(u.name) === decodedName) {
      return u;
    }
  }

  return null;
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
  const user = await findUserBySlug(slug);

  if (!user || !user.provider) {
    const decoded = decodeSlugToName(slug);
    return NextResponse.json(
      { error: `Providerul pentru '${decoded}' nu a fost găsit.` },
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
  const user = await findUserBySlug(slug);

  if (!user) {
    return NextResponse.json({ error: "User nu a fost găsit." }, { status: 404 });
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
