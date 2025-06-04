// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    gender?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      gender?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    gender?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Toate câmpurile sunt obligatorii.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          throw new Error("Email sau parolă incorecte.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("Email sau parolă incorecte.");
        }

        return {
          id: user.id,
          name: user.name ?? "Utilizator",
          email: user.email ?? "",
          image: user.image ?? "",
          role: user.role ?? "STANDARD",
          gender: user.gender ?? "N/A",
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/autentificare",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.gender = user.gender;
      }
      return token;
    },
    async session({ session, token }) {
      // Dacă avem un token.sub (id-ul utilizatorului), preluăm datele actualizate din baza de date
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
            gender: true,
          },
        });
        if (dbUser) {
          session.user.id = token.sub as string;
          session.user.name = dbUser.name;
          session.user.email = dbUser.email;
          session.user.image = dbUser.image;
          session.user.role = dbUser.role;
          session.user.gender = dbUser.gender;
        }
      }
      return session;
    },
  },
};
