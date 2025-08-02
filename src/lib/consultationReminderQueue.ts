// lib/consultationReminderQueue.ts - QUEUE HELPER PENTRU REMINDER-URI (BullMQ v5)
import { Queue, JobsOptions } from 'bullmq';
import type { ConsultationReminderJobData } from './queue';

// Configurare Redis pentru queue
const getRedisConfig = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for consultation reminder queue');
  }
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    db: 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    connectTimeout: 30000,
    commandTimeout: 15000,
    keepAlive: 30000,
    family: 4,
    ...(url.protocol === 'rediss:' && { tls: { rejectUnauthorized: false } })
  };
};

const redisOptions = getRedisConfig();

// Singleton instance pentru queue
let consultationReminderQueue: Queue<ConsultationReminderJobData> | null = null;

// 🚀 OBȚINE SAU CREEAZĂ QUEUE-UL
export function getConsultationReminderQueue(): Queue<ConsultationReminderJobData> {
  if (!consultationReminderQueue) {
    consultationReminderQueue = new Queue<ConsultationReminderJobData>(
      'consultation-reminders',
      { 
        connection: redisOptions,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 25,
          removeOnFail: 100,
        }
      }
    );

    // Event listeners pentru monitoring
    consultationReminderQueue.on('error', (error) => {
      console.error('❌ Consultation reminder queue error:', error);
    });

    console.log('✅ Consultation reminder queue initialized');
  }

  return consultationReminderQueue;
}

// 📅 PROGRAMEAZĂ REMINDER PENTRU O SESIUNE
export async function scheduleConsultationReminders(data: {
  sessionId: string;
  clientEmail: string;
  clientName: string;
  providerName: string;
  sessionStartTime: string; // ISO string
  sessionEndTime: string;   // ISO string
  dailyRoomUrl: string;
  sessionNotes?: string;
}) {
  const queue = getConsultationReminderQueue();
  const sessionStart = new Date(data.sessionStartTime);
  const now = new Date();

  // Verifică că sesiunea este în viitor
  if (sessionStart <= now) {
    throw new Error('Cannot schedule reminders for past sessions');
  }

  const jobIds: string[] = [];
  const originalSessionTime = data.sessionStartTime;

  // 📧 REMINDER 24H ÎNAINTE
  const reminder24hTime = new Date(sessionStart.getTime() - 24 * 60 * 60 * 1000);
  if (reminder24hTime > now) {
    const job24h = await queue.add(
      'consultation-reminder-24h',
      {
        ...data,
        reminderType: '24h' as const,
        originalSessionTime
      },
      {
        delay: reminder24hTime.getTime() - now.getTime(),
        jobId: `reminder-24h-${data.sessionId}`,
      }
    );
    jobIds.push(job24h.id!);
    console.log(`📅 Reminder 24h programat pentru ${reminder24hTime.toISOString()}`);
  } else {
    console.log('⚠️ Sesiunea este prea aproape - nu se programează reminder 24h');
  }

  // 📧 REMINDER 1H ÎNAINTE
  const reminder1hTime = new Date(sessionStart.getTime() - 60 * 60 * 1000);
  if (reminder1hTime > now) {
    const job1h = await queue.add(
      'consultation-reminder-1h',
      {
        ...data,
        reminderType: '1h' as const,
        originalSessionTime
      },
      {
        delay: reminder1hTime.getTime() - now.getTime(),
        jobId: `reminder-1h-${data.sessionId}`,
      }
    );
    jobIds.push(job1h.id!);
    console.log(`📅 Reminder 1h programat pentru ${reminder1hTime.toISOString()}`);
  } else {
    console.log('⚠️ Sesiunea este prea aproape - nu se programează reminder 1h');
  }

  // 📧 REMINDER LA TIMP (2 minute înainte)
  const reminderAtTime = new Date(sessionStart.getTime() - 2 * 60 * 1000);
  if (reminderAtTime > now) {
    const jobAtTime = await queue.add(
      'consultation-reminder-at-time',
      {
        ...data,
        reminderType: 'at_time' as const,
        originalSessionTime
      },
      {
        delay: reminderAtTime.getTime() - now.getTime(),
        jobId: `reminder-at-time-${data.sessionId}`,
      }
    );
    jobIds.push(jobAtTime.id!);
    console.log(`📅 Reminder la timp programat pentru ${reminderAtTime.toISOString()}`);
  } else {
    console.log('⚠️ Sesiunea este prea aproape - nu se programează reminder la timp');
  }

  return {
    success: true,
    scheduledCount: jobIds.length,
    jobIds,
    message: `${jobIds.length} reminder-uri programate cu succes`
  };
}

