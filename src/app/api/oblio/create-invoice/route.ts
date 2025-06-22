// File: app/api/oblio/create-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import OblioApi from "@obliosoftware/oblioapi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/mail";

const oblio = new OblioApi(
  process.env.OBLIO_CLIENT_ID!,
  process.env.OBLIO_CLIENT_SECRET!
);

export async function POST(req: NextRequest) {
  // 1. Autentificare
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalid JSON" }, { status: 400 });
  }
  const { packageId, products, issueDate, dueDate } = body;
  if (!packageId || !Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { error: "Lipsește packageId sau produse" },
      { status: 400 }
    );
  }

  // 3. Verifică pachet achiziționat
  const userPkg = await prisma.userProviderPackage.findFirst({
    where: { packageId: packageId, userId },
  });
  if (!userPkg) {
    return NextResponse.json(
      { error: `Nu ai cumpărat pachetul cu id=${packageId}` },
      { status: 400 }
    );
  }

  // 4. Preia detaliile de facturare ale utilizatorului
  const billing = await prisma.billingDetails.findUnique({
    where: { userId },
  });
  if (!billing) {
    return NextResponse.json(
      { error: "Nu există detaliile de facturare pentru acest utilizator" },
      { status: 400 }
    );
  }
  console.log("billing este: ",billing)
  
  // 5. Pregătire payload Oblio (client = cumpărător)
  const vatPayer = billing.bank?.trim() && billing.iban?.trim() ? 1 : 0;
  const clientPayload = {
    cif:      billing.cif,
    name:     billing.companyName,
    email:    session.user.email ?? undefined,
    phone:    billing.phone,
    address:  billing.address,
    vatPayer: vatPayer,
  };

  const invoicePayload = {
    cif:         process.env.OBLIO_CIF!,        // CIF-ul firmei tale
    client:      clientPayload,
    issueDate:   issueDate || new Date().toISOString().slice(0, 10),
    dueDate:     dueDate   || new Date().toISOString().slice(0, 10),
    seriesName:  process.env.OBLIO_SERIES_NAME!,
    language:    "RO",
    precision:   2,
    currency:    "RON",
    products,
    workStation: "Sediu",
    useStock:    0,
  };

  // 6. Emitere factură la Oblio
  let oblioData;
  try {
    const resp = await oblio.createInvoice(invoicePayload);
    oblioData = resp.data;
  } catch (err: any) {
    console.error("[create-invoice] Oblio error:", err);
    return NextResponse.json(
      { error: err.message || "Eroare la Oblio" },
      { status: err.statusCode || 500 }
    );
  }

  // 7. Salvare în DB legată de UserProviderPackage
  let invoiceRecord;
  try {
    invoiceRecord = await prisma.invoice.create({
      data: {
        number:    oblioData.number,
        url:       oblioData.link,
        packageId: userPkg.id,
      },
    });
  } catch (dbErr: any) {
    console.error("[create-invoice] DB error:", dbErr);
    return NextResponse.json(
      {
        error:  "Factura emisă, dar nu s-a putut salva în DB",
        detail: dbErr.message,
      },
      { status: 500 }
    );
  }

try {
    const customerEmail = session.user.email!;
    await sendInvoiceEmail(customerEmail, oblioData.number, oblioData.link);
  } catch (mailErr: any) {
    console.error("[create-invoice] Email error:", mailErr);
    // Nu blocăm răspunsul — factura tot s-a emis și s-a salvat în DB
  }

  // 9. Răspuns final
  return NextResponse.json(
    {
      status:        200,
      statusMessage: "Success",
      oblio:         oblioData,
      invoice:       invoiceRecord,
    },
    { status: 200 }
  );
}
