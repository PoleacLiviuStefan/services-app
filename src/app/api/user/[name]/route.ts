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
 * Decodifică slug-ul din URL înapoi într-un string cu spații simple și lowercase:
 * 1. Înlocuiește cratimele cu spațiu.
 * 2. Colapsează orice grup de spații multiple într-unul singur.
 * 3. Elimină diacriticele.
 * 4. Taie spațiile de la început/sfârșit și pune totul în lowercase.
 *
 * Din slug-ul "precup-carmen-cristina" rezultă "precup carmen cristina".
 */
function decodeSlugToName(slug: string): string {
  let decoded = slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  decoded = decoded
    .normalize("NFD")               // desparte diacriticele
    .replace(/[\u0300-\u036f]/g, ""); // elimină semnele diacritice

  return decoded.toLowerCase();
}

/**
 * Pentru fiecare `user.name` din DB (care poate conține două spații,
 * diacritice etc.), aplicăm aceleași transformări de “normalizare”:
 * 1. Collapsează spațiile multiple într-unul singur,
 * 2. Elimină diacriticele,
 * 3. Taie spații la început și sfârșit,
 * 4. Lowercase.
 *
 * Astfel, de exemplu "Precup  Carmen  Cristină" devine "precup carmen cristina".
 */
function normalizeDbName(dbName: string): string {
  return dbName
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Găsește user-ul în mod tolerant la spații multiple.
 * Pasul 1: decodăm slug-ul → decodedName (ex. "precup carmen cristina").
 * Pasul 2: spargem decodedName în cuvinte → ["precup","carmen","cristina"].
 * Pasul 3: facem un findMany cu `AND: [{ name contains "precup" },{ name contains "carmen" },{ name contains "cristina" }]`
 *        (toate căutările sunt case-insensitive).
 * Pasul 4: din lista de candidați, revenim doar cu cel al cărui normalizeDbName(user.name) EXACT egalează decodedName.
 * Dacă nu găsim niciunul, returnăm null.
 */
async function findUserBySlug(slug: string) {
  const decodedName = decodeSlugToName(slug); // "precup carmen cristina"
  const words = decodedName.split(" ");       // ["precup","carmen","cristina"]

  // Dacă slug-ul nu conține niciun cuvânt (ex: slug vid), nu avem ce căuta
  if (words.length === 0) return null;

  // Facem interogarea în baza de date pentru toți userii care au,
  // în câmpul `name`, fiecare dintre cuvintele din `words`.
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

  // Filtrăm candidații pentru a găsi unul al cărui nume, normalizat,
  // este EXACT decodedName.
  for (const u of candidates) {
    if (normalizeDbName(u.name) === decodedName) {
      return u;
    }
  }

  return null;
}

/**
 * GET /api/user/[name]
 * Returnează datele provider-ului (inclusiv toate câmpurile selectate).
 */
export async function GET(
  _req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  const { name: slug } = await params;
  const user = await findUserBySlug(slug);

  // Dacă nu găsește user sau acel user nu are provider, răspundem 404
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
 * Actualizează doar câmpul `online` pentru provider-ul găsit.
 */
export async function PATCH(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  // Citim JSON-ul din corpul cererii
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  // Validăm payload
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

  // Actualizăm câmpul `online` în baza de date
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
 * Redirectează POST către PATCH, pentru cazurile în care clientul trimite POST.
 */
export async function POST(
  req: Request,
  { params }: AsyncRouteContext
): Promise<NextResponse> {
  return PATCH(req, { params });
}