// 🗑️ ANULEAZĂ REMINDER-URILE PENTRU O SESIUNE
export async function cancelConsultationReminders(sessionId: string) {
  const queue = getConsultationReminderQueue();
  
  const jobIds = [
    `reminder-24h-${sessionId}`,
    `reminder-1h-${sessionId}`,
    `reminder-at-time-${sessionId}`
  ];

  const cancelledJobs: string[] = [];
  
  for (const jobId of jobIds) {
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        cancelledJobs.push(jobId);
        console.log(`🗑️ Anulat reminder job: ${jobId}`);
      }
    } catch (error) {
      console.warn(`⚠️ Nu s-a putut anula job-ul ${jobId}:`, error);
    }
  }

  return {
    success: true,
    cancelledCount: cancelledJobs.length,
    cancelledJobs,
    message: `${cancelledJobs.length} reminder-uri anulate`
  };
}

// 📊 OBȚINE STATISTICI QUEUE
export async function getQueueStatistics() {
  const queue = getConsultationReminderQueue();

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      },
      upcomingJobs: delayed.slice(0, 10).map(job => ({
        id: job.id,
        sessionId: job.data.sessionId,
        reminderType: job.data.reminderType,
        scheduledFor: new Date(Date.now() + (job.opts.delay || 0)).toISOString(),
        clientEmail: job.data.clientEmail
      })),
      recentCompleted: completed.slice(0, 5).map(job => ({
        id: job.id,
        sessionId: job.data.sessionId,
        reminderType: job.data.reminderType,
        completedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null
      })),
      recentFailed: failed.slice(0, 5).map(job => ({
        id: job.id,
        sessionId: job.data.sessionId,
        reminderType: job.data.reminderType,
        failedReason: job.failedReason,
        failedAt: job.failedOn ? new Date(job.failedOn).toISOString() : null
      }))
    };
  } catch (error) {
    console.error('❌ Error getting queue statistics:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 }
    };
  }
}

// 🧹 CURĂȚARE QUEUE (pentru maintenance)
export async function cleanQueue(options: {
  grace?: number; // ms pentru job-urile completed/failed mai vechi de
  limit?: number; // numărul maxim de job-uri de șters
} = {}) {
  const queue = getConsultationReminderQueue();
  const { grace = 24 * 60 * 60 * 1000, limit = 100 } = options; // default: 24h, max 100 jobs

  try {
    const [cleanedCompleted, cleanedFailed] = await Promise.all([
      queue.clean(grace, limit, 'completed'),
      queue.clean(grace, limit, 'failed')
    ]);

    console.log(`🧹 Queue cleaned: ${cleanedCompleted.length} completed, ${cleanedFailed.length} failed jobs removed`);
    
    return {
      success: true,
      cleanedCompleted: cleanedCompleted.length,
      cleanedFailed: cleanedFailed.length,
      total: cleanedCompleted.length + cleanedFailed.length
    };
  } catch (error) {
    console.error('❌ Error cleaning queue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 🔄 REPROGRAMEAZĂ REMINDER-URILE PENTRU O SESIUNE (útil pentru reschedule)
export async function rescheduleConsultationReminders(
  sessionId: string,
  newSessionData: {
    clientEmail: string;
    clientName: string;
    providerName: string;
    sessionStartTime: string;
    sessionEndTime: string;
    dailyRoomUrl: string;
    sessionNotes?: string;
  }
) {
  console.log(`🔄 Reprogramare reminder-uri pentru sesiunea ${sessionId}`);
  
  // Anulează reminder-urile existente
  await cancelConsultationReminders(sessionId);
  
  // Programează reminder-urile noi
  const result = await scheduleConsultationReminders({
    sessionId,
    ...newSessionData
  });

  console.log(`✅ Reminder-uri reprogramate: ${result.scheduledCount} job-uri`);
  return result;
}

// 🛑 ÎNCHIDE QUEUE-UL
export async function closeQueue(): Promise<void> {
  if (consultationReminderQueue) {
    await consultationReminderQueue.close();
    consultationReminderQueue = null;
    console.log('✅ Consultation reminder queue closed');
  }
}

// Export pentru backward compatibility
export { consultationReminderQueue };
export default getConsultationReminderQueue;