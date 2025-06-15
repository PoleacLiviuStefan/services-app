// app/api/provider/[providerId]/availability/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fetch from "node-fetch"; // în runtime nodejs

export const runtime = "nodejs";
export async function GET(
  _: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;
  const prov = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!prov?.isCalendlyConnected || !prov.calendlyAccessToken) {
    return NextResponse.json({ error: "Furnizor neconectat la Calendly" }, { status: 400 });
  }

  // Exemplu de URL; în realitate poate fi: 
  // https://api.calendly.com/event_types/<eventTypeUrn>/availability?start_time=...
  const url = `https://api.calendly.com/event_types/${encodeURIComponent(prov.calendlyEventTypeUri!)}/availability`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${prov.calendlyAccessToken}` }
  });
  if (!resp.ok) {
    console.error(await resp.text());
    return NextResponse.json({ error: "Nu am putut obține slot-urile." }, { status: 502 });
  }
  const json = await resp.json();
  return NextResponse.json(json);
}
