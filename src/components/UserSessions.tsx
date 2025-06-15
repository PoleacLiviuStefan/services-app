// File: components/UserSessions.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  parseISO,
  isValid,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

interface SessionItem {
  id: string;
  startDate: string;   // ISO string or empty
  joinUrl: string;
  counterpart: string; // numele celeilalte părți (provider sau client)
}

export default function UserSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/sessions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // preluăm toate sesiunile fără filtrare pe dată
        const all = data.sessions as SessionItem[];
        setSessions(all);
        setError(null);
      })
      .catch((err) => setError(err.message || "A apărut o eroare"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Se încarcă ședințele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;
  if (!sessions.length) return <p>Nu există ședințe programate.</p>;

  const renderTimeRemaining = (start: Date) => {
    const now = new Date();
    const deltaMs = start.getTime() - now.getTime();
    if (deltaMs <= 0) return "este în curs sau a trecut";

    const days = differenceInDays(start, now);
    const afterDays = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const hours = differenceInHours(start, afterDays);
    const afterHours = new Date(afterDays.getTime() + hours * 60 * 60 * 1000);
    const minutes = differenceInMinutes(start, afterHours);

    const parts: string[] = [];
    if (days) parts.push(`${days} ${days === 1 ? "zi" : "zile"}`);
    if (hours) parts.push(`${hours} ${hours === 1 ? "oră" : "ore"}`);
    if (minutes || (!days && !hours))
      parts.push(`${minutes} ${minutes === 1 ? "minut" : "minute"}`);

    return `în ${parts.join(", ")}`;
  };

  return (
    <ul className="space-y-4">
      {sessions.map((sess) => {
        const date = parseISO(sess.startDate);
        const humanDate = isValid(date)
          ? date.toLocaleString("ro-RO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Data necunoscută";
        const remaining = isValid(date)
          ? renderTimeRemaining(date)
          : "";

        return (
          <li
            key={sess.id}
            className="border rounded-lg p-2 lg:p-4 shadow-sm flex justify-between items-center space-x-4"
          >
            <div>
              <p className="font-medium">Ședință cu {sess.counterpart}</p>
              <p className="text-sm text-gray-600">
                Programată pentru: {humanDate}
              </p>
              {remaining && (
                <p className="text-sm text-gray-600">{remaining}</p>
              )}
            </div>
            <Link
              href={`/servicii/video/sessions/${sess.id}`}
              className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center"
            >
              Intră în sesiune
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
