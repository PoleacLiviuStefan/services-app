'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { parseISO, differenceInMinutes } from 'date-fns';

export default function VideoSession() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('sessionId') || '';
  const roomUrl = params.get('url') || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);
  const [minutesLeft, setMinutesLeft] = useState<number>(0);
  const [isProvider, setIsProvider] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isIntentionalLeave, setIsIntentionalLeave] = useState(false);
  const initialized = useRef(false);
  // Verifică dacă user-ul curent este provider pentru această sesiune
  useEffect(() => {
    if (sessionId && session?.user?.id) {
      fetch(`/api/video/session/${sessionId}/check-provider`, {
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Error checking provider status:', data.error);
          router.push('/profil');
          return;
        }
        setIsProvider(data.isProvider || false);
        setSessionData(data);
        setLoading(false);
        console.log('Provider check result:', data);
      })
      .catch(err => {
        console.error('Error checking provider status:', err);
        setLoading(false);
      });
    }
  }, [sessionId, session?.user?.id, router]);

  // Page Visibility API pentru a detecta schimbarea tab-ului
  useEffect(() => {
    let leftMeetingTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      const isTabVisible = !document.hidden;
      console.log('Tab visibility changed:', isTabVisible ? 'visible' : 'hidden');
      
      // Dacă tab-ul devine vizibil din nou, anulează timeout-ul de redirect
      if (isTabVisible && leftMeetingTimeout) {
        console.log('Tab became visible again, canceling delayed redirect');
        clearTimeout(leftMeetingTimeout);
        leftMeetingTimeout = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (leftMeetingTimeout) {
        clearTimeout(leftMeetingTimeout);
      }
    };
  }, []);

  // Inițializează Daily iframe și intră în sesiune
  useEffect(() => {
    if (
      status !== 'authenticated' ||
      !roomUrl ||
      !containerRef.current ||
      loading || 
      initialized.current
    ) return;
    

    (async () => {
      const { default: Daily } = await import('@daily-co/daily-js');
      frameRef.current = Daily.createFrame(containerRef.current, {
        showLeaveButton: true,
        showFullscreenButton: false,
      });
      initialized.current = true;
      await frameRef.current.join({
        url: roomUrl,
        userName: session.user?.name || 'Guest',
      });

      // Pornește înregistrarea automat dacă ești provider
      if (isProvider) {
        try {
          console.log('🎥 Starting automatic recording...');
          await frameRef.current.startRecording();
          console.log('✅ Recording started successfully');
        } catch (error) {
          console.error('❌ Failed to start recording:', error);
        }
      }

      // Actualizează sesiunea că utilizatorul s-a alăturat
      if (sessionId) {
        await fetch(`/api/video/session/${sessionId}/end`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            joinedAt: new Date().toISOString(),
            status: 'IN_PROGRESS'
          }),
          credentials: 'include'
        });
      }

      // Event listeners pentru recording
      frameRef.current.on('recording-started', async () => {
        setIsRecording(true);
        console.log('✅ Recording started automatically');
        
        // Notifică backend-ul că înregistrarea a început
        if (sessionId) {
          try {
            const response = await fetch(`/api/video/session/${sessionId}/recording`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'start' }),
              credentials: 'include'
            });
            
            if (response.ok) {
              console.log('✅ Backend notificat despre start recording');
            } else {
              console.error('❌ Eroare la notificarea backend pentru start recording');
            }
          } catch (error) {
            console.error('❌ Eroare la trimiterea notificării start recording:', error);
          }
        }
      });

      frameRef.current.on('recording-stopped', async () => {
        setIsRecording(false);
        console.log('🛑 Recording stopped automatically');
        
        // Notifică backend-ul că înregistrarea s-a oprit
        if (sessionId) {
          try {
            const response = await fetch(`/api/video/session/${sessionId}/recording`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'stop' }),
              credentials: 'include'
            });
            
            if (response.ok) {
              console.log('✅ Backend notificat despre stop recording');
            } else {
              console.error('❌ Eroare la notificarea backend pentru stop recording');
            }
          } catch (error) {
            console.error('❌ Eroare la trimiterea notificării stop recording:', error);
          }
        }
      });

      frameRef.current.on('recording-error', (event: any) => {
        console.error('❌ Recording error:', event);
      });

      // Ascultă când utilizatorii părăsesc - cu protecție pentru schimbarea tab-ului
      frameRef.current.on('left-meeting', async () => {
        console.log('User left the meeting, intentional:', isIntentionalLeave, 'tab hidden:', document.hidden);
        
        // Dacă este o ieșire intenționată (buton apăsat), redirecționează imediat
        if (isIntentionalLeave) {
          handleActualLeave();
          return;
        }
        
        // Dacă tab-ul nu este vizibil, poate fi doar o schimbare de tab
        if (document.hidden) {
          console.log('Tab is hidden, delaying redirect to check if user returns...');
          
          // Așteaptă 3 secunde să vezi dacă utilizatorul se întoarce
          setTimeout(async () => {
            // Verifică din nou dacă utilizatorul este încă în întâlnire
            if (frameRef.current) {
              const meetingState = frameRef.current.meetingState();
              console.log('Meeting state after delay:', meetingState);
              
              // Dacă încă nu este conectat și tab-ul încă nu e vizibil, redirecționează
              if (meetingState !== 'joined' && document.hidden) {
                console.log('User still not in meeting and tab still hidden, redirecting...');
                handleActualLeave();
              }
            }
          }, 3000);
          return;
        }
        
        // Dacă tab-ul este vizibil, verifică statusul înainte de redirecționare
        setTimeout(() => {
          if (frameRef.current) {
            const meetingState = frameRef.current.meetingState();
            console.log('Meeting state after brief delay:', meetingState);
            
            if (meetingState !== 'joined' && meetingState !== 'joining') {
              handleActualLeave();
            }
          }
        }, 1000);
      });

      const handleActualLeave = () => {
        console.log('User actually left the meeting');
        
        // Actualizează sesiunea că utilizatorul a părăsit
        if (sessionId) {
          fetch(`/api/video/session/${sessionId}/end`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              leftAt: new Date().toISOString()
            }),
            credentials: 'include'
          });
        }
        router.push(`/profil`);
      };

      frameRef.current.on('participant-left', (event: any) => {
        console.log('Participant left:', event);
      });

      frameRef.current.on('participant-joined', (event: any) => {
        console.log('Participant joined:', event);
        // Actualizează numărul de participanți
        if (sessionId && isProvider) {
          const participantCount = frameRef.current?.participants()?.length || 1;
          fetch(`/api/video/session/${sessionId}/end`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              participantCount: participantCount
            }),
            credentials: 'include'
          });
        }
      });

    })();

    return () => {
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, [status, session?.user, roomUrl, router, isProvider, loading, sessionId, isIntentionalLeave]);

  // Timer de countdown până la endDate inclus în URL
  useEffect(() => {
    const endParam = params.get('end');
    if (!endParam) return;
    const end = parseISO(endParam);
    function update() {
      const mins = Math.max(0, differenceInMinutes(end, new Date()));
      setMinutesLeft(mins);
      
      // Auto-închide sesiunea când se termină timpul (doar pentru provider)
      if (mins === 0 && isProvider && !sessionEnded) {
        handleEndSession();
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [params, isProvider, sessionEnded]);

  // Funcție pentru leave manual
  const handleLeave = async () => {
    setIsIntentionalLeave(true); // Marchează că este o ieșire intenționată
    if (frameRef.current) {
      await frameRef.current.leave();
      router.push('/profil?tab=sessions');
    }
  };

  // Funcție pentru închiderea definitivă a sesiunii (doar provider)
  const handleEndSession = async () => {
    if (!isProvider || sessionEnded) return;
    
    if (!confirm('Ești sigur că vrei să închizi definitiv această sesiune? Toți participanții vor fi scoși.')) {
      return;
    }

    try {
      setIsIntentionalLeave(true); // Marchează că este o închidere intenționată
      
      // Calculează durata actuală
      const durationParam = params.get('duration');
      const estimatedDuration = durationParam ? parseInt(durationParam) : 60;
      const actualDuration = minutesLeft > 0 ? (estimatedDuration - minutesLeft) : estimatedDuration;

      // Obține numărul de participanți
      const participantCount = frameRef.current?.participants()?.length || 1;

      // Notifică backend-ul că sesiunea s-a terminat
      if (sessionId) {
        const response = await fetch(`/api/video/session/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            endedBy: session?.user?.id,
            actualDuration: actualDuration,
            participantCount: participantCount
          }),
          credentials: 'include'
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Eroare la închiderea sesiunii');
        }

        console.log('Session ended successfully:', result);
      }

      // Închide sesiunea pentru toți participanții
      if (frameRef.current) {
        await frameRef.current.leave();
      }

      setSessionEnded(true);
      alert('Sesiunea a fost închisă cu succes! Înregistrarea va fi disponibilă în câteva minute.');
      router.push('/profil');
      
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Eroare la închiderea sesiunii: ' + (error as Error).message);
    }
  };

  if (status === 'loading' || loading) return <p>Se încarcă sesiunea…</p>;
  if (status !== 'authenticated') return <p>Autentificare necesară</p>;
  if (!roomUrl) return <p>URL-ul camerei lipsește din parametri</p>;
  if (sessionEnded) return <p>Sesiunea s-a încheiat.</p>;

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Timer */}
      {params.get('end') && (
        <div className="absolute bottom-12 left-8 p-2 bg-gray-800 bg-opacity-75 rounded-lg text-white font-mono">
          <span className="text-lg lg:text-xl font-bold mr-1">{minutesLeft}</span>
          <span>minute rămase</span>
        </div>
      )}

      {/* Controale pentru Provider */}
      {isProvider && (
        <div className="absolute top-8 left-4 space-y-2">
          {/* Buton Leave */}
          <button
            onClick={handleLeave}
            className="block w-full px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Părăsește
          </button>

          {/* Buton Închidere Sesiune */}
          <button
            onClick={handleEndSession}
            className="block w-full px-2 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Închide sesiunea
          </button>
        </div>
      )}

      {/* Buton Leave pentru client (non-provider) */}
      {!isProvider && (
        <button
          onClick={handleLeave}
          className="absolute top-8 left-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Părăsește sesiunea
        </button>
      )}
    </div>
  );
}