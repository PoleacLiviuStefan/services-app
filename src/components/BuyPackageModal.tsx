// File: components/BuyPackageModal.tsx
"use client";

import React, { FC, useState, useEffect } from "react";
import PackageCard from "./PackageCard";
import { Package } from "@/interfaces/PackageInterface";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./CheckoutForm";
import Button from "./atoms/button";

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
  const router = useRouter();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [currentFeeAmount, setCurrentFeeAmount] = useState<number>(0);

  const [billingError,setBillingError]=useState("")
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
      if (data.error || !data.url) {
        setError(data.error || "Eroare la generarea link-ului de conectare Stripe.");
        return;
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Eroare neașteptată la conectarea Stripe.");
    }
  };

  const handleBuy = async (pkgId: string) => {
    // 0. Verificare date de facturare
    const userId = session?.user?.id;
    if (!userId) {
      router.push('/autentificare');
      return;
    }
    try {
      const resBD = await fetch(`/api/user/billing-details/${userId}`, { credentials: 'include' });
      if (!resBD.ok) {
        setBillingError("Pentru a achiziționa un pachet, trebuie să completezi detaliile de facturare.");
        return;
      }
      const bdData = await resBD.json();
      if (!bdData.billingDetails) {
        setBillingError("Pentru a achiziționa un pachet, trebuie să completezi detaliile de facturare.");
      }
    } catch {
      setBillingError("Pentru a achiziționa un pachet, trebuie să completezi detaliile de facturare.");
    }

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
      setError(err.message || "Eroare la solicitarea clientSecret.");
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!session?.user?.id || !providerId || !selectedPackageId || !providerStripeAccountId) {
      setError("Date incomplete pentru finalizarea comenzii.");
      return;
    }
    const transferAmount = currentAmount - currentFeeAmount;
    try {
      const respTransfer = await fetch("/api/stripe/create-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          destinationAccount: providerStripeAccountId,
          transferAmount,
        }),
      });
      const jsonTransfer = await respTransfer.json();
      if (!respTransfer.ok) {
        setError(jsonTransfer.error || "Eroare la transferul către furnizor.");
        return;
      }

      const respPurchase = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:    session.user.id,
          providerId,
          packageId: selectedPackageId,
        }),
      });
      const jsonPurchase = await respPurchase.json();
      if (!respPurchase.ok) {
        setError(jsonPurchase.error || "Eroare la activarea pachetului.");
        return;
      }

      setPaymentSuccess(true);
      onClose();

      const pkg = packages.find((p) => p.id === selectedPackageId)!;
      const clientPayload = {
        cif:       session.user.cif ?? "",
        name:      session.user.name ?? "",
        email:     session.user.email ?? "",
        phone:     session.user.phone ?? "",
        vatPayer:  1,
      };
      const productsPayload = [
        {
          name:          pkg.service,
          description:   pkg.description ?? "",
          price:         pkg.price.toString(),
          measuringUnit: "buc",
          currency:      "RON",
          vatName:       "Normala",
          vatPercentage: 19,
          vatIncluded:   true,
          quantity:      1,
          productType:   "Serviciu",
        },
      ];

      const respInvoice = await fetch("/api/oblio/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackageId,
          client:    clientPayload,
          products:  productsPayload,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate:   new Date().toISOString().slice(0, 10),
        }),
      });
      const invoiceResult = await respInvoice.json();
      if (!respInvoice.ok) {
        console.error("Eroare la generare factură:", invoiceResult);
      } else {
        console.log("Factura generată cu succes:", invoiceResult);
      }
    } catch (err: any) {
      setError(err.message || "Eroare neașteptată la finalizarea comenzii.");
    }
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
  };

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
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Achiziție pachet</h2>
          {billingError &&<div> <h3 className="text-red-500">{billingError}</h3> <Button className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-2 lg:px-4 py-1 lg:py-2 text-md text-white font-semibold" onClick={()=>router.push('/profil?tab=billing')}>Completeaza Datele</Button></div>}
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

          {selectedPackageId && clientSecret && !paymentSuccess && !billingError && (
            <div className="flex flex-col items-center w-full mt-6">
              <h3 className="text-lg font-medium mb-2">
                Confirmă plata pentru “{packages.find((p) => p.id === selectedPackageId)?.service}”
              </h3>
              <span className="font-bold">
                TOTAL: {packages.find((p) => p.id === selectedPackageId)?.price} RON
              </span>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} onError={handlePaymentError} />
                <button type="button" onClick={handleCancelPayment} className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Renunță și alege alt pachet</button>
              </Elements>
            </div>
          )}

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
