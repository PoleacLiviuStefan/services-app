// src/lib/auth.ts - ACTUALIZAT cu slug în sesiune
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { formatForUrl } from "@/utils/helper";

// 🆕 Funcție pentru generarea slug-ului unic
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = formatForUrl(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existingUser = await prisma.user.findFirst({
      where: { slug: slug }
    });
    
    if (!existingUser) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// 🆕 Actualizează type definitions pentru a include slug
declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    gender?: string;
    slug?: string; // 🆕 ADAUGĂ SLUG
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      gender?: string;
      slug?: string; // 🆕 ADAUGĂ SLUG ÎN SESIUNE
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    gender?: string;
    slug?: string; // 🆕 ADAUGĂ SLUG ÎN JWT
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["pkce"],
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
          email: user.email!,
          image: user.image ?? null,
          role: user.role ?? "STANDARD",
          gender: user.gender ?? "N/A",
          slug: user.slug ?? null, // 🆕 INCLUDE SLUG-UL
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

  // Cookie config...
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    stateToken: {
      name: "next-auth.state-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },

  callbacks: {
    // 🆕 Callback pentru generarea slug-ului la înregistrarea cu Google
    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, slug: true, name: true }
          });

          if (existingUser && !existingUser.slug && existingUser.name) {
            const newSlug = await generateUniqueSlug(existingUser.name);
            
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { slug: newSlug }
            });
            
            console.log(`🔧 Slug generat pentru utilizator Google existent: "${existingUser.name}" → "${newSlug}"`);
          }
        } catch (error) {
          console.error("💥 Eroare la generarea slug-ului pentru Google user:", error);
        }
      }
      
      return true;
    },

    // 🆕 JWT callback - include slug-ul în token
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.gender = user.gender;
        token.slug = user.slug; // 🆕 ADAUGĂ SLUG ÎN TOKEN
      }
      return token;
    },
    
    // 🆕 Session callback - include slug-ul în sesiune
    async session({ session, token }) {
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
            gender: true,
            slug: true, // 🆕 INCLUDE SLUG-UL DIN DB
          },
        });
        if (dbUser) {
          session.user.id = token.sub as string;
          session.user.name = dbUser.name;
          session.user.email = dbUser.email;
          session.user.image = dbUser.image;
          session.user.role = dbUser.role;
          session.user.gender = dbUser.gender;
          session.user.slug = dbUser.slug; // 🆕 ADAUGĂ SLUG ÎN SESIUNE
        }
      }
      return session;
    },
  },

  // Events pentru a prinde crearea utilizatorilor noi
  events: {
    async createUser({ user }) {
      console.log("🆕 Utilizator nou creat prin OAuth:", user.email);
      
      if (user.name && user.id) {
        try {
          const newSlug = await generateUniqueSlug(user.name);
          
          await prisma.user.update({
            where: { id: user.id },
            data: { slug: newSlug }
          });
          
          console.log(`✅ Slug generat pentru utilizator nou Google: "${user.name}" → "${newSlug}"`);
          
        } catch (error) {
          console.error("💥 Eroare la generarea slug-ului pentru utilizator nou:", error);
        }
      }
    }
  }
};