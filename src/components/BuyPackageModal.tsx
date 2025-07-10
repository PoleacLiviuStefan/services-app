"use client";

import React, { FC, useState, useEffect } from "react";
import PackageCard from "./PackageCard";
import { Package } from "@/interfaces/PackageInterface";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./CheckoutForm";
import Button from "./atoms/button";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface BuyPackageModalProps {
  providerId: string;
  packages: Package[];
  isOpen: boolean;
  onClose: () => void;
}

const BuyPackageModal: FC<BuyPackageModalProps> = ({
  providerId,
  packages,
  isOpen,
  onClose,
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPackageId(null);
      setClientSecret(null);
      setError(null);
      setProcessing(false);
      setPaymentSuccess(false);
    }
  }, [isOpen]);

  const handleBuy = async (pkgId: string) => {
    const userId = session?.user?.id;
    if (!userId) {
      router.push("/autentificare");
      return;
    }

    setError(null);
    setProcessing(true);
    setPaymentSuccess(false);
    setSelectedPackageId(pkgId);
    setClientSecret(null);

    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) {
      setError("Pachetul selectat nu există.");
      setProcessing(false);
      return;
    }

    const amountInCents = Math.round(pkg.price * 100);

    try {
      // Obţinem clientSecret fără fee_percent citeturn0search0
      const params = new URLSearchParams({
        amount: amountInCents.toString(),
        currency: "ron",
      });

      const resp = await fetch(
        `/api/stripe/create-payment-intent?${params.toString()}`,
        { method: "GET" }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Server error");

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || "Eroare la solicitarea clientSecret.");
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Activăm pachetul în baza de date citeturn0search7
      const respPurchase = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          providerId,
          packageId: selectedPackageId,
          paymentIntentId,
        }),
      });
      const jsonPurchase = await respPurchase.json();
      if (!respPurchase.ok) {
        throw new Error(jsonPurchase.error || "Eroare la activarea pachetului.");
      }

      setPaymentSuccess(true);
      onClose();
    } catch (err: any) {
      setError(err.message || "Eroare la finalizarea comenzii.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
    setProcessing(false);
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
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Achiziție pachet</h2>

          {!selectedPackageId && !paymentSuccess && (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onBuy={handleBuy} />
              ))}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded mt-4">{error}</div>
              )}
            </div>
          )}

          {selectedPackageId && !clientSecret && !paymentSuccess && (
            <div className="mt-4 text-center">
              {processing ? (
                <p>Se pregătește formularul de plată…</p>
              ) : error ? (
                <div className="p-3 bg-red-100 text-red-700 rounded">
                  {error}
                  <button
                    onClick={() => setSelectedPackageId(null)}
                    className="block mt-3 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Înapoi la pachete
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {clientSecret && !paymentSuccess && (
            <div className="flex flex-col items-center w-full mt-6">
              <h3 className="text-lg font-medium mb-2">
                Confirmă plata pentru “
                {packages.find((p) => p.id === selectedPackageId)?.service}”
              </h3>
              <span className="font-bold">
                TOTAL: {packages.find((p) => p.id === selectedPackageId)?.price} RON
              </span>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
              <button
                type="button"
                onClick={() => setSelectedPackageId(null)}
                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Renunță și alege alt pachet
              </button>
            </div>
          )}

          {paymentSuccess && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
              Pachetul a fost activat cu succes!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyPackageModal;
