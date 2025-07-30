// hooks/useQueueStatus.ts - HOOK PENTRU STATUS COADĂ
import { useState, useEffect, useCallback } from 'react';

export interface QueueStatus {
  available: boolean;
  counts?: {
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  };
  jobs?: {
    waiting: Array<{ id: string; name: string; delay?: number }>;
    delayed: Array<{ id: string; name: string; delay?: number }>;
    active: Array<{ id: string; name: string }>;
  };
}

export interface WorkerStatus {
  running: boolean;
  isRunning?: boolean;
  isPaused?: boolean;
}

export interface QueueStatusResponse {
  success: boolean;
  timestamp: string;
  configuration: {
    redisConfigured: boolean;
    redisUrl: string | null;
    nodeEnv: string;
  };
  queue: QueueStatus;
  worker: WorkerStatus;
}

export interface UseQueueStatusResult {
  data: QueueStatusResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  executeAction: (action: string, params?: Record<string, any>) => Promise<any>;
}

export function useQueueStatus(
  autoRefresh = false,
  refreshInterval = 30000 // 30 secunde
): UseQueueStatusResult {
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/queue', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Nu aveți permisiuni de admin pentru a vedea status-ul cozii');
        }
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Eroare necunoscută';
      setError(message);
      console.error('Error fetching queue status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeAction = useCallback(async (action: string, params: Record<string, any> = {}) => {
    try {
      const response = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          ...params,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Nu aveți permisiuni de admin pentru această acțiune');
        }
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Refresh status-ul după acțiune
      await fetchQueueStatus();
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Eroare la executarea acțiunii';
      setError(message);
      throw err;
    }
  }, [fetchQueueStatus]);

  // Initial fetch
  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchQueueStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchQueueStatus]);

  return {
    data,
    loading,
    error,
    refresh: fetchQueueStatus,
    executeAction,
  };
}

// Hook secundar pentru anularea reminder-urilor unei sesiuni
export function useCancelSessionReminders() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelReminders = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/queue?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Eroare la anularea reminder-urilor');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Eroare necunoscută';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cancelReminders,
    loading,
    error,
  };
}

// Hook pentru verificarea stării queue-ului pentru utilizatori obișnuiți
export function useReminderCapability() {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifică dacă reminder-urile sunt activate pe baza env variables
    const checkCapability = async () => {
      try {
        // Încearcă un request simplu pentru a vedea dacă queue-ul e disponibil
        const response = await fetch('/api/admin/queue', {
          method: 'GET',
          credentials: 'include',
        });
        
        // Chiar dacă nu avem permisiuni admin, răspunsul ne spune că sistemul e configurat
        if (response.status === 403) {
          setReminderEnabled(true);
        } else if (response.ok) {
          const data = await response.json();
          setReminderEnabled(data.configuration?.redisConfigured || false);
        } else {
          setReminderEnabled(false);
        }
      } catch {
        // Folosește fallback la env variables din build
        setReminderEnabled(process.env.NEXT_PUBLIC_BULLMQ_ENABLED === 'true');
      } finally {
        setLoading(false);
      }
    };

    checkCapability();
  }, []);

  return {
    reminderEnabled,
    loading,
  };
}