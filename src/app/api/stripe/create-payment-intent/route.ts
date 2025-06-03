// File: app/api/stripe/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amountParam = searchParams.get("amount");
    const currency = searchParams.get("currency") ?? "eur";
    const feePercentParam = searchParams.get("fee_percent");
    const feePercent = feePercentParam ? parseFloat(feePercentParam) : 10;

    // Validare amount
    const amount = amountParam ? parseInt(amountParam, 10) : NaN;
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Parametru "amount" invalid sau lipsă' },
        { status: 400 }
      );
    }
    if (isNaN(feePercent) || feePercent < 0) {
      return NextResponse.json(
        { error: 'Parametru "fee_percent" invalid' },
        { status: 400 }
      );
    }

    // Calculul comisionului (dar **nu** îl transferăm direct acum)
    const feeAmount = Math.round((amount * feePercent) / 100);

    // Creăm PaymentIntent pe contul platformei (fără transfer_data)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      // Opțional: poți salva metadate, ex: { providerId: "...", packageId: "..." }
      metadata: {
        fee_amount: feeAmount.toString(),
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret, feeAmount, currency },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Stripe create payment intent error:", error);
    return NextResponse.json(
      { error: "Eroare la crearea PaymentIntent", details: error.message },
      { status: 500 }
    );
  }
}
