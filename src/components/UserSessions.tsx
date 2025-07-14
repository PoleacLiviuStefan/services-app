// File: components/UserSessions.tsx - ACTUALIZAT cu view dual

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
  duration: number | null;
  actualDuration: number | null;
  isFinished: boolean;
  participantCount: number | null;
  rating: number | null;
  feedback: string | null;
  notes: string | null;
  totalPrice: number | null;
  role: 'provider' | 'client';
  createdAt: string;
  updatedAt: string;
  
  scheduledAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  
  recordingUrl: string | null;
  hasRecording: boolean;
  recordingAvailable: boolean;
  recordingProcessing: boolean;
  recordingStatus: string;
  
  dailyRoomName: string | null;
  dailyDomainName: string | null;
  dailyCreatedAt: string | null;
  
  packageInfo: {
    id: string;
    service: string;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
    price: number;
  } | null;

  calendlyEventUri: string | null;
}

interface SessionsResponse {
  providerSessions: SessionItem[];
  clientSessions: SessionItem[];
  totalCount: number;
  isProvider: boolean;
  stats: {
    provider: {
      total: number;
      scheduled: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      noShow: number;
      withRecording: number;
      recordingReady?: number;
      recordingProcessing?: number;
    };
    client: {
      total: number;
      scheduled: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      noShow: number;
      withRecording: number;
      recordingReady?: number;
      recordingProcessing?: number;
    };
  };
  providerId: string | null;
}

