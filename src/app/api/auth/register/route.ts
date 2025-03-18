import { prisma } from "@/lib/prisma"; 
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // ✅ Trebuie să folosești .json() în loc de req.body în App Router
    const { nume, prenume, email, parola, dataNasterii, gen } = body;

    // Verifică dacă utilizatorul există deja
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: "Utilizatorul există deja" }), { status: 400 });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(parola, saltRounds);

    // Creează utilizatorul în baza de date
    const user = await prisma.user.create({
      data: {
        name: `${nume} ${prenume}`,
        email,
        password: hashedPassword,
        birthDate: new Date(dataNasterii),
        gender: gen
      },
    });

    return new Response(JSON.stringify(user), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: `A apărut o eroare la înregistrare ${error}` }), { status: 500 });
  }
}
