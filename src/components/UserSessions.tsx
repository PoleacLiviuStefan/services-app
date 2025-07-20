// File: components/UserSessions.tsx - VERSIUNE ACTUALIZATĂ CU STELE VIZIBILE ȘI RECENZII PENTRU FURNIZOR

"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  recordingStarted: boolean;
  recordingStartedAt: string | null;
  recordingStoppedAt: string | null;
  recordingDuration: number | null;
  
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
  
  // Câmpuri pentru recenzii
  providerId: string | null;
  clientId: string | null; // 🆕 adăugat pentru furnizor să poată vedea cine a fost clientul
  hasReview: boolean;
  myReview?: {
    id: string;
    rating: number;
    comment: string | null;
    date: string;
  } | null;
  // 🆕 pentru furnizor să vadă recenzia clientului
  clientReview?: {
    id: string;
    rating: number;
    comment: string | null;
    date: string;
    clientName: string;
  } | null;
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
      expired: number;
      withRecording: number;
      recordingReady: number;
      recordingProcessing: number;
      totalReviews?: number; // 🆕 adăugat pentru furnizor
      averageRating?: number; // 🆕 adăugat pentru furnizor
    };
    client: {
      total: number;
      scheduled: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      noShow: number;
      expired: number;
      withRecording: number;
      recordingReady: number;
      recordingProcessing: number;
      completedWithReviews?: number;
      completedWithoutReviews?: number;
      totalReviews?: number;
    };
  };
  providerId: string | null;
}

