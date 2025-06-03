// lib/withProviderAuth.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: { providerId: string } };
type Handler = (req: Request, context: Context) => Promise<NextResponse>;

/**
 * withProviderAuth primește un handler de tip:
 *   (req: Request, context: { params: { providerId } }) => Promise<NextResponse>
 * și returnează un handler nou care:
 *   1) așteaptă context.params și obține providerId
 *   2) obține sesiunea NextAuth (401 dacă lipsește)
 *   3) face lookup în prisma.provider după providerId (404 dacă nu există)
 *   4) compară providerRecord.userId cu session.user.id (403 dacă nu coincide)
 *   5) dacă toate check-urile trec, apelează handler-ul original
 */
export function withProviderAuth(handler: Handler): Handler {
  return async (req, context) => {
    // Așteptăm context.params pentru a extrage providerId
    const { providerId } = await context.params;

    // 1) Obținem sesiunea NextAuth
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: login required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const userId = session.user.id;

    // 2) Facem lookup în baza de date după providerId
    const providerRecord = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
    if (!providerRecord) {
      return new NextResponse(
        JSON.stringify({ error: "Provider not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Verificăm dacă user-ul logat e „owner” al acestui provider
    if (providerRecord.userId !== userId) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: nu ai permisiunea necesară" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) Dacă toate verificările trec, apelăm handler-ul original
    return handler(req, context);
  };
}
