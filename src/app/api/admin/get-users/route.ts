import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth"; // Importă configurația NextAuth
import { isError } from "@/utils/util";

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

    // Selectăm doar utilizatorii care NU sunt ADMIN
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
            description: true,
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
            }
          }
        }
      }
    });
    
    

    console.log("Users:", users); // ✅ Debugging

    if (!users || users.length === 0) { // ❗️Verificare dacă `users` este null sau un array gol
      return new Response(JSON.stringify({ error: "Nu s-au găsit utilizatori." }), { status: 404 });
    }

    return new Response(JSON.stringify({ users }), { 
      status: 200,
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error: unknown) { // 🔍️ Adaugăm tipul `any` pentru eroare
    const message = isError(error) ? error.message : String(error);

    console.error('Eroare la obținerea providerilor:', message);

    return new Response(JSON.stringify({ error: "A apărut o eroare la obținerea utilizatorilor." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }, 
    });
  }
}
