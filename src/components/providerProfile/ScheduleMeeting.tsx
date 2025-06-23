// components/ScheduleMeeting.tsx
'use client'
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
  services: string[];
  availablePackages: BoughtPackage[];
  providerStripeAccountId?: string | null;
  locale?: string;
}

export default function ScheduleMeeting({
  providerId,
  services,
  providerStripeAccountId,
  locale = "ro",
}: ScheduleMeetingProps) {
  const [schedulingUrl, setSchedulingUrl] = useState<string>("");
  const [scriptReady, setScriptReady] = useState(false);

  const [boughtPackages, setBoughtPackages] = useState<BoughtPackage[]>([]);
  const [loadingBought, setLoadingBought] = useState(false);
  const [errorBought, setErrorBought] = useState<string | null>(null);

  const pageSize = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // 1) Fetch Calendly URL
  useEffect(() => {
    if (!providerId) return;
    fetch(`/api/calendly/user?providerId=${providerId}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || res.statusText);
        }
        return res.json();
      })
      .then((data) => setSchedulingUrl(data.scheduling_url))
      .catch((err) => {
        console.error("[Calendly] fetch error:", err);
        setSchedulingUrl("");
      });
  }, [providerId]);

  // 2) Fetch bought packages
  useEffect(() => {
    setLoadingBought(true);
    fetch(`/api/provider/${providerId}/bought-packages`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Nu am găsit pachetele cumpărate");
        return res.json();
      })
      .then(({ boughtPackages }) => {
        setBoughtPackages(boughtPackages);
        setCurrentPage(1);
        setErrorBought(null);
      })
      .catch((err) => setErrorBought((err as Error).message))
      .finally(() => setLoadingBought(false));
  }, [providerId]);

  // 3) Calendly message handler
  const onCalendlyMessage = useCallback(
    (e: MessageEvent) => {
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
        });
      }
    },
    [providerId]
  );

  useEffect(() => {
    window.addEventListener("message", onCalendlyMessage);
    return () => window.removeEventListener("message", onCalendlyMessage);
  }, [onCalendlyMessage]);

  // 4) Filtrăm pachete cu sesiuni rămase
  const validPackages = boughtPackages.filter(
    (pkg) => pkg.totalSessions - pkg.usedSessions > 0
  );

  // 5) Init widget only if we have script + URL + at least one valid package
  useEffect(() => {
    if (!scriptReady || validPackages.length === 0 || !schedulingUrl) return;
    (window as any).Calendly.initInlineWidget({
      url: `${schedulingUrl}?locale=${locale}`,
      parentElement: document.getElementById("calendly-inline")!,
    });
  }, [scriptReady, schedulingUrl, validPackages.length, locale]);

  const openBuyModal = (svc: string) => {
    setSelectedService(svc);
    setShowBuyModal(true);
  };

  const totalPages = Math.ceil(validPackages.length / pageSize);

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
        {errorBought && (
          <p>{errorBought === "Nu am găsit pachetele cumpărate" ? (
            <>
              <p>Autentifică-te mai întâi pentru a putea programa o ședință</p>
              <Link href="/autentificare"><Button>Autentificare</Button></Link>
            </>
          ) : `Eroare: ${errorBought}`}</p>
        )}

        {/* No valid packages */}
        {!loadingBought && !errorBought && validPackages.length === 0 && (
          <>
            <h3 className="text-xl font-semibold mb-2">
              Alege un pachet înainte de a programa
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {services.length === 0 ? (
                <p>Momentan nu există servicii disponibile.</p>
              ) : (
                <Button onClick={() => openBuyModal(services[0])}>
                  <Icon><FaVideo size={20} /></Icon>
                  Cumpără Ședințe
                </Button>
              )}
            </div>
          </>
        )}

        {/* Show valid packages and scheduling */}
        {!loadingBought && !errorBought && validPackages.length > 0 && (
          <>
            <h3 className="text-xl font-semibold mb-2">Pachetele tale</h3>
            <ul className="space-y-2 mb-4">
              {validPackages
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((pkg) => (
                  <BoughtPackageCard key={pkg.id} pkg={pkg} />
                ))}
            </ul>

            <div className="flex justify-center items-center space-x-4 mb-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >Anterior</button>
              <span>Pagina {currentPage} din {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >Următor</button>
            </div>

            <h3 className="text-xl font-semibold mb-2">
              Programează-ți o ședință
            </h3>
            <div id="calendly-inline" className="w-full h-[600px] border-dashed border-2 border-gray-300">
              {!scriptReady && <p className="p-4 text-gray-600">Se încarcă scriptul Calendly…</p>}
              {scriptReady && !schedulingUrl && <p className="p-4 text-gray-600">Se încarcă calendarul…</p>}
            </div>
          </>
        )}
      </div>

      {showBuyModal && selectedService && (
        <BuyPackageModal
          providerStripeAccountId={providerStripeAccountId}
          providerId={providerId}
          packages={services.map((s) => ({ id: s, service: s } as any))}
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
