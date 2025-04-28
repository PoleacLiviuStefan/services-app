import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const readings = await prisma.reading.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        provider: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return new Response(JSON.stringify(readings), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Eroare la obținerea reading style-urilor:", error);
    return new Response(
      JSON.stringify({ error: "A apărut o eroare la obținerea reading style-urilor." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
