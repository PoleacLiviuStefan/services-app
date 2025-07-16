// components/AvailabilityCalendar.tsx
"use client";

import React, { useEffect, useState } from "react";
import DayPicker from "react-day-picker";
import "react-day-picker/style.css";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";

interface Slot { start: string; end: string; }

export default function AvailabilityCalendar({ providerId }: { providerId: string }) {
  const { data: session } = useSession();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userHasPackage, setUserHasPackage] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    // 1) verificăm dacă user are pachet
    fetch("/api/user/bought-packages", { credentials: "include" })
      .then(r => r.json())
      .then(j => setUserHasPackage(j.boughtPackages.length > 0));

    // 2) încărcăm slot-urile
    fetch(`/api/provider/${providerId}/availability`)
      .then(r => r.json())
      .then(j => setSlots(j.availability || []))
      .catch(console.error);
  }, [providerId]);

  // 🆕 Blochează scroll-ul când modalul e deschis
  useEffect(() => {
    if (showBuyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup la unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showBuyModal]);

  function handleSlotClick(s: Slot) {
    if (!userHasPackage) {
      setShowBuyModal(true);
    } else {
      // deschide widget Calendly pe acest slot, sau direct crează event
      window.Calendly.showPopupWidget(
        `${providerCalendlyEventTypeUrl}?date=${s.start}`
      );
    }
  }

  // 🆕 Componenta modalului
  const BuyModal = () => (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)'
      }}
      onClick={(e) => {
        // Închide modalul dacă se dă click pe overlay
        if (e.target === e.currentTarget) {
          setShowBuyModal(false);
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()} // Previne închiderea când se dă click pe modal
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">
            🎯 Programare necesară
          </h3>
          <button
            onClick={() => setShowBuyModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">
              Pentru a programa această ședință, trebuie să cumperi mai întâi un pachet de servicii.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Pachetele îți oferă acces la sesiuni de consultanță cu acest furnizor.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowBuyModal(false)}
              className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Anulează
            </button>
            <button
              onClick={() => {
                setShowBuyModal(false);
                // redirecționează spre modalul de cumpărare
                window.open('/profil?tab=packages', '_self');
              }}
              className="flex-1 px-4 py-3 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 transition-colors font-medium shadow-md"
            >
              🛒 Cumpără acum
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <DayPicker
        // afișează doar zilele care au slot-uri
        disabled={!slots.some(slot => slot.start.startsWith('2025-06-17'))}
        // … alte props
        footer={
          <div className="grid grid-cols-2 gap-2">
            {slots.map(slot => (
              <button
                key={slot.start}
                className="px-2 py-1 bg-primaryColor text-white rounded hover:bg-primaryColor/90 transition-colors"
                onClick={() => handleSlotClick(slot)}
              >
                {new Date(slot.start).toLocaleTimeString("ro-RO", { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </button>
            ))}
          </div>
        }
      />

      {/* 🆕 Modal cu Portal pentru a ieși din containerul părinte */}
      {showBuyModal && typeof document !== 'undefined' && 
        createPortal(<BuyModal />, document.body)
      }
    </div>
  );
}

// 🆕 Versiune alternativă mai simplă dacă nu vrei Portal
export function AvailabilityCalendarSimple({ providerId }: { providerId: string }) {
  const { data: session } = useSession();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userHasPackage, setUserHasPackage] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    fetch("/api/user/bought-packages", { credentials: "include" })
      .then(r => r.json())
      .then(j => setUserHasPackage(j.boughtPackages.length > 0));

    fetch(`/api/provider/${providerId}/availability`)
      .then(r => r.json())
      .then(j => setSlots(j.availability || []))
      .catch(console.error);
  }, [providerId]);

  function handleSlotClick(s: Slot) {
    if (!userHasPackage) {
      setShowBuyModal(true);
    } else {
      window.Calendly.showPopupWidget(
        `${providerCalendlyEventTypeUrl}?date=${s.start}`
      );
    }
  }

  return (
    <div className="relative">
      <DayPicker
        disabled={!slots.some(slot => slot.start.startsWith('2025-06-17'))}
        footer={
          <div className="grid grid-cols-2 gap-2">
            {slots.map(slot => (
              <button
                key={slot.start}
                className="px-2 py-1 bg-primaryColor text-white rounded hover:bg-primaryColor/90 transition-colors"
                onClick={() => handleSlotClick(slot)}
              >
                {new Date(slot.start).toLocaleTimeString("ro-RO", { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </button>
            ))}
          </div>
        }
      />

      {/* 🆕 Modal cu z-index foarte mare și poziționare absolută */}
      {showBuyModal && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 99999 }}
            onClick={() => setShowBuyModal(false)}
          />
          
          {/* Modal */}
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
            style={{ zIndex: 999999 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Pachet necesar</h3>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-4">
                  Trebuie să cumperi un pachet pentru a programa această ședință.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBuyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={() => {
                      setShowBuyModal(false);
                      window.open('/profil?tab=packages', '_self');
                    }}
                    className="flex-1 px-4 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90"
                  >
                    Cumpără acum
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}