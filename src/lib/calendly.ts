// lib/calendly.ts
import { prisma } from "@/lib/prisma";

// Aceasta e funcția ta de refresh pentru un singur provider:
export async function refreshCalendlyAccessToken(
  providerId: string,
  refreshToken: string
): Promise<string> {
    console.log("crong job running");
  const url = "https://auth.calendly.com/oauth/token";
  const params = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     process.env.CALENDLY_CLIENT_ID!,
    client_secret: process.env.CALENDLY_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!resp.ok) throw new Error(`Calendly refresh failed (${resp.status})`);

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      calendlyAccessToken:  data.access_token,
      calendlyRefreshToken: data.refresh_token,
      calendlyExpiresAt:    expiresAt,
    },
  });

  return data.access_token;
}

// Iar aceasta rulează refresh pentru toți providerii expirați:
export async function refreshAllExpiredCalendlyTokens(): Promise<void> {
  const now = new Date();

  // Găsește toți providerii conectați cu token expirat
  const expiredProviders = await prisma.provider.findMany({
    where: {
      isCalendlyConnected: true,
      calendlyExpiresAt:   { lte: now },
    },
    select: {
      id:                 true,
      calendlyRefreshToken: true,
    },
  });

  for (const prov of expiredProviders) {
    if (!prov.calendlyRefreshToken) continue;
    try {
      await refreshCalendlyAccessToken(prov.id, prov.calendlyRefreshToken);
      console.log(`✅ Refreshed Calendly token for provider ${prov.id}`);
    } catch (err) {
      console.error(`❌ Failed to refresh for provider ${prov.id}:`, err);
    }
  }
}
