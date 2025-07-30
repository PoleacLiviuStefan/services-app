import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth"; // Importă configurația NextAuth
import { isError } from "@/utils/helper";

export async function GET() {
  try {
    // Obține sesiunea utilizatorului
    const session = await getServerSession(authOptions);
    console.log("Session:", session); // ✅ Debugging

    if (!session || !session.user?.email) {
      return new Response(JSON.stringify({ error: "Trebuie să fii autentificat pentru a accesa această resursă." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
    }

    const userEmail = session?.user?.email;
    console.log("User email:", userEmail); // ✅ Debugging

    // Caută utilizatorul în baza de date pentru a verifica rolul său
    const user = await prisma.user.findUnique({
      where: { email: userEmail as string },
      select: { role: true },
    });

    console.log("User:", user); // ✅ Debugging

    if (!user || user?.role !== "ADMIN") {
      return new Response(JSON.stringify({error: "Nu ai permisiunea de a accesa această resursă."}), { status: 403 });
    }

    // 🆕 QUERY MODIFICAT pentru a include rating și reviewsCount
    const users = await prisma.user.findMany({
      where: {},
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        gender: true,
        provider: {
          select: {
            id: true,
            online: true,
            description: true,
            grossVolume: true, // ✅ Deja inclus pentru venituri
            tools: {
              select: {
                id: true,
                name: true
              }
            },
            specialities: {  // ✅ Relația acum este recunoscută corect
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            // 🆕 ADĂUGAT: Reviews pentru calculul rating-ului
            reviews: {
              select: {
                rating: true
              }
            },
            // 🆕 ADĂUGAT: Count pentru numărul total de recenzii
            _count: {
              select: {
                reviews: true
              }
            }
          }
        }
      }
    });

    console.log("Users raw:", users); // ✅ Debugging

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: "Nu s-au găsit utilizatori." }), { status: 404 });
    }

    // 🆕 PROCESEAZĂ datele pentru a calcula rating-ul mediu și adăuga reviewsCount
    const processedUsers = users.map(user => {
      if (!user.provider) {
        return user; // Dacă nu e provider, returnează user-ul ca atare
      }

      // Calculează rating-ul mediu din recenzii
      const reviews = user.provider.reviews;
      let averageRating = 0;
      const reviewsCount = user.provider._count.reviews;

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = Number((totalRating / reviews.length).toFixed(1));
      }

      return {
        ...user,
        provider: {
          ...user.provider,
          // 🆕 Adaugă rating-ul calculat
          rating: averageRating,
          // 🆕 Adaugă numărul de recenzii
          reviewsCount: reviewsCount,
          // Elimină datele procesate pentru a nu polua răspunsul
          reviews: undefined,
          _count: undefined
        }
      };
    });

    console.log("Users processed:", processedUsers); // ✅ Debugging pentru datele procesate

    return new Response(JSON.stringify({ users: processedUsers }), { 
      status: 200,
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);

    console.error('Eroare la obținerea providerilor:', message);

    return new Response(JSON.stringify({ error: "A apărut o eroare la obținerea utilizatorilor." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }, 
    });
  }
}