// components/AvailabilityCalendar.tsx
"use client";

import React, { useEffect, useState } from "react";
import DayPicker from "react-day-picker";
import "react-day-picker/style.css";
import { useSession } from "next-auth/react";

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
                className="px-2 py-1 bg-primaryColor text-white rounded"
                onClick={() => handleSlotClick(slot)}
              >
                {new Date(slot.start).toLocaleTimeString("ro-RO", { hour: '2-digit', minute:'2-digit' })}
              </button>
            ))}
          </div>
        }
      />

      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <p>Trebuie să cumperi un pachet pentru a programa această ședință.</p>
            <button
              onClick={() => {
                setShowBuyModal(false);
                // redirecționează spre modalul de cumpărare
                // ex: window.open('/profil', '_self');
              }}
              className="mt-4 px-4 py-2 bg-primaryColor text-white rounded"
            >
              Cumpără acum
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
