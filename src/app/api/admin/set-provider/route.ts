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
  console.log("User email:", userEmail); // ✅ Debugging
  
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
    return new Response(JSON.stringify({ error: "Unauthorized Access" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Preluăm email-ul utilizatorului care urmează să fie modificat și rolul dorit din body
  const { email, role } = await req.json(); 

  if (!email || !role) {
    return new Response(
      JSON.stringify({ error: "Lipsește email-ul sau rolul din request." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userToChange = await prisma.user.findUnique({
    where: { email },
    include: { provider: true },
  });

  if (!userToChange) {
    return new Response(JSON.stringify({ message: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (role === "Client") {
    // Daca utilizatorul este deja provider, il stergem din tabelul Provider
    if (userToChange.provider) {
      await prisma.provider.delete({
        where: { userId: userToChange.id },
      });
    }

    // Setăm rolul la Client
    // await prisma.user.update({
    //   where: { email },
    //   data: { role: "STANDARD" },
    // });

    return new Response(
      JSON.stringify({
        message: "Utilizatorul a fost setat ca Client.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } 

  if (role === "Furnizor") {
    // Dacă userul devine Beneficiar, îl adăugăm în tabelul Provider
    const newProvider = await prisma.provider.create({
      data: {
        userId: userToChange.id,
        description: "Furnizor de servicii",
      },
    });

    // await prisma.user.update({
    //   where: { email },
    //   data: { role: "STANDARD" },
    // });

    return new Response(
      JSON.stringify({
        message: "Utilizatorul a fost setat ca Beneficiar.",
        provider: newProvider
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ error: "Rolul specificat este invalid." }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
