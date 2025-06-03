// File: components/CheckoutForm.tsx
"use client";

import React, { FormEvent, useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import type { PaymentIntentResult } from "@stripe/stripe-js";

interface CheckoutFormProps {
  /** clientSecret primit de la parent */
  clientSecret: string;
  /**
   * Callback executat după confirmarea cu succes a PaymentIntent-ului.
   * Parametrul este ID-ul paymentIntent-ului confirmat.
   */
  onSuccess: (paymentIntentId: string) => void;
  /** Callback executat dacă apare o eroare la confirmarea plății */
  onError?: (message: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  clientSecret,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // După fiecare mount sau când se schimbă clientSecret, afișăm-l în consolă
  useEffect(() => {
    console.log("🔑 CheckoutForm a primit clientSecret:", clientSecret);
  }, [clientSecret]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Verificăm că stripe & elements sunt inițializate
    if (!stripe || !elements) {
      console.warn("⚠️ Stripe sau Elements nu sunt încă gata. Așteaptă să se încarce.");
      setMessage("Stripe nu este încă gata. Încearcă din nou peste câteva secunde.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    console.log("▶️ Încep confirmPayment pentru:", clientSecret);

    // 2. Confirmăm PaymentIntent-ul
    const result: PaymentIntentResult = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Dacă ai nevoie de redirect ulterior, poți adăuga return_url
        // return_url: "https://exemplu.ro/success",
      },
      redirect: "if_required",
    });

    // 3. Analizăm răspunsul
    if (result.error) {
      console.error("❌ Stripe confirmPayment a returnat eroare:", result.error);
      // Construim un mesaj detaliat
      const code = result.error.code ?? "unknown_error";
      const decline = (result.error as any).decline_code ?? null;
      const param = result.error.param ?? null;
      const fullMsg = `[${code}] ${result.error.message}` + (decline ? ` (decline_code: ${decline})` : "") + (param ? ` (param: ${param})` : "");

      setMessage(fullMsg);
      onError?.(fullMsg);
    } else if (result.paymentIntent) {
      console.log("✅ PaymentIntent confirmat:", result.paymentIntent.id);
      onSuccess(result.paymentIntent.id);
    } else {
      // Situatie rară: nici eroare, nici paymentIntent
      console.warn("⚠️ confirmPayment nu a returnat nici PaymentIntent, nici error");
      setMessage("Plata nu a putut fi procesată. Încearcă din nou.");
      onError?.("PaymentIntent result neprevăzut");
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "400px", margin: "0 auto" }}>
      <div className="mb-4">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || isLoading}
        style={{
          width: "100%",
          marginTop: "10px",
          padding: "10px",
          backgroundColor: isLoading ? "#ccc" : "#556cd6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: !stripe || isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Procesare plată…" : "Plătește"}
      </button>
      {message && (
        <div
          role="alert"
          style={{
            color: "red",
            marginTop: "12px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
