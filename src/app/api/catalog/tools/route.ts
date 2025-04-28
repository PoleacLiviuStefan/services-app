import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
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

    return new Response(JSON.stringify(tools), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Eroare la obținerea tool-urilor:", error);
    return new Response(
      JSON.stringify({ error: "A apărut o eroare la obținerea uneltelor." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
