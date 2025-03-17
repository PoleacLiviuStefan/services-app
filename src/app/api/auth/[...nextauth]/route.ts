import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

// Extend the built-in types using module augmentation
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
    }
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
          gender: user.gender ?? "N/A"
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "STANDARD";
        token.gender = user.gender ?? "N/A";
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.sub,
          name: session.user?.name ?? "Utilizator",
          email: session.user?.email ?? "",
          image: session.user?.image ?? "",
          role: token.role ?? "STANDARD",
          gender: token.gender ?? "N/A"
        }
      };
    },
  },
  pages: {
    signIn: "/autentificare",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };