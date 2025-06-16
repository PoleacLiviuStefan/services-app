// File: components/ScheduleMeeting.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import Head from "next/head";
import Icon from "../atoms/icon";
import Button from "../atoms/button";
import BuyPackageModal from "../BuyPackageModal";
import BoughtPackageCard from "../BoughtPackageCard";
import { BoughtPackage } from "@/interfaces/PackageInterface";
import { FaVideo } from "react-icons/fa";
import Link from "next/link";

interface ScheduleMeetingProps {
  providerId: string;
  services: string[];                    // lista serviciilor unice
  availablePackages: BoughtPackage[];    // toate pachetele disponibile de la provider
  providerStripeAccountId?: string | null;
  locale?: string;
}

export default function ScheduleMeeting({
  providerId,
  services,
  availablePackages,
  providerStripeAccountId,
  locale = "ro",
}: ScheduleMeetingProps) {
  // Calendly
  const [schedulingUrl, setSchedulingUrl] = useState<string>("");
  const [scriptReady, setScriptReady] = useState(false);

  // pachetele cumpărate
  const [boughtPackages, setBoughtPackages] = useState<BoughtPackage[]>([]);
  const [loadingBought, setLoadingBought] = useState(false);
  const [errorBought, setErrorBought] = useState<string | null>(null);

  // modal cumpărare
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // 1) Fetch URL-ul Calendly
  useEffect(() => {
    if (!providerId) return;
    fetch(`/api/calendly/user?providerId=${providerId}`)
      .then(async res => {
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || res.statusText);
        }
        return res.json();
      })
      .then(data => setSchedulingUrl(data.scheduling_url))
      .catch(err => {
        console.error("[Calendly] fetch error:", err);
        setSchedulingUrl("");
      });
  }, [providerId]);

  // 2) Fetch pachetele cumpărate
  useEffect(() => {
    setLoadingBought(true);
    fetch(`/api/provider/${providerId}/bought-packages`, {
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) throw new Error("Nu am găsit pachetele cumpărate");
        return res.json();
      })
      .then(({ soldPackages }) => {
        setBoughtPackages(soldPackages);
        setErrorBought(null);
      })
      .catch(err => setErrorBought((err as Error).message))
      .finally(() => setLoadingBought(false));
  }, [providerId]);

  // 3) Handler postMessage din widget
  const onCalendlyMessage = useCallback((e: MessageEvent) => {
    if (!e.data) return;
    let msg: any;
    try {
      msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }
    if (msg.event === "calendly.event_scheduled" && msg.payload?.event?.uri) {
      const scheduledEventUri: string = msg.payload.event.uri;
      fetch("/api/calendly/event-scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, scheduledEventUri }),
      })
        .then(r => r.json().then(j => ({ status: r.status, body: j })))
        .then(({ status, body }) => {
          if (status >= 400) {
            console.error("[Calendly] backend error:", status, body);
          } else {
            console.log(
              "[Calendly] backend saved ConsultingSession:",
              body.data
            );
          }
        })
        .catch(err =>
          console.error("[Calendly] fetch error to /event-scheduled:", err)
        );
    }
  }, [providerId]);

  useEffect(() => {
    window.addEventListener("message", onCalendlyMessage);
    return () => {
      window.removeEventListener("message", onCalendlyMessage);
    };
  }, [onCalendlyMessage]);

  // 4) Inițializăm widget doar dacă avem script + pachete cumpărate + URL
  useEffect(() => {
    if (!scriptReady || boughtPackages.length === 0 || !schedulingUrl) return;
    ;(window as any).Calendly.initInlineWidget({
      url: `${schedulingUrl}?locale=${locale}`,
      parentElement: document.getElementById("calendly-inline")!,
    });
  }, [scriptReady, schedulingUrl, boughtPackages.length, locale]);

  const openBuyModal = (svc: string) => {
    setSelectedService(svc);
    setShowBuyModal(true);
  };

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />
      </Head>

      <div className="max-w-2xl mx-auto mb-6">
        {loadingBought && <p>Se încarcă pachetele cumpărate…</p>}
        {errorBought && <p className=""> {errorBought==="Nu am găsit pachetele cumpărate" ?    <> <p>Autentifica-te mai intai pentru a putea programa o sedinta</p>     <Link href="/autentificare">
                    <Button className="px-4 text-white py-2 gap-4 shadow-md shadow-primaryButtonColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30">
                   
                      Autentificare
                    </Button>
                  </Link></>: `Eroare: ${errorBought}`}</p>}

        {/* dacă nu există pachete cumpărate */}
        {!loadingBought && !errorBought && boughtPackages.length === 0 && (
          <>
            <h3 className="text-xl font-semibold mb-2">
              Alege un pachet înainte de a programa
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {services.length === 0 ? (
                <p>Momentan nu există servicii disponibile.</p>
              ) : (
                services.map(svc => (
                  <Button
                    key={svc}
                    onClick={() => openBuyModal(svc)}
                    className={`flex flex-col p-3 ${
                      selectedService === svc ? "ring-2 ring-primaryColor" : ""
                    }`}
                  >
                    <Icon>
                      <FaVideo size={20} />
                    </Icon>
                    <span className="border-2 border-primaryColor px-6 py-4 font-bold rounded-md hover:bg-primaryColor hover:text-white">
                      Cumpără Ședințe
                    </span>
                  </Button>
                ))
              )}
            </div>
          </>
        )}

        {/* dacă există pachete cumpărate */}
        {!loadingBought && !errorBought && boughtPackages.length > 0 && (
          <>
            <h3 className="text-xl font-semibold mb-2">
              Pachetele tale cumpărate
            </h3>
            <ul className="space-y-2 mb-4">
              {boughtPackages.map(pkg => (
                <BoughtPackageCard key={pkg.id} pkg={pkg} />
              ))}
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              Programează-ți o ședință
            </h3>
            <div
              id="calendly-inline"
              style={{
                width: "100%",
                height: "600px",
                border: "2px dashed gray",
                position: "relative",
              }}
            >
              {!scriptReady && (
                <p className="p-4 text-gray-600">
                  Se încarcă scriptul Calendly…
                </p>
              )}
              {scriptReady && !schedulingUrl && (
                <p className="p-4 text-gray-600">
                  Se încarcă calendarul…
                </p>
              )}
              {/* widget-ul Calendly va fi inserat aici */}
            </div>
          </>
        )}
      </div>

      {/* modal cumpărare */}
      {showBuyModal && selectedService && (
        <BuyPackageModal
          providerStripeAccountId={providerStripeAccountId}
          providerId={providerId}
          packages={availablePackages.filter(p => p.service === selectedService)}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
    </>
  );
}
