// File: lib/calendlyPKCE.ts
import crypto from "crypto";

/**
 * Generează un code_verifier (string de 128 caractere URL-safe)
 */
export function generateCodeVerifier() {
  // Generăm 32 de bytes random => 43 caractere când e base64-url
  const randomBytes = crypto.randomBytes(32);
  return base64UrlEncode(randomBytes);
}

/**
 * Dintr-un code_verifier, calculăm code_challenge = BASE64URL( SHA256(code_verifier) )
 */
export function generateCodeChallenge(codeVerifier: string) {
  const sha256 = crypto.createHash("sha256").update(codeVerifier).digest();
  return base64UrlEncode(sha256);
}

/**
 * Base64 URL-encode fără padding
 */
function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
