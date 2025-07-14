// components/ScheduleMeeting.tsx
'use client'

import React, { useEffect, useState, useCallback, useRef } from "react";
import Script from "next/script";
import Head from "next/head";
import Icon from "../atoms/icon";
import Button from "../atoms/button";
import BuyPackageModal from "../BuyPackageModal";
import BoughtPackageCard from "../BoughtPackageCard";
import { BoughtPackage } from "@/interfaces/PackageInterface";
import { FaVideo, FaExclamationTriangle, FaRedo } from "react-icons/fa";
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
  console.log("found services", services);
  const [schedulingUrl, setSchedulingUrl] = useState<string>("");
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(true);

  const [boughtPackages, setBoughtPackages] = useState<BoughtPackage[]>([]);
  const [loadingBought, setLoadingBought] = useState(false);
  const [errorBought, setErrorBought] = useState<string | null>(null);

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const pageSize = 5;
  const [currentPage, setCurrentPage] = useState(1);
  
  // Ref pentru timeout
  const scriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Funcție pentru verificarea disponibilității Calendly
  const checkCalendlyAvailability = useCallback(() => {
    return typeof window !== 'undefined' && 
           window.Calendly && 
           typeof window.Calendly.initInlineWidget === 'function';
  }, []);

  // Funcție pentru polling Calendly object
  const pollForCalendly = useCallback(() => {
    const pollInterval = setInterval(() => {
      if (checkCalendlyAvailability()) {
        clearInterval(pollInterval);
        setScriptReady(true);
        setScriptLoading(false);
        if (scriptTimeoutRef.current) {
          clearTimeout(scriptTimeoutRef.current);
        }
      }
    }, 500); // verifică la fiecare 500ms

    // Oprește polling după 10 secunde
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 10000);
  }, [checkCalendlyAvailability]);

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
        fetch("/api/calendly/event-scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId, scheduledEventUri: msg.payload.event.uri }),
        });
      }
    },
    [providerId]
  );
  
  useEffect(() => {
    window.addEventListener("message", onCalendlyMessage);
    return () => window.removeEventListener("message", onCalendlyMessage);
  }, [onCalendlyMessage]);

  // 4) Filter packages with remaining sessions
  const validPackages = boughtPackages.filter(
    (pkg) => pkg.totalSessions - pkg.usedSessions > 0
  );
  const totalPages = Math.ceil(validPackages.length / pageSize);

  // 5) Initialize Calendly widget
  useEffect(() => {
    // only once script has loaded, Calendly URL is present, and there are valid packages
    if (
      !scriptReady ||
      validPackages.length === 0 ||
      !schedulingUrl ||
      !checkCalendlyAvailability()
    ) {
      return;
    }

    const container = document.getElementById("calendly-inline");
    if (!container) return;

    // clear out any previous widget
    container.innerHTML = "";

    try {
      // init widget
      (window as any).Calendly.initInlineWidget({
        url: `${schedulingUrl}?locale=${locale}`,
        parentElement: container,
      });
    } catch (error) {
      console.error("Eroare la inițializarea widget-ului Calendly:", error);
      setScriptError(true);
    }
  }, [scriptReady, schedulingUrl, validPackages.length, locale, checkCalendlyAvailability]);

  // Funcție pentru retry
  const handleRetryScript = () => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      setScriptError(false);
      setScriptLoading(true);
      setScriptReady(false);
      
      // Resetează timeout-ul
      if (scriptTimeoutRef.current) {
        clearTimeout(scriptTimeoutRef.current);
      }
      
      // Pornește din nou polling-ul
      pollForCalendly();
      
      // Setează un nou timeout
      scriptTimeoutRef.current = setTimeout(() => {
        if (!scriptReady) {
          setScriptLoading(false);
          setScriptError(true);
        }
      }, 15000); // 15 secunde timeout
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scriptTimeoutRef.current) {
        clearTimeout(scriptTimeoutRef.current);
      }
    };
  }, []);

  const openBuyModal = (svc: string) => {
    setSelectedService(svc);
    setShowBuyModal(true);
  };

  const renderCalendlyStatus = () => {
    if (scriptLoading && !scriptError) {
      return (
        <div className="p-4 text-center text-gray-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p>Se încarcă scriptul Calendly…</p>
          <p className="text-sm text-gray-500 mt-1">
            Încercare {retryCountRef.current + 1} din {maxRetries + 1}
          </p>
        </div>
      );
    }

    if (scriptError) {
      return (
        <div className="p-4 text-center">
          <Icon className="text-red-500 mb-2">
            <FaExclamationTriangle size={24} />
          </Icon>
          <p className="text-red-600 mb-3">
            Nu s-a putut încărca calendarul. Verifică conexiunea la internet.
          </p>
          {retryCountRef.current < maxRetries ? (
            <Button
              onClick={handleRetryScript}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2 mx-auto"
            >
              <FaRedo />
              Încearcă din nou
            </Button>
          ) : (
            <p className="text-gray-600 text-sm">
              Te rugăm să reîncarci pagina sau să încerci mai târziu.
            </p>
          )}
        </div>
      );
    }

    if (scriptReady && !schedulingUrl) {
      return (
        <div className="p-4 text-center text-gray-600">
          <div className="animate-pulse">Se încarcă calendarul…</div>
        </div>
      );
    }

    return null;
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
        {errorBought && (
          <p>
            {errorBought === "Nu am găsit pachetele cumpărate" ? (
              <>
                <p>
                  Autentifică-te mai întâi pentru a putea programa o ședință
                </p>
                <Link href="/autentificare">
                  <Button>Autentificare</Button>
                </Link>
              </>
            ) : (
              `Eroare: ${errorBought}`
            )}
          </p>
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
                <Button onClick={() => openBuyModal(services[0])}  className="flex items-center gap-2 border-2 border-primaryColor text-primaryColor px-6 py-3 rounded-md hover:bg-primaryColor hover:text-white transition-all duration-300">
                  <Icon>
                    <FaVideo size={20} />
                  </Icon>
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
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} din {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Următor
              </button>
            </div>

            <h3 className="text-xl font-semibold mb-2">
              Programează-ți o ședință
            </h3>
            <div
              id="calendly-inline"
              className="w-full h-[600px] border-dashed border-2 border-gray-300"
            >
              {renderCalendlyStatus()}
            </div>
          </>
        )}
      </div>

      {showBuyModal && selectedService && (
        <BuyPackageModal
          providerId={providerId}
          packages={services}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Calendly widget script loaded");
          // Verifică dacă Calendly este cu adevărat disponibil
          if (checkCalendlyAvailability()) {
            setScriptReady(true);
            setScriptLoading(false);
            if (scriptTimeoutRef.current) {
              clearTimeout(scriptTimeoutRef.current);
            }
          } else {
            // Dacă script-ul s-a încărcat dar Calendly nu e disponibil, începe polling
            pollForCalendly();
          }
        }}
        onError={(error) => {
          console.error("Eroare la încărcarea script-ului Calendly:", error);
          setScriptError(true);
          setScriptLoading(false);
        }}
        onReady={() => {
          // Setează un timeout pentru cazul în care onLoad nu se apelează
          scriptTimeoutRef.current = setTimeout(() => {
            if (!scriptReady && !checkCalendlyAvailability()) {
              console.warn("Timeout pentru încărcarea script-ului Calendly");
              setScriptLoading(false);
              setScriptError(true);
            }
          }, 15000); // 15 secunde timeout
          
          // Începe și polling-ul ca backup
          pollForCalendly();
        }}
      />
    </>
  );
}