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
  startDate: string | null;
  endDate: string | null;
  joinUrl: string;
  roomName: string | null;
  roomId: string | null;
  counterpart: string;
  counterpartEmail: string | null;
  counterpartImage: string | null;
  speciality: string;
  specialityId: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  duration: number | null; // Estimated duration
  actualDuration: number | null; // Actual duration
  isFinished: boolean;
  participantCount: number | null;
  rating: number | null;
  feedback: string | null;
  notes: string | null;
  totalPrice: number | null;
  role: 'provider' | 'client';
  createdAt: string;
  updatedAt: string;
  
  // Session timing
  scheduledAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  
  // Recording information
  recordingUrl: string | null;
  hasRecording: boolean;
  
  // Daily.co integration
  dailyRoomName: string | null;
  dailyDomainName: string | null;
  dailyCreatedAt: string | null;
  
  // Package information
  packageInfo: {
    id: string;
    service: string;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
    price: number;
  } | null;

  // Calendly integration
  calendlyEventUri: string | null;
}

interface SessionsResponse {
  sessions: SessionItem[];
  totalCount: number;
  isProvider: boolean;
  stats: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    noShow: number;
    withRecording: number;
  };
  providerId: string | null;
}

export default function UserSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingRecording, setLoadingRecording] = useState<string | null>(null);
  const [syncingRecordings, setSyncingRecordings] = useState(false); // 🆕 Pentru sincronizare

  useEffect(() => {
    fetch("/api/user/sessions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: SessionsResponse) => {
        setSessions(data.sessions || []);
        setIsProvider(data.isProvider || false);
        setStats(data.stats || null);
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

  // Funcție pentru obținerea link-ului de înregistrare
  const handleGetRecording = async (sessionId: string) => {
    setLoadingRecording(sessionId);
    try {
      const response = await fetch(`/api/video/session/${sessionId}/recording`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la obținerea înregistrării');
      }
      
      const data = await response.json();
      
      if (data.recordingUrl) {
        // Deschide înregistrarea într-o fereastră nouă
        window.open(data.recordingUrl, '_blank');
      } else {
        alert('Înregistrarea nu este încă disponibilă. Te rugăm să încerci din nou în câteva minute.');
      }
    } catch (error) {
      console.error('Eroare la obținerea înregistrării:', error);
      alert('Nu s-a putut obține înregistrarea. ' + (error as Error).message);
    } finally {
      setLoadingRecording(null);
    }
  };

  // Funcție pentru sincronizarea înregistrărilor cu Daily.co
  const handleSyncRecordings = async () => {
    if (!isProvider) {
      alert('Doar providerii pot sincroniza înregistrările');
      return;
    }

    if (!confirm('Vrei să sincronizezi înregistrările cu Daily.co? Aceasta va verifica și actualiza toate sesiunile recente.')) {
      return;
    }

    setSyncingRecordings(true);
    try {
      const response = await fetch('/api/video/sync-recordings', {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Eroare la sincronizarea înregistrărilor');
      }

      alert(`Sincronizare completă: ${result.updated} sesiuni actualizate din ${result.total} verificate`);
      
      // Reîncarcă lista de sesiuni
      window.location.reload();

    } catch (error) {
      console.error('Eroare la sincronizarea înregistrărilor:', error);
      alert('A apărut o eroare la sincronizarea înregistrărilor: ' + (error as Error).message);
    } finally {
      setSyncingRecordings(false);
    }
  };
  async function handleCancelSession(sessionId: string) {
    if (!confirm('Ești sigur că vrei să anulezi această sesiune?')) {
      return;
    }

    try {
      // Folosește endpoint-ul din /api/video/session-info/[sessionId]/route.ts
      const response = await fetch(`/api/video/session-info/${sessionId}`, {
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

  // Funcție pentru forțarea închiderii unei sesiuni (doar provider)
  async function handleForceEndSession(sessionId: string) {
    if (!confirm('Ești sigur că vrei să închizi această sesiune definitiv?')) {
      return;
    }

    try {
      const response = await fetch(`/api/video/session/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEnd: true }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la închiderea sesiunii');
      }

      // Actualizează lista după închidere
      setSessions(sessions.map(sess => 
        sess.id === sessionId 
          ? { ...sess, status: 'COMPLETED' as const, isFinished: true }
          : sess
      ));

      alert('Sesiunea a fost închisă cu succes!');
    } catch (error) {
      console.error('Eroare la închiderea sesiunii:', error);
      alert('A apărut o eroare la închiderea sesiunii. Te rugăm să încerci din nou.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isProvider ? 'Sesiunile tale ca Provider' : 'Sesiunile tale ca Client'}
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: {sessions.length} sesiuni
          </div>
          {/* Buton sincronizare înregistrări pentru provideri */}
          {isProvider && (
            <button
              onClick={handleSyncRecordings}
              disabled={syncingRecordings}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {syncingRecordings ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sincronizare...
                </>
              ) : (
                <>
                  🔄 Sincronizează înregistrări
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Statistici */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-blue-800">Programate</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.inProgress}</div>
            <div className="text-sm text-green-800">În curs</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            <div className="text-sm text-gray-800">Finalizate</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-red-800">Anulate</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.noShow}</div>
            <div className="text-sm text-yellow-800">Absent</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.withRecording}</div>
            <div className="text-sm text-purple-800">Cu înregistrare</div>
          </div>
        </div>
      )}

      <ul className="space-y-4">
        {sessions.map((sess) => {
          const date = sess.startDate ? parseISO(sess.startDate) : null;
          const humanDate = date && isValid(date)
            ? date.toLocaleString("ro-RO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Data necunoscută";
          const remaining = date && isValid(date) ? renderTimeRemaining(date) : "";

          // Determină dacă sesiunea poate fi accesată
          const canJoin = sess.joinUrl && 
                         (sess.status === 'SCHEDULED' || sess.status === 'IN_PROGRESS') &&
                         !sess.isFinished;

          // Determină dacă sesiunea este completă și dacă există înregistrare
          const isCompleted = sess.status === 'COMPLETED' || sess.isFinished;
          const hasRecording = sess.hasRecording || sess.recordingUrl;

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
                    {hasRecording && isCompleted && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        📹 Înregistrat
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      {sess.counterpartImage && (
                        <img 
                          src={sess.counterpartImage} 
                          alt={sess.counterpart}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <p>
                        <span className="font-medium">
                          {isProvider ? 'Client' : 'Provider'}:
                        </span>{" "}
                        {sess.counterpart}
                      </p>
                    </div>
                    
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

                    {sess.notes && (
                      <p>
                        <span className="font-medium">Notițe:</span>{" "}
                        <span className="text-xs">{sess.notes}</span>
                      </p>
                    )}

                    {/* Package info */}
                    {sess.packageInfo && (
                      <p className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Pachet:</span> {sess.packageInfo.service} 
                        ({sess.packageInfo.remainingSessions} sesiuni rămase din {sess.packageInfo.totalSessions})
                      </p>
                    )}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex flex-col space-y-2">
                  {/* Butoane principale pentru diferite stări */}
                  {canJoin ? (
                    <Link
                      href={{
                        pathname: '/servicii/video/sessions',
                        query: { 
                          url: sess.joinUrl, 
                          sessionId: sess.id,
                          end: sess.endDate,
                          duration: sess.duration 
                        },
                      }}
                      className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center transition-colors"
                    >
                      {sess.status === 'IN_PROGRESS' ? 'Reintră în sesiune' : 'Intră în sesiune'}
                    </Link>
                  ) : isCompleted && hasRecording ? (
                    <button
                      onClick={() => handleGetRecording(sess.id)}
                      disabled={loadingRecording === sess.id}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
                    >
                      {loadingRecording === sess.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Se încarcă...
                        </>
                      ) : (
                        <>
                          📹 Vezi înregistrarea
                        </>
                      )}
                    </button>
                  ) : isCompleted && !hasRecording ? (
                    <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm">
                      Fără înregistrare
                    </div>
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
                   date && isValid(date) && 
                   date > new Date() && (
                    <button
                      onClick={() => handleCancelSession(sess.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Anulează
                    </button>
                  )}

                  {/* Buton pentru închiderea forțată (doar provider pentru sesiuni în curs) */}
                  {isProvider && 
                   sess.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleForceEndSession(sess.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                    >
                      Închide sesiunea
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
}