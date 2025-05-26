import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountParam = searchParams.get('amount');
  const destination = searchParams.get('destination_account') || undefined;
  const amount = amountParam ? parseInt(amountParam, 10) : 0;
  const currency = searchParams.get('currency') ?? 'eur';

  if (!amount || isNaN(amount)) {
    return NextResponse.json({ error: 'Parametru "amount" invalid sau lipsă' }, { status: 400 });
  }
  if (!destination) {
    return NextResponse.json({ error: 'Parametru "destination_account" lipsă' }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      transfer_data: { destination },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Eroare la crearea PaymentIntent' }, { status: 500 });
  }
}