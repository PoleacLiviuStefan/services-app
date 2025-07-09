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
  startDate: string;
  endDate: string | null;
  joinUrl: string;
  roomName: string | null;
  counterpart: string;
  speciality: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  duration: number | null;
  actualDuration: number | null;
  isFinished: boolean;
  participantCount: number | null;
  rating: number | null;
  feedback: string | null;
  totalPrice: number | null;
  role: 'provider' | 'client';
  createdAt: string;
}

interface SessionsResponse {
  sessions: SessionItem[];
  totalCount: number;
  isProvider: boolean;
}

export default function UserSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProvider, setIsProvider] = useState(false);

  useEffect(() => {
    fetch("/api/user/sessions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: SessionsResponse) => {
        setSessions(data.sessions || []);
        setIsProvider(data.isProvider || false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Programată';
      case 'IN_PROGRESS': return 'În desfășurare';
      case 'COMPLETED': return 'Finalizată';
      case 'CANCELLED': return 'Anulată';
      case 'NO_SHOW': return 'Absent';
      default: return status;
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return (price / 100).toFixed(2) + ' RON'; // presupunând că prețul e în bani
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isProvider ? 'Sesiunile tale ca Provider' : 'Sesiunile tale ca Client'}
        </h2>
        <div className="text-sm text-gray-600">
          Total: {sessions.length} sesiuni
        </div>
      </div>

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
          const remaining = isValid(date) ? renderTimeRemaining(date) : "";

          // Determină dacă sesiunea poate fi accesată
          const canJoin = sess.joinUrl && 
                         (sess.status === 'SCHEDULED' || sess.status === 'IN_PROGRESS') &&
                         !sess.isFinished;

          return (
            <li
              key={sess.id}
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start space-x-4">
                {/* Informații principale */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {sess.speciality}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sess.status)}`}>
                      {getStatusText(sess.status)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">
                        {isProvider ? 'Client' : 'Provider'}:
                      </span>{" "}
                      {sess.counterpart}
                    </p>
                    
                    <p>
                      <span className="font-medium">Programată pentru:</span>{" "}
                      {humanDate}
                    </p>
                    
                    {remaining && sess.status === 'SCHEDULED' && (
                      <p className="text-blue-600">
                        <span className="font-medium">Timp rămas:</span> {remaining}
                      </p>
                    )}

                    {sess.duration && (
                      <p>
                        <span className="font-medium">Durată estimată:</span>{" "}
                        {sess.duration} minute
                      </p>
                    )}

                    {sess.actualDuration && (
                      <p>
                        <span className="font-medium">Durată reală:</span>{" "}
                        {sess.actualDuration} minute
                      </p>
                    )}

                    {sess.participantCount !== null && sess.participantCount > 0 && (
                      <p>
                        <span className="font-medium">Participanți:</span>{" "}
                        {sess.participantCount}
                      </p>
                    )}

                    {sess.totalPrice && (
                      <p>
                        <span className="font-medium">Preț:</span>{" "}
                        {formatPrice(sess.totalPrice)}
                      </p>
                    )}

                    {sess.rating && (
                      <p>
                        <span className="font-medium">Rating:</span>{" "}
                        {renderStars(sess.rating)} ({sess.rating}/5)
                      </p>
                    )}

                    {sess.feedback && (
                      <p>
                        <span className="font-medium">Feedback:</span>{" "}
                        <span className="italic">"{sess.feedback}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex flex-col space-y-2">
                  {canJoin ? (
                    <Link
                        href={{
    pathname: '/servicii/video/sessions',
    query: { url: sess.joinUrl },
  }}
                      className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center transition-colors"
                    >
                      {sess.status === 'IN_PROGRESS' ? 'Reintră în sesiune' : 'Intră în sesiune'}
                    </Link>
                  ) : sess.status === 'COMPLETED' ? (
                    <Link
                        href={{
    pathname: '/servicii/video/sessions',
    query: { url: sess.joinUrl },
  }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-center transition-colors"
                    >
                      Vezi detalii
                    </Link>
                  ) : sess.status === 'CANCELLED' ? (
                    <div className="px-4 py-2 bg-red-100 text-red-800 rounded text-center text-sm">
                      Sesiune anulată
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm">
                      Indisponibilă
                    </div>
                  )}

                  {/* Buton anulare pentru provider și sesiuni viitoare */}
                  {isProvider && 
                   sess.status === 'SCHEDULED' && 
                   isValid(date) && 
                   date > new Date() && (
                    <button
                      onClick={() => handleCancelSession(sess.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Anulează
                    </button>
                  )}
                </div>
              </div>

              {/* Informații despre camera video */}
              {sess.roomName && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Camera video:</span> {sess.roomName}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Funcție pentru anularea sesiunii
  async function handleCancelSession(sessionId: string) {
    if (!confirm('Ești sigur că vrei să anulezi această sesiune?')) {
      return;
    }

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la anularea sesiunii');
      }

      // Actualizează lista după anulare
      setSessions(sessions.map(sess => 
        sess.id === sessionId 
          ? { ...sess, status: 'CANCELLED' as const }
          : sess
      ));

      alert('Sesiunea a fost anulată cu succes!');
    } catch (error) {
      console.error('Eroare la anularea sesiunii:', error);
      alert('A apărut o eroare la anularea sesiunii. Te rugăm să încerci din nou.');
    }
  }
}