// Interface pentru modalul de recenzie
interface ReviewModal {
  isOpen: boolean;
  sessionId: string | null;
  providerName: string | null;
  providerId: string | null;
  loading: boolean;
  isEditing: boolean; // dacă edităm o recenzie existentă
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
    date: string;
  } | null;
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
  
  // Auto-refresh state (fără controale vizibile)
  const [currentTime, setCurrentTime] = useState(new Date());

  // State pentru modalul de recenzie
  const [reviewModal, setReviewModal] = useState<ReviewModal>({
    isOpen: false,
    sessionId: null,
    providerName: null,
    providerId: null,
    loading: false,
    isEditing: false,
    existingReview: null
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });

  // Funcție pentru încărcarea datelor
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/user/sessions", { credentials: "include" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const data: SessionsResponse = await res.json();
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
      
      console.log(`✅ Sesiuni actualizate: ${data.totalCount} total`);
    } catch (err) {
      setError((err as Error).message || "A apărut o eroare");
      console.error('Eroare la încărcarea sesiunilor:', err);
    }
  }, []);

  // Auto-refresh logic (fără controale vizibile)
  useEffect(() => {
    // Încărcare inițială
    fetchSessions().finally(() => setLoading(false));
  }, [fetchSessions]);

  // Timer pentru actualizarea timpului la fiecare minut
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timeInterval);
  }, []);

  // Timer pentru reîncărcarea completă a datelor la 5 minute
  useEffect(() => {
    const dataRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh complet al datelor sesiunilor...');
      fetchSessions();
    }, 5 * 60 * 1000);

    return () => clearInterval(dataRefreshInterval);
  }, [fetchSessions]);

  // Verifică dacă trebuie să facă refresh mai des pentru sesiunile active
  useEffect(() => {
    const hasActiveSessions = [...providerSessions, ...clientSessions].some(
      sess => sess.status === 'IN_PROGRESS' || 
              (sess.status === 'SCHEDULED' && sess.startDate && 
               new Date(sess.startDate).getTime() - currentTime.getTime() <= 10 * 60 * 1000)
    );

    if (hasActiveSessions) {
      const activeRefreshInterval = setInterval(() => {
        console.log('⚡ Auto-refresh rapid pentru sesiuni active...');
        fetchSessions();
      }, 2 * 60 * 1000);

      return () => clearInterval(activeRefreshInterval);
    }
  }, [providerSessions, clientSessions, currentTime, fetchSessions]);

  // Funcții pentru gestionarea recenziilor
  const openReviewModal = (sessionId: string, providerName: string, providerId: string, existingReview?: any) => {
    setReviewModal({
      isOpen: true,
      sessionId,
      providerName,
      providerId,
      loading: false,
      isEditing: !!existingReview,
      existingReview: existingReview || null
    });
    
    // Dacă edităm o recenzie existentă, populează formularul
    if (existingReview) {
      setReviewForm({
        rating: existingReview.rating,
        comment: existingReview.comment || ''
      });
    } else {
      setReviewForm({
        rating: 5,
        comment: ''
      });
    }
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      sessionId: null,
      providerName: null,
      providerId: null,
      loading: false,
      isEditing: false,
      existingReview: null
    });
    setReviewForm({
      rating: 5,
      comment: ''
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewModal.sessionId || !reviewModal.providerId) return;

    setReviewModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/user/sessions/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: reviewModal.sessionId,
          providerId: reviewModal.providerId,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Eroare la salvarea recenziei');
      }

      // Actualizează sesiunea cu recenzia nouă (simplificat)
      const updateSession = (sess: SessionItem) => 
        sess.id === reviewModal.sessionId 
          ? { 
              ...sess, 
              hasReview: true,
              myReview: {
                id: result.review.id,
                rating: result.review.rating,
                comment: result.review.comment, // API-ul returnează comentariul curat
                date: result.review.date
              }
            }
          : sess;
          
      setClientSessions(prev => prev.map(updateSession));

      const action = reviewModal.isEditing ? 'actualizată' : 'salvată';
      alert(`Recenzia a fost ${action} cu succes! Nota: ${reviewForm.rating}/5 stele`);
      closeReviewModal();
      
      // Reîncarcă datele pentru a actualiza statisticile
      setTimeout(() => fetchSessions(), 1000);
      
    } catch (error) {
      console.error('Eroare la salvarea recenziei:', error);
      alert('Nu s-a putut salva recenzia: ' + (error as Error).message);
    } finally {
      setReviewModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) return <p className="text-center text-gray-500">Se încarcă ședințele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;
  
  const hasAnySessions = providerSessions.length > 0 || clientSessions.length > 0;
  if (!hasAnySessions) return <p>Nu există ședințe programate.</p>;

  // Funcție pentru calcularea timpului rămas
  const renderTimeRemaining = (start: Date) => {
    const deltaMs = start.getTime() - currentTime.getTime();
    if (deltaMs <= 0) return "este în curs sau a trecut";

    const days = differenceInDays(start, currentTime);
    const afterDays = new Date(currentTime.getTime() + days * 24 * 60 * 60 * 1000);
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

  // 🆕 FUNCȚIE ÎMBUNĂTĂȚITĂ PENTRU AFIȘAREA STELELOR (CU STELE GOALE VIZIBILE)
  const renderStars = (rating: number, maxStars: 5, interactive: boolean = false, onStarClick?: (star: number) => void) => {
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      const isFilled = i <= Math.floor(rating);
      const isHalfFilled = i === Math.ceil(rating) && rating % 1 >= 0.5;
      
      if (interactive && onStarClick) {
        // Pentru modalul de rating (interactiv)
        stars.push(
          <button
            key={i}
            type="button"
            onClick={() => onStarClick(i)}
            className={`text-2xl transition-colors hover:text-yellow-400 ${
              i <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ⭐
          </button>
        );
      } else {
        // Pentru afișare readonly
        if (isFilled) {
          stars.push(<span key={i} className="text-yellow-400">⭐</span>);
        } else if (isHalfFilled) {
          stars.push(<span key={i} className="text-yellow-400">⭐</span>);
        } else {
          stars.push(<span key={i} className="text-gray-300">☆</span>);
        }
      }
    }
    return <span className="inline-flex items-center">{stars}</span>;
  };

  const openModal = (url: string) => {
    setModalUrl(url);
  };
  
  const closeModal = () => {
    setModalUrl(null);
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
      
      await fetchSessions();

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
                         (sess.status === 'IN_PROGRESS') &&
                         !sess.isFinished;

          const isCompleted = sess.status === 'COMPLETED' || sess.isFinished;
          const hasRecordingAvailable = sess.recordingAvailable;
          const hasRecordingProcessing = sess.recordingProcessing;
          const hasAnyRecording = sess.hasRecording;

          // Verificări pentru recenzie (acum poate recenza orice sesiune completată)
          const canReview = role === 'client' && 
                           isCompleted && 
                           sess.providerId;
          const hasReview = sess.hasReview && sess.myReview;

          // 🆕 Pentru furnizor să vadă recenzia clientului
          const hasClientReview = role === 'provider' && sess.clientReview;

          return (
            <li
              key={sess.id}
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-start w-full space-x-4 space-y-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-lg leading-[1]">
                      {sess.speciality}
                    </h3>
                    <span className={`px-2 text-center py-1 rounded-full text-xs font-medium ${getStatusColor(sess.status)}`}>
                      {getStatusText(sess.status)}
                    </span>
                    
                    <span className={`flex justify-center text-center px-2 py-1 rounded-full text-xs font-medium ${
                      role === 'provider' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {role === 'provider' ? '👨‍⚕️ Furnizor' : '👤 Client'}
                    </span>
                    
                    {hasRecordingAvailable && isCompleted && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium text-center bg-purple-100 text-purple-800">
                        📹 Înregistrare gata
                      </span>
                    )}
                    {hasRecordingProcessing && isCompleted && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium text-center bg-orange-100 text-orange-800">
                        ⏳ În procesare
                      </span>
                    )}

                    {hasReview && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium text-center bg-yellow-100 text-yellow-800">
                        ⭐ Recenzată ({sess.myReview?.rating}/5)
                      </span>
                    )}

                    {/* 🆕 Badge pentru furnizor când clientul a lăsat recenzie */}
                    {hasClientReview && (
                      <span className="flex justify-center items-center px-2 py-1 rounded-full text-xs font-medium text-center bg-emerald-100 text-emerald-800">
                        ⭐ Recenzie primită ({sess.clientReview?.rating}/5)
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
                        <span className="ml-2 text-xs text-gray-400" title="Actualizare automată">
                          🔄
                        </span>
                      </p>
                    )}

                    {sess.rating && (
                      <p>
                        <span className="font-medium">Rating:</span>{" "}
                        {renderStars(sess.rating)} ({sess.rating}/5)
                      </p>
                    )}

                    {/* 🆕 Afișarea recenziei clientului pentru furnizor */}
                    {hasClientReview && sess.clientReview && (
                      <div className="mt-2 p-3 bg-emerald-50 rounded border">
                        <p className="text-sm font-medium text-emerald-800">
                          Recenzia de la {sess.clientReview.clientName}:
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(sess.clientReview.rating)} 
                          <span className="text-sm text-emerald-700">({sess.clientReview.rating}/5 stele)</span>
                        </div>
                        {sess.clientReview.comment && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            "{sess.clientReview.comment}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Adăugată pe {new Date(sess.clientReview.date).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    )}

                    {hasReview && sess.myReview && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border">
                        <p className="text-sm">
                          <span className="font-medium">Recenzia ta:</span> {renderStars(sess.myReview.rating)} ({sess.myReview.rating}/5)
                        </p>
                        {sess.myReview.comment && (
                          <p className="text-xs text-gray-600 mt-1">"{sess.myReview.comment}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Adăugată pe {new Date(sess.myReview.date).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    )}

                    {sess.packageInfo && (
                      <p className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">Pachet:</span> {sess.packageInfo.service} 
                        ({sess.packageInfo.remainingSessions} sesiuni rămase din {sess.packageInfo.totalSessions})
                      </p>
                    )}

                    {sess.totalPrice && (
                      <p className="text-xs text-green-600">
                        <span className="font-medium">Preț:</span> {formatPrice(sess.totalPrice)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex flex-col items-center w-full lg:w-auto space-y-2">
                  {/* Buton principal - Join/Recording/Status */}
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
                      className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center transition-colors w-full"
                    >
                      {sess.status === 'IN_PROGRESS' ? 'Reintră în sesiune' : 'Intră în sesiune'}
                    </Link>
                  ) : isCompleted && hasRecordingAvailable ? (
                    <button
                      onClick={() => openModal(sess.recordingUrl!)}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center transition-colors w-full flex items-center gap-2 justify-center"
                    >
                      📹 Vezi înregistrarea
                    </button>
                  ) : isCompleted && hasRecordingProcessing ? (
                    <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded text-center text-sm w-full">
                      ⏳ Înregistrare în procesare
                    </div>
                  ) : isCompleted && hasAnyRecording ? (
                    <button
                      onClick={() => handleGetRecording(sess.id)}
                      disabled={loadingRecording === sess.id}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center w-full"
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
                    <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm w-full">
                      {sess.status === 'CANCELLED' ? 'Sesiune anulată' : 
                       isCompleted && !hasAnyRecording ? 'Fără înregistrare' : 'Indisponibilă'}
                    </div>
                  )}

                  {/* Buton pentru recenzie (pentru fiecare sesiune completată ca client) */}
                  {canReview && (
                    <button
                      onClick={() => openReviewModal(sess.id, sess.counterpart, sess.providerId!, sess.myReview)}
                      className={`px-4 py-2 text-white rounded text-center transition-colors flex items-center gap-2 justify-center w-full ${
                        hasReview 
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : 'bg-yellow-500 hover:bg-yellow-600'
                      }`}
                    >
                      {hasReview ? (
                        <>⭐ Editează recenzia</>
                      ) : (
                        <>⭐ Adaugă recenzie</>
                      )}
                    </button>
                  )}

                  {/* Butoane specifice pentru provider */}
                  {role === 'provider' && isProvider && sess.status === 'SCHEDULED' && 
                   date && isValid(date) && date > currentTime && (
                    <button
                      onClick={() => handleCancelSession(sess.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors w-full"
                    >
                      Anulează
                    </button>
                  )}

                  {role === 'provider' && isProvider && sess.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleForceEndSession(sess.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors w-full"
                    >
                      Închide sesiunea
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header simplu */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Sesiunile tale</h2>
          <div className="text-sm text-gray-600 mt-1">
            Total: {providerSessions.length + clientSessions.length} sesiuni
            {stats?.client?.totalReviews && (
              <span className="ml-2 text-yellow-600">
                • {stats.client.totalReviews} recenzii date
              </span>
            )}
            {/* 🆕 Statistici pentru furnizor */}
            {stats?.provider?.totalReviews && (
              <span className="ml-2 text-emerald-600">
                • {stats.provider.totalReviews} recenzii primite
                {stats.provider.averageRating && (
                  <span className="ml-1">
                    (medie: {stats.provider.averageRating.toFixed(1)}/5)
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Doar sincronizare înregistrări pentru provider */}
        {isProvider && (
          <button
            onClick={handleSyncRecordings}
            disabled={syncingRecordings}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors text-sm"
            title="Sincronizează înregistrările"
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
              {/* 🆕 Afișează recenziile primite */}
              {stats?.provider?.totalReviews && (
                <span className="ml-1 text-xs text-emerald-600">
                  ({stats.provider.totalReviews} recenzii)
                </span>
              )}
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
              {stats?.client?.totalReviews && (
                <span className="ml-1 text-xs text-yellow-600">
                  ({stats.client.totalReviews} recenzii date)
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Statistici pentru tab-ul activ */}
      {stats && stats[activeTab] && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats[activeTab].recordingReady || 0}</div>
            <div className="text-sm text-purple-800">Înregistrări</div>
          </div>
          
          {/* Statistici recenzii pentru client */}
          {activeTab === 'client' && stats.client.totalReviews !== undefined && (
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.client.totalReviews || 0}</div>
              <div className="text-sm text-yellow-800">Recenzii date</div>
            </div>
          )}

          {/* 🆕 Statistici recenzii pentru provider */}
          {activeTab === 'provider' && stats.provider.totalReviews !== undefined && (
            <div className="bg-emerald-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.provider.totalReviews || 0}</div>
              <div className="text-sm text-emerald-800">Recenzii primite</div>
            </div>
          )}
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
            className="bg-white rounded-lg overflow-hidden shadow-lg max-w-3xl w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button onClick={closeModal} className="text-gray-600 hover:text-gray-900 text-xl">
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

      {/* Modal pentru recenzie */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">
                {reviewModal.isEditing ? 'Editează recenzia' : 'Adaugă recenzie'} pentru {reviewModal.providerName}
              </h3>
              
              <div className="space-y-4">
                {/* Selector rating cu stele vizibile */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota (1-5 stele)
                  </label>
                  <div className="flex items-center space-x-2">
                    {renderStars(
                      reviewForm.rating, 
                      5, 
                      true, 
                      (star) => setReviewForm(prev => ({ ...prev, rating: star }))
                    )}
                    <span className="ml-2 text-sm text-gray-600">
                      ({reviewForm.rating}/5)
                    </span>
                  </div>
                </div>

                {/* Comentariu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentariu (opțional)
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Descrie experiența ta cu această sesiune..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {reviewForm.comment.length}/500 caractere
                  </div>
                </div>
              </div>

              {/* Butoane */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeReviewModal}
                  disabled={reviewModal.loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewModal.loading}
                  className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewModal.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Se salvează...
                    </>
                  ) : (
                    reviewModal.isEditing ? 'Actualizează recenzia' : 'Salvează recenzia'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}