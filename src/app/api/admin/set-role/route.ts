import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return new Response(
      JSON.stringify({
        error: "Trebuie să fii autentificat pentru a accesa această resursă.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userEmail = session?.user?.email;
  console.log("User email:", userEmail);

  // Verificăm dacă utilizatorul curent este ADMIN
  const user = await prisma.user.findUnique({
    where: { email: userEmail as string },
    select: { role: true },
  });

  if (!user) {
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Acces interzis. Doar adminii pot schimba rolurile altor utilizatori." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, role } = await req.json();
  console.log("role este: ",role)
  if (!email || !role) {
    return new Response(
      JSON.stringify({ error: "Lipsește email-ul sau rolul din request." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Preluăm utilizatorul care urmează să fie modificat
  const userToChange = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToChange) {
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role },
  });

  return new Response(
    JSON.stringify({
      message: `Rolul utilizatorului a fost setat la ${role}.`,
      user: updatedUser,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