export default function UserSessions() {
  const [providerSessions, setProviderSessions] = useState<SessionItem[]>([]);
  const [clientSessions, setClientSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingRecording, setLoadingRecording] = useState<string | null>(null);
  const [syncingRecordings, setSyncingRecordings] = useState(false);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'provider' | 'client'>('provider');

  useEffect(() => {
    fetch("/api/user/sessions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: SessionsResponse) => {
        setProviderSessions(data.providerSessions || []);
        setClientSessions(data.clientSessions || []);
        setIsProvider(data.isProvider || false);
        setStats(data.stats || null);
        setError(null);
        
        // Setează tab-ul activ în funcție de ce sesiuni sunt disponibile
        if (data.providerSessions?.length > 0) {
          setActiveTab('provider');
        } else if (data.clientSessions?.length > 0) {
          setActiveTab('client');
        }
      })
      .catch((err) => setError(err.message || "A apărut o eroare"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-gray-500">Se încarcă ședințele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;
  
  const hasAnySessions = providerSessions.length > 0 || clientSessions.length > 0;
  if (!hasAnySessions) return <p>Nu există ședințe programate.</p>;

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
    return (price / 100).toFixed(2) + ' RON';
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  const openModal = (url: string) => {
    setModalUrl(url);
  };
  
  const closeModal = () => {
    setModalUrl(null);
  };

  const handleRefreshSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/video/session/${sessionId}/recording`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.recordingUrl) {
        // Actualizează sesiunea în ambele liste
        const updateSession = (sess: SessionItem) => 
          sess.id === sessionId 
            ? { 
                ...sess, 
                recordingUrl: data.recordingUrl, 
                recordingAvailable: true,
                hasRecording: true,
                recordingStatus: data.status || 'READY'
              }
            : sess;
            
        setProviderSessions(prev => prev.map(updateSession));
        setClientSessions(prev => prev.map(updateSession));
        alert('Sesiunea a fost actualizată! Înregistrarea este acum disponibilă.');
      } else {
        console.log('Nu s-a găsit înregistrarea individual, rulează sync complet...');
        await handleSyncRecordings();
      }
    } catch (error) {
      console.error('Eroare la refresh sesiune:', error);
      alert('Eroare la actualizarea sesiunii: ' + (error as Error).message);
    }
  };

  const handleGetRecording = async (sessionId: string) => {
    setLoadingRecording(sessionId);
    try {
      const response = await fetch(`/api/video/session/${sessionId}/recording`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = data.error || 'Eroare la obținerea înregistrării';
        if (data.debug) {
          errorMessage += `\n\nInfo debug:\n- Camera: ${data.debug.roomName}\n- Are URL în BD: ${data.debug.hasRecordingInDb}\n- Status: ${data.debug.recordingStatus}`;
        }
        throw new Error(errorMessage);
      }
      
      if (data.recordingUrl) {
        window.open(data.recordingUrl, '_blank');
        
        const updateSession = (sess: SessionItem) => 
          sess.id === sessionId 
            ? { 
                ...sess, 
                recordingUrl: data.recordingUrl, 
                recordingAvailable: true,
                recordingStatus: data.status || 'READY'
              }
            : sess;
            
        setProviderSessions(prev => prev.map(updateSession));
        setClientSessions(prev => prev.map(updateSession));
      } else {
        let message = 'Înregistrarea nu este încă disponibilă.';
        if (data.note) {
          message += '\n\n' + data.note;
        }
        if (data.debug) {
          message += `\n\nInfo: Camera ${data.debug.roomName}`;
        }
        alert(message);
      }
    } catch (error) {
      console.error('Eroare la obținerea înregistrării:', error);
      alert('Nu s-a putut obține înregistrarea.\n\n' + (error as Error).message);
    } finally {
      setLoadingRecording(null);
    }
  };

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
      const response = await fetch(`/api/video/session-info/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la anularea sesiunii');
      }

      const updateSession = (sess: SessionItem) => 
        sess.id === sessionId 
          ? { ...sess, status: 'CANCELLED' as const }
          : sess;
          
      setProviderSessions(prev => prev.map(updateSession));
      setClientSessions(prev => prev.map(updateSession));

      alert('Sesiunea a fost anulată cu succes!');
    } catch (error) {
      console.error('Eroare la anularea sesiunii:', error);
      alert('A apărut o eroare la anularea sesiunii. Te rugăm să încerci din nou.');
    }
  }

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

      const updateSession = (sess: SessionItem) => 
        sess.id === sessionId 
          ? { ...sess, status: 'COMPLETED' as const, isFinished: true }
          : sess;
          
      setProviderSessions(prev => prev.map(updateSession));
      setClientSessions(prev => prev.map(updateSession));

      alert('Sesiunea a fost închisă cu succes!');
    } catch (error) {
      console.error('Eroare la închiderea sesiunii:', error);
      alert('A apărut o eroare la închiderea sesiunii. Te rugăm să încerci din nou.');
    }
  }

  const renderSessionsList = (sessions: SessionItem[], role: 'provider' | 'client') => {
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Nu există sesiuni ca {role === 'provider' ? 'furnizor' : 'client'}.</p>
        </div>
      );
    }

    return (
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

          const canJoin = sess.joinUrl && 
                         (sess.status === 'SCHEDULED' || sess.status === 'IN_PROGRESS') &&
                         !sess.isFinished;

          const isCompleted = sess.status === 'COMPLETED' || sess.isFinished;
          const hasRecordingAvailable = sess.recordingAvailable;
          const hasRecordingProcessing = sess.recordingProcessing;
          const hasAnyRecording = sess.hasRecording;

          return (
            <li
              key={sess.id}
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-start w-full space-x-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold  text-lg leading-[1]">
                      {sess.speciality}
                    </h3>
                    <span className={`px-2 text-center py-1 rounded-full text-xs font-medium ${getStatusColor(sess.status)}`}>
                      {getStatusText(sess.status)}
                    </span>
                    
                    {/* Indicatori de rol */}
                    <span className={`flex justify-center text-center px-2 py-1 rounded-full text-xs font-medium ${
                      role === 'provider' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {role === 'provider' ? '👨‍⚕️ Furnizor' : '👤 Client'}
                    </span>
                    
                    {/* Indicatori de înregistrare */}
                    {hasRecordingAvailable && isCompleted && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium  text-center bg-purple-100 text-purple-800">
                        📹 Înregistrare gata
                      </span>
                    )}
                    {hasRecordingProcessing && isCompleted && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium text-center bg-orange-100 text-orange-800">
                        ⏳ În procesare
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
                          {role === 'provider' ? 'Client' : 'Furnizor'}:
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

                    {sess.actualDuration ? (
                      <p>
                        <span className="font-medium">Durată reală:</span>{" "}
                        {sess.actualDuration} minute
                      </p>
                    ) : sess.duration && (
                      <p>
                        <span className="font-medium">Durată estimată:</span>{" "}
                        {sess.duration} minute
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
                  ) : isCompleted && hasRecordingAvailable ? (
                    <button
                      onClick={() => openModal(sess.recordingUrl!)}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
                    >
                      📹 Vezi înregistrarea
                    </button>
                  ) : isCompleted && hasRecordingProcessing ? (
                    <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded text-center text-sm">
                      ⏳ Înregistrare în procesare
                    </div>
                  ) : isCompleted && hasAnyRecording ? (
                    <button
                      onClick={() => handleGetRecording(sess.id)}
                      disabled={loadingRecording === sess.id}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
                    >
                      {loadingRecording === sess.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Se încarcă...
                        </>
                      ) : (
                        <>
                          🔍 Verifică înregistrarea
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm">
                      {sess.status === 'CANCELLED' ? 'Sesiune anulată' : 
                       isCompleted && !hasAnyRecording ? 'Fără înregistrare' : 'Indisponibilă'}
                    </div>
                  )}

                  {/* Butoane specifice pentru provider */}
                  {role === 'provider' && isProvider && sess.status === 'SCHEDULED' && 
                   date && isValid(date) && date > new Date() && (
                    <button
                      onClick={() => handleCancelSession(sess.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Anulează
                    </button>
                  )}

                  {role === 'provider' && isProvider && sess.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleForceEndSession(sess.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                    >
                      Închide sesiunea
                    </button>
                  )}
                </div>
              </div>
{/* 
              {sess.roomName && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Camera video:</span> {sess.roomName}
                  </p>
                </div>
              )} */}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header și acțiuni */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl lg:text-2xl font-bold">Sesiunile tale</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: {providerSessions.length + clientSessions.length} sesiuni
          </div>
          {isProvider && (
            <button
              onClick={handleSyncRecordings}
              disabled={syncingRecordings}
              className="px-2 lg:px-4 py-1 lg:py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              title="Sincronizează înregistrările folosind strategii multiple de căutare"
            >
              {syncingRecordings ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sincronizare...
                </>
              ) : (
                <>
                  🔄 Sincronizare înregistrări
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {providerSessions.length > 0 && (
            <button
              onClick={() => setActiveTab('provider')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'provider'
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ca Furnizor ({providerSessions.length})
            </button>
          )}
          {clientSessions.length > 0 && (
            <button
              onClick={() => setActiveTab('client')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'client'
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ca Client ({clientSessions.length})
            </button>
          )}
        </nav>
      </div>

      {/* Statistici pentru tab-ul activ */}
      {stats && stats[activeTab] && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats[activeTab].scheduled}</div>
            <div className="text-sm text-blue-800">Programate</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats[activeTab].inProgress}</div>
            <div className="text-sm text-green-800">În curs</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600">{stats[activeTab].completed}</div>
            <div className="text-sm text-gray-800">Finalizate</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats[activeTab].cancelled}</div>
            <div className="text-sm text-red-800">Anulate</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats[activeTab].noShow}</div>
            <div className="text-sm text-yellow-800">Absent</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats[activeTab].recordingReady || 0}</div>
            <div className="text-sm text-purple-800">Înregistrări gata</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{stats[activeTab].recordingProcessing || 0}</div>
            <div className="text-sm text-orange-800">În procesare</div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats[activeTab].withRecording}</div>
            <div className="text-sm text-indigo-800">Total înregistrări</div>
          </div>
        </div>
      )}

      {/* Content pentru tab-ul activ */}
      <div className="min-h-[400px]">
        {activeTab === 'provider' && renderSessionsList(providerSessions, 'provider')}
        {activeTab === 'client' && renderSessionsList(clientSessions, 'client')}
      </div>

      {/* Modal pentru înregistrări */}
      {modalUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg overflow-hidden shadow-lg max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button onClick={closeModal} className="text-gray-600 hover:text-gray-900">
                ×
              </button>
            </div>
            <div className="px-4 pb-4">
              <video controls src={modalUrl} className="w-full rounded">
                Browser-ul tău nu suportă video HTML5.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}