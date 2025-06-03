// File: app/api/stripe/create-transfer/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(req: Request) {
  try {
    const { paymentIntentId, destinationAccount, transferAmount } = (await req.json()) as {
      paymentIntentId: string;
      destinationAccount: string;
      transferAmount: number; // în subunități
    };

    if (!paymentIntentId || !destinationAccount || typeof transferAmount !== "number") {
      return NextResponse.json(
        { error: "Lipesc parametri necesari (paymentIntentId, destinationAccount, transferAmount)." },
        { status: 400 }
      );
    }

    // 1. Preluăm PaymentIntent
    //    NU avem nevoie de expand la charges; vom folosi latest_charge
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("🔍 PaymentIntent:", pi);

    // 2. Extragem charge ID din latest_charge
    const chargeId = pi.latest_charge as string | null;
    if (!chargeId) {
      return NextResponse.json(
        { error: "Nu am găsit charge asociat cu acest PaymentIntent (latest_charge lipsă)." },
        { status: 404 }
      );
    }

    const currency = pi.currency;
    console.log("💳 Charge ID extras:", chargeId);
    console.log("💲 Transfer Amount (subunități):", transferAmount, "Currency:", currency);
    console.log("🏁 Destination Account:", destinationAccount);

    // 3. Creăm transferul către furnizor, atașându-l charge-ului
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: currency,
      destination: destinationAccount,
      source_transaction: chargeId,
    });

    console.log("✅ Transfer creat:", transfer);
    return NextResponse.json({ transfer }, { status: 200 });
  } catch (error: any) {
    console.error("Stripe create transfer error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea Transfer", details: error.message },
      { status: 500 }
    );
  }
}
