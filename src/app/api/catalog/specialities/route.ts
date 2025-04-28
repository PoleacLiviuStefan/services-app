import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const specialities = await prisma.speciality.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        provider: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      },
    });

    return new Response(JSON.stringify(specialities), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Eroare la obținerea specialităților:", error);
    return new Response(
      JSON.stringify({ error: "A apărut o eroare la obținerea serviciilor." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
