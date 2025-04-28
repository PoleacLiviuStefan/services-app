import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return new Response(
      JSON.stringify({
        error: "Authentication is required to access this resource.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userEmail = session.user.email;

  try {
    // Obținem utilizatorul din baza de date împreună cu Provider-ul său (dacă există)
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { provider: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "The User was not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.provider) {
      return new Response(JSON.stringify({ error: "The User is not a Provider" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const providerId = user.provider.id;

    // Datele care pot fi actualizate
    const {
      description,
      mainToolId,
      mainSpecialityId,
      reading,
    } = await req.json();

    // Construim obiectul de update din câmpurile trimise (dacă sunt prezente)
    const updateData: any = {};

    if (description) updateData.description = description;
    if (mainToolId) updateData.mainToolId = mainToolId;
    if (mainSpecialityId) updateData.mainSpecialityId = mainSpecialityId;
    if (mainSpecialityId) updateData.mainSpecialityId = mainSpecialityId;
    if (reading) updateData.reading = reading;
    // Actualizarea providerului
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: updateData,
    });

    return new Response(
      JSON.stringify({
        message: "Setările Providerului au fost actualizate cu succes.",
        provider: updatedProvider,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Eroare la actualizarea Providerului:", error);
    return new Response(
      JSON.stringify({
        error: "A apărut o eroare la actualizarea Providerului.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
