import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import type { PaymentIntentResult } from '@stripe/stripe-js';
import { FormEvent, useState } from 'react';

interface CheckoutFormProps {
  clientSecret: string;
}

export default function CheckoutForm({ clientSecret }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    const result: PaymentIntentResult = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/result`,
      },
    });

    if (result.error) {
      setMessage(result.error.message ?? 'Eroare la procesare');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || isLoading} style={{ marginTop: '20px' }}>
        {isLoading ? 'Procesare...' : 'Plătește'}
      </button>
      {message && <div role="alert">{message}</div>}
    </form>
  );
}