// app/api/stripe/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amountParam = searchParams.get("amount");
    const currency = searchParams.get("currency") ?? "ron";

    // Validare amount
    const amount = amountParam ? parseInt(amountParam, 10) : NaN;
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Parametru "amount" invalid sau lipsă' },
        { status: 400 }
      );
    }

    // Creăm PaymentIntent standard pe contul platformei
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    }); // Stripe va încasa întreaga sumă către platformă citestripe_docs_payment_intent_1

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret, currency },
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
