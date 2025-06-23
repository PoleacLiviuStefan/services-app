// app/api/cron/refresh-calendly/route.ts
import { NextResponse } from "next/server";
import { refreshAllExpiredCalendlyTokens } from "@/lib/calendly";

export const runtime  = "edge";                                       // latență minimă :contentReference[oaicite:0]{index=0}
export const revalidate = 0;                                           // dezactivează ISR

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-key");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }
  await refreshAllExpiredCalendlyTokens();                             // logica de refresh din lib/calendly :contentReference[oaicite:1]{index=1}
  return new Response("Calendly tokens refreshed");
}
