'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../components/CheckoutForm';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string>('');
  const accountId = 'acct_...'; // ID-ul contului Connect salvat

  useEffect(() => {
    fetch(
      `/api/stripe/create-payment-intent?amount=5000&destination_account=${accountId}`
    )
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [accountId]);

  return (
    <div>
      <h1>Finalizează comanda</h1>
      <a href={`https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID}&scope=read_write`}>Conectează cont Stripe</a>
      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
}