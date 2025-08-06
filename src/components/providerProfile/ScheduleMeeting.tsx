// components/ScheduleMeeting.tsx
'use client'

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from '@/hooks/useTranslation';
import Script from "next/script";
import Head from "next/head";
import Icon from "../atoms/icon";
import Button from "../atoms/button";
import BuyPackageModal from "../BuyPackageModal";
import { FaVideo, FaExclamationTriangle, FaRedo, FaArrowLeft, FaCheck, FaClock, FaCalendarAlt } from "react-icons/fa";
import Link from "next/link";
import { BoughtPackage } from "@/interfaces/PurchaseInterface";

interface ScheduleMeetingProps {
  providerId: string;
  services: string[];
  availablePackages: BoughtPackage[];
  providerStripeAccountId?: string | null;
  locale?: string;
}

// Enum pentru stările componentei
enum ScheduleStep {
  LOADING = 'loading',
  SELECT_PACKAGE = 'select_package',
  SCHEDULING = 'scheduling',
  COMPLETED = 'completed'
}

export default function ScheduleMeeting({
  providerId,
  services,
  providerStripeAccountId,
  locale = "ro",
}: ScheduleMeetingProps) {
  const { t } = useTranslation();
  console.log("found services", services);
  
  // State pentru flow-ul de programare
  const [currentStep, setCurrentStep] = useState<ScheduleStep>(ScheduleStep.LOADING);
  const [selectedPackage, setSelectedPackage] = useState<BoughtPackage | null>(null);
  const [schedulingInProgress, setSchedulingInProgress] = useState(false);
  
  // State-uri existente
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
    }, 500);

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
        
        // Determinăm pasul următor în funcție de pachete
        const validPackages = boughtPackages.filter(
          (pkg: BoughtPackage) => pkg.totalSessions - pkg.usedSessions > 0
        );
        
        if (validPackages.length === 0) {
          setCurrentStep(ScheduleStep.SELECT_PACKAGE); // Va arăta mesajul de cumpărare
        } else {
          setCurrentStep(ScheduleStep.SELECT_PACKAGE);
        }
      })
      .catch((err) => {
        setErrorBought((err as Error).message);
        setCurrentStep(ScheduleStep.SELECT_PACKAGE);
      })
      .finally(() => setLoadingBought(false));
  }, [providerId]);

  // 3) Calendly message handler - ACTUALIZAT pentru a include packageId
  const onCalendlyMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data || !selectedPackage) return;
      
      let msg: any;
      try {
        msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      
      if (msg.event === "calendly.event_scheduled" && msg.payload?.event?.uri) {
        setSchedulingInProgress(true);
        
        // Trimite packageId selectat la backend
        fetch("/api/calendly/event-scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            providerId, 
            scheduledEventUri: msg.payload.event.uri,
            packageId: selectedPackage.id // 🆕 Adăugăm packageId
          }),
        })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Eroare la procesarea programării');
          }
          return res.json();
        })
        .then((data) => {
          console.log('Programare confirmată:', data);
          
          // Actualizează pachetul local pentru a reflecta sesiunea folosită
          setSelectedPackage(prev => prev ? {
            ...prev,
            usedSessions: prev.usedSessions + 1
          } : null);
          
          // Actualizează lista de pachete
          setBoughtPackages(prev => 
            prev.map(pkg => 
              pkg.id === selectedPackage.id 
                ? { ...pkg, usedSessions: pkg.usedSessions + 1 }
                : pkg
            )
          );
          
          setCurrentStep(ScheduleStep.COMPLETED);
        })
        .catch((error) => {
          console.error('Eroare la confirmare:', error);
          // Aici poți adăuga un toast sau alert pentru eroare
        })
        .finally(() => {
          setSchedulingInProgress(false);
        });
      }
    },
    [providerId, selectedPackage]
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

  // 5) Initialize Calendly widget - ACTUALIZAT pentru a include packageId în URL
  useEffect(() => {
    if (
      !scriptReady ||
      currentStep !== ScheduleStep.SCHEDULING ||
      !selectedPackage ||
      !schedulingUrl ||
      !checkCalendlyAvailability()
    ) {
      return;
    }

    const container = document.getElementById("calendly-inline");
    if (!container) return;

    container.innerHTML = "";

    try {
      // 🆕 Adăugăm packageId în URL-ul Calendly pentru tracking
      const calendlyUrl = `${schedulingUrl}?locale=${locale}&package_id=${selectedPackage.id}`;
      
      (window as any).Calendly.initInlineWidget({
        url: calendlyUrl,
        parentElement: container,
      });
    } catch (error) {
      console.error("Eroare la inițializarea widget-ului Calendly:", error);
      setScriptError(true);
    }
  }, [scriptReady, schedulingUrl, selectedPackage, currentStep, locale, checkCalendlyAvailability]);

  // Funcții pentru navigare
  const handlePackageSelect = (pkg: BoughtPackage) => {
    setSelectedPackage(pkg);
    setCurrentStep(ScheduleStep.SCHEDULING);
  };

  const handleBackToPackageSelection = () => {
    setSelectedPackage(null);
    setCurrentStep(ScheduleStep.SELECT_PACKAGE);
  };

  const handleStartNewBooking = () => {
    setSelectedPackage(null);
    setCurrentStep(ScheduleStep.SELECT_PACKAGE);
  };

  // Funcție pentru retry
  const handleRetryScript = () => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      setScriptError(false);
      setScriptLoading(true);
      setScriptReady(false);
      
      if (scriptTimeoutRef.current) {
        clearTimeout(scriptTimeoutRef.current);
      }
      
      pollForCalendly();
      
      scriptTimeoutRef.current = setTimeout(() => {
        if (!scriptReady) {
          setScriptLoading(false);
          setScriptError(true);
        }
      }, 15000);
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
    if (schedulingInProgress) {
      return (
        <div className="p-4 text-center text-blue-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p>{t('scheduleMeeting.processingBooking')}</p>
          <p className="text-sm text-gray-500 mt-1">
            {t('scheduleMeeting.pleaseWaitForConfirmation')}
          </p>
        </div>
      );
    }

    if (scriptLoading && !scriptError) {
      return (
        <div className="p-4 text-center text-gray-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p>{t('scheduleMeeting.loadingCalendar')}</p>
          <p className="text-sm text-gray-500 mt-1">
            {t('scheduleMeeting.tryNumber', { current: retryCountRef.current + 1, max: maxRetries + 1 })}
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
            {t('scheduleMeeting.calendarLoadError')}
          </p>
          {retryCountRef.current < maxRetries ? (
            <Button
              onClick={handleRetryScript}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2 mx-auto"
            >
              <FaRedo />
              {t('scheduleMeeting.tryAgain')}
            </Button>
          ) : (
            <p className="text-gray-600 text-sm">
              {t('scheduleMeeting.reloadOrTryLater')}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // 🆕 Componentă pentru afișarea pachetelor cu selecție
  const renderPackageSelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('scheduleMeeting.selectPackageTitle')}
        </h2>
        <p className="text-gray-600">
          {t('scheduleMeeting.selectPackageSubtitle')}
        </p>
      </div>

      {validPackages.length === 0 ? (
        <div className="text-center p-6 border rounded-lg bg-yellow-50 border-yellow-200">
          <Icon className="text-yellow-600 mb-4 mx-auto">
            <FaExclamationTriangle size={32} />
          </Icon>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            {t('scheduleMeeting.noPackages')}
          </h3>
          <p className="text-yellow-700 mb-4">
            {t('scheduleMeeting.buyPackageInfo')}
          </p>
          {services.length > 0 && (
            <Button 
              onClick={() => openBuyModal(services[0])}
              className="bg-primaryColor text-white px-6 py-3 rounded-md hover:bg-primaryColor/90 flex items-center gap-2 mx-auto"
            >
              <FaVideo />
              {t('scheduleMeeting.buyPackages')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {validPackages
            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
            .map((pkg) => {
              const remainingSessions = pkg.totalSessions - pkg.usedSessions;
              const progressPercent = (pkg.usedSessions / pkg.totalSessions) * 100;
              
              return (
                <div
                  key={pkg.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handlePackageSelect(pkg)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
            <h4 className="font-semibold text-lg text-gray-900">
              {pkg.providerPackage?.service || t('scheduleMeeting.service')}
            </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{remainingSessions}</span> {t('scheduleMeeting.sessionsLeft')} 
                        {t('scheduleMeeting.outOf')} <span className="font-medium">{pkg.totalSessions}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        {pkg.providerPackage?.price || 0} lei
                      </span>
                      {pkg.expiresAt && (
                        <p className="text-xs text-gray-500">
                          Expiră: {new Date(pkg.expiresAt).toLocaleDateString('ro-RO')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          remainingSessions <= 1 ? 'bg-red-500' :
                          remainingSessions <= 3 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <FaClock className="mr-1" />
                      <span>{t('scheduleMeeting.clickToBook')}</span>
                    </div>
                    
                    {remainingSessions <= 1 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {t('scheduleMeeting.lastSession')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                {t('scheduleMeeting.previous')}
              </button>
              <span className="text-sm text-gray-600">
                {t('scheduleMeeting.page')} {currentPage} {t('scheduleMeeting.of')} {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                {t('scheduleMeeting.next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 🆕 Componentă pentru programare
  const renderScheduling = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className="text-blue-600 mr-3">
              <FaCheck size={20} />
            </Icon>
            <div>
              <h4 className="font-semibold text-blue-900">
                {t('scheduleMeeting.selectedPackage')}: {selectedPackage?.providerPackage?.service}
              </h4>
              <p className="text-sm text-blue-700">
                {(selectedPackage?.totalSessions || 0) - (selectedPackage?.usedSessions || 0)} {t('scheduleMeeting.sessionsLeft')}
              </p>
            </div>
          </div>
          <Button
            onClick={handleBackToPackageSelection}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
          >
            <FaArrowLeft size={12} />
            {t('scheduleMeeting.change')}
          </Button>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4 text-center">
        <FaCalendarAlt className="inline mr-2" />
        {t('scheduleMeeting.selectDateTime')}
      </h3>
      
      <div
        id="calendly-inline"
        className="w-full h-[600px] border border-gray-300 rounded-lg bg-white"
      >
        {renderCalendlyStatus()}
      </div>
    </div>
  );

  // 🆕 Componentă pentru confirmare
  const renderCompleted = () => (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <Icon className="text-green-600 mb-4 mx-auto">
          <FaCheck size={48} />
        </Icon>
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          {t('scheduleMeeting.confirmed')}
        </h3>
        <p className="text-green-700 mb-4">
          {t('scheduleMeeting.success')}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>{t('scheduleMeeting.packageUsed')}:</strong> {selectedPackage?.providerPackage?.service}<br/>
          <strong>{t('scheduleMeeting.sessionsLeft')}:</strong> {(selectedPackage?.totalSessions || 0) - (selectedPackage?.usedSessions || 0)}
        </p>
        <Button
          onClick={handleStartNewBooking}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          {t('scheduleMeeting.scheduleAnother')}
        </Button>
      </div>
    </div>
  );

  // Loading state
  if (currentStep === ScheduleStep.LOADING || loadingBought) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="w-full text-center">{t('scheduleMeeting.loading')}</p>
      </div>
    );
  }

  // Error state
  if (errorBought) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <Icon className="text-red-500 mb-4 mx-auto">
          <FaExclamationTriangle size={32} />
        </Icon>
        {errorBought === "Nu am găsit pachetele cumpărate" ? (
          <>
            <h3 className="text-xl font-semibold mb-2">{t('scheduleMeeting.authRequired')}</h3>
            <p className="mb-4">{t('scheduleMeeting.mustLoginToBook')}</p>
            <Link href="/autentificare">
              <Button className="bg-primaryColor text-white px-6 py-3 rounded">
                {t('scheduleMeeting.login')}
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-2">{t('scheduleMeeting.error')}</h3>
            <p>{errorBought}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />
      </Head>

      <div className="mb-6">
        {currentStep === ScheduleStep.SELECT_PACKAGE && renderPackageSelection()}
        {currentStep === ScheduleStep.SCHEDULING && renderScheduling()}
        {currentStep === ScheduleStep.COMPLETED && renderCompleted()}
      </div>

      {showBuyModal && selectedService && (
        <BuyPackageModal
          providerId={providerId}
          packages={services}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            setShowBuyModal(false);
            // Refresh packages după cumpărare
            window.location.reload();
          }}
        />
      )}

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Calendly widget script loaded");
          if (checkCalendlyAvailability()) {
            setScriptReady(true);
            setScriptLoading(false);
            if (scriptTimeoutRef.current) {
              clearTimeout(scriptTimeoutRef.current);
            }
          } else {
            pollForCalendly();
          }
        }}
        onError={(error) => {
          console.error("Eroare la încărcarea script-ului Calendly:", error);
          setScriptError(true);
          setScriptLoading(false);
        }}
        onReady={() => {
          scriptTimeoutRef.current = setTimeout(() => {
            if (!scriptReady && !checkCalendlyAvailability()) {
              console.warn("Timeout pentru încărcarea script-ului Calendly");
              setScriptLoading(false);
              setScriptError(true);
            }
          }, 15000);
          
          pollForCalendly();
        }}
      />
    </>
  );
}