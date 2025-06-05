// File: components/BuyPackageModal.tsx
"use client";

import React, { FC, useState, useEffect } from "react";
import PackageCard from "./PackageCard";
import { Package } from "@/interfaces/PackageInterface";
import { useSession } from "next-auth/react";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./CheckoutForm";

// Încarcă Stripe.js cu cheia publicabilă
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface BuyPackageModalProps {
  providerStripeAccountId?: string | null;
  providerId: string;
  packages: Package[];
  isOpen: boolean;
  onClose: () => void;
}

const BuyPackageModal: FC<BuyPackageModalProps> = ({
  providerStripeAccountId,
  providerId,
  packages,
  isOpen,
  onClose,
}) => {
  const { data: session } = useSession();
  console.log("session:", session);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Ținem suma totală și comisionul (în subunități)
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [currentFeeAmount, setCurrentFeeAmount] = useState<number>(0);

  // Resetăm la deschiderea modalului
  useEffect(() => {
    if (isOpen) {
      setSelectedPackageId(null);
      setClientSecret(null);
      setError(null);
      setPaymentSuccess(false);
      setCurrentAmount(0);
      setCurrentFeeAmount(0);
    }
  }, [isOpen]);

  // 1. Conectare Stripe (dacă nu există providerStripeAccountId)
  const handleConnect = async () => {
    if (!providerStripeAccountId) {
      setError("Contul Stripe al furnizorului nu există. Crează contul Connect mai întâi.");
      return;
    }
    try {
      const resp = await fetch(
        `/api/stripe/connect/account-link?accountId=${providerStripeAccountId}`
      );
      const data = await resp.json();
      console.log("account-link răspuns:", data);
      if (data.error || !data.url) {
        setError(data.error || "Eroare la generarea link-ului de conectare Stripe.");
        return;
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error("handleConnect error:", err);
      setError(err.message || "Eroare neașteptată la conectarea Stripe.");
    }
  };

  // 2. Când userul apasă "Cumpără" pe un pachet
  const handleBuy = async (pkgId: string) => {
    setError(null);
    setPaymentSuccess(false);
    setSelectedPackageId(pkgId);
    setClientSecret(null);

    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) {
      setError("Pachetul selectat nu există.");
      return;
    }
    if (!providerStripeAccountId) {
      setError("Contul Stripe al furnizorului nu este configurat.");
      return;
    }

    // Calculăm sume (în subunități)
    const amountInCents = Math.round(pkg.price * 100);
    const feeAmount = Math.round((amountInCents * 10) / 100);

    setCurrentAmount(amountInCents);
    setCurrentFeeAmount(feeAmount);

    try {
      const params = new URLSearchParams({
        amount: amountInCents.toString(),
        currency: "ron",
        fee_percent: "10",
      });

      const resp = await fetch(`/api/stripe/create-payment-intent?${params.toString()}`, {
        method: "GET",
      });
      const data = await resp.json();
      console.log("create-payment-intent răspuns:", data);

      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError("Nu am primit clientSecret de la server.");
      }
    } catch (err: any) {
      console.error("handleBuy error:", err);
      setError(err.message || "Eroare la solicitarea clientSecret.");
    }
  };

  // 3. Callback când CheckoutForm confirmă plata
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log("🔔 handlePaymentSuccess a fost apelat cu ID:", paymentIntentId);
console.log("  session.user.id:", session?.user?.id);
console.log("  providerId:", providerId);
console.log("  selectedPackageId:", selectedPackageId);
console.log("  providerStripeAccountId:", providerStripeAccountId)
    if (!session?.user?.id) {
      setError("Trebuie să fii autentificat pentru a finaliza comanda.");
      console.log("Trebuie să fii autentificat pentru a finaliza comanda.")
      return;
    }
    if (!providerId || !selectedPackageId) {
      setError("Date incomplete pentru finalizarea comenzii.");
      console.log("Date incomplete pentru finalizarea comenzii.")
      return;
    }
    if (!providerStripeAccountId) {
      setError("Contul Stripe al furnizorului nu este configurat.");
      console.log("Contul Stripe al furnizorului nu este configurat.")
      return;
    }

    // 3.2. Creăm transferul către furnizor (toți banii minus comision)
    const transferAmount = currentAmount - currentFeeAmount;
    console.log("⚙️ Transfer către furnizor:", {
      paymentIntentId,
      destinationAccount: providerStripeAccountId,
      transferAmount,
    });

    try {
      console.log("inainte de request")
      const respTransfer = await fetch("/api/stripe/create-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          destinationAccount: providerStripeAccountId,
          transferAmount: transferAmount,
        }),
      });
      const jsonTransfer = await respTransfer.json();
      console.log("create-transfer răspuns:", jsonTransfer);

      if (!respTransfer.ok) {
        setError(jsonTransfer.error || "Eroare la transferul către furnizor.");
        return;
      }

      // 3.3. După transfer, salvăm în baza de date pachetul cumpărat
      const respPurchase = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          providerId: providerId,
          packageId: selectedPackageId,
        }),
      });
      const jsonPurchase = await respPurchase.json();
      console.log("purchase răspuns:", jsonPurchase);

      if (!respPurchase.ok) {
        setError(jsonPurchase.error || "Eroare la activarea pachetului.");
        return;
      }

      // 3.4. Totul a mers bine → închidem modalul
      setPaymentSuccess(true);
      onClose(); // închide modalul
    } catch (err: any) {
      console.error("handlePaymentSuccess error:", err);
      setError(err.message || "Eroare neașteptată la finalizarea comenzii.");
    }
  };

  const handlePaymentError = (msg: string) => {
    console.error("handlePaymentError:", msg);
    setError(msg);
  };

  // 3.5. Dacă userul dă "Renunță" înainte de confirmare
  const handleCancelPayment = () => {
    setSelectedPackageId(null);
    setClientSecret(null);
    setError(null);
    setPaymentSuccess(false);
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Butonul de închidere */}
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Achiziție pachet</h2>

          {/* Dacă furnizorul n-are cont Stripe, buton de conectare */}
          {!providerStripeAccountId && !paymentSuccess && (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-red-600">
                Furnizorul nu este conectat la Stripe.
              </p>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleConnect}
              >
                Conectează-te la Stripe
              </button>
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded mt-4">{error}</div>
              )}
            </div>
          )}

          {/* Dacă există providerStripeAccountId, afișăm lista de pachete */}
          {providerStripeAccountId && !selectedPackageId && !paymentSuccess && (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onBuy={handleBuy} />
              ))}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded mt-4">{error}</div>
              )}
            </div>
          )}

          {/* După ce userul a ales un pachet, așteptăm clientSecret sau eroare */}
          {selectedPackageId && !clientSecret && !paymentSuccess && (
            <div className="mt-4 text-center">
              {error ? (
                <div className="p-3 bg-red-100 text-red-700 rounded">
                  {error}
                  <button
                    onClick={handleCancelPayment}
                    className="block mt-3 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Înapoi la pachete
                  </button>
                </div>
              ) : (
                <p>Se pregătește formularul de plată…</p>
              )}
            </div>
          )}

          {/* Dacă avem clientSecret, montăm Stripe Elements */}
          {selectedPackageId && clientSecret && !paymentSuccess && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">
                Confirmă plata pentru “{packages.find((p) => p.id === selectedPackageId)?.service}”
              </h3>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Renunță și alege alt pachet
                </button>
              </Elements>
            </div>
          )}

          {/* Mesaj de succes după transfer+salvare și modal închis */}
          {paymentSuccess && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
              Pachetul a fost activat cu succes! Modalul se va închide acum.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyPackageModal;
