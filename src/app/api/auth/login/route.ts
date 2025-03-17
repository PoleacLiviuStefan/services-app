// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Căutăm utilizatorul după email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Dacă utilizatorul nu există sau nu are parolă, returnăm eroare
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Utilizatorul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Verificăm dacă parola introdusă este corectă
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credențiale invalide" },
        { status: 401 }
      );
    }

    // Dacă autentificarea e reușită, eliminăm parola din obiectul user
    const { password: _password, ...userWithoutPassword } = user;

    // Poți alege să creezi o sesiune sau să returnezi un token JWT aici,
    // însă pentru exemplu returnăm doar datele utilizatorului.
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error:unknown) {
    return NextResponse.json(
      { error: "A apărut o eroare la autentificare", message: error },
      { status: 500 }
    );
  }
}
