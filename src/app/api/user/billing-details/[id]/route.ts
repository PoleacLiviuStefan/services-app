// File: app/api/user/billing-details/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to extract params
async function extractId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

// 1️⃣ GET
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const id = await extractId(context);
  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Fetch
  try {
    const billingDetails = await prisma.billingDetails.findUnique({
      where: { userId: id },
    });
    return NextResponse.json({ billingDetails }, { status: 200 });
  } catch (err: any) {
    console.error("[billing-details] GET error:", err);
    return NextResponse.json(
      { error: "Eroare la preluarea detaliilor" },
      { status: 500 }
    );
  }
}

// Shared upsert logic for POST and PUT
async function upsertDetails(
  req: NextRequest,
  id: string,
  isUpdate: boolean
) {
  // Authenticate already done in caller
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body invalid JSON" },
      { status: 400 }
    );
  }
  const {
    entityType,
    companyName,
    cif,
    address,
    phone,
    bank,
    iban,
  } = body;
  // Basic required for both types
  if (!companyName?.trim() || !address?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { error: "Lipsește câmpuri obligatorii" },
      { status: 400 }
    );
  }
  // Juridica: require cif, bank, iban
  if (entityType === "persJuridica") {
    if (!cif?.trim() || !bank?.trim() || !iban?.trim()) {
      return NextResponse.json(
        { error: "Lipsește câmpuri obligatorii pentru persoană juridică" },
        { status: 400 }
      );
    }
  }
  try {
    const billingDetails = await prisma.billingDetails.upsert({
      where: { userId: id },
      update: {
        companyName,
        cif: cif ?? "",
        address,
        phone,
        bank: bank ?? "",
        iban: iban ?? "",
      },
      create: {
        userId: id,
        companyName,
        cif: cif ?? "",
        address,
        phone,
        bank: bank ?? "",
        iban: iban ?? "",
      },
    });
    return NextResponse.json(
      { billingDetails },
      { status: isUpdate ? 200 : 201 }
    );
  } catch (err: any) {
    // Avoid null payload logging errors
    try { console.error("[billing-details] UPSERT error:", err); } catch {}
    return NextResponse.json(
      { error: "Eroare la salvare" },
      { status: 500 }
    );
  }
}

// 2️⃣ POST
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const id = await extractId(context);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return upsertDetails(req, id, false);
}

// 3️⃣ PUT
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const id = await extractId(context);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return upsertDetails(req, id, true);
}
