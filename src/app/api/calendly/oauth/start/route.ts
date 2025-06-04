// File: app/api/calendly/oauth/start/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

export async function GET(req: NextRequest) {
  // 1. Generăm PKCE codes
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 2. Construim răspunsul JSON și setăm cookie-ul
  const response = NextResponse.json({ codeChallenge });

  response.cookies.set({
    name:     "calendly_code_verifier",
    value:    codeVerifier,
    httpOnly: true,
    path:     "/",
    maxAge:   300,           // expiră în 5 minute
    secure:   false,         // OK pe HTTP local
    sameSite: "lax",         // Lax e suficient dacă apelul e tot pe același domeniu
  });

  return response;
}
