// workers/consultationReminderWorker.ts - WORKER PENTRU REMINDER-URI (BullMQ v5 Compatible)
import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '../lib/prisma';
import { 
  sendConsultationReminder24h, 
  sendConsultationReminder1h, 
  sendConsultationReminderAtTime 
} from '../lib/mail';
import type { ConsultationReminderJobData } from '../lib/queue';

// Configurare Redis pentru worker (identică cu cea din queue.ts)
const getRedisConfig = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for consultation reminder worker');
  }
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    db: 0,
    maxRetriesPerRequest: 3,        // limit retries for stability
    retryDelayOnFailover: 100,
    lazyConnect: true,
    connectTimeout: 30000,          // reduced from 60s to 30s
    commandTimeout: 15000,          // set 15s timeout instead of 0 (infinite)
    keepAlive: 30000,               // keep connection alive
    family: 4,                      // force IPv4
    ...(url.protocol === 'rediss:' && { tls: { rejectUnauthorized: false } })
  };
};

const redisOptions = getRedisConfig();

// Queue pentru monitoring și management (înlocuiește QueueScheduler)
let reminderQueue: Queue<ConsultationReminderJobData> | null = null;

// 🔄 FUNCȚIA PRINCIPALĂ DE PROCESARE A JOB-URILOR
async function processConsultationReminder(job: Job<ConsultationReminderJobData>) {
  const { sessionId, clientEmail, clientName, providerName,
          sessionStartTime, sessionEndTime, reminderType,
          dailyRoomUrl, sessionNotes, originalSessionTime } = job.data;
  const jobId = job.id;
  const start = Date.now();
  console.log(`\n📧 [${jobId}] Processing ${reminderType} for session ${sessionId}`);

  try {
    // 1️⃣ Verificări: existență, status, timp și email
    const session = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      select: {
        status: true, startDate: true, endDate: true,
        dailyRoomUrl: true, notes: true,
        client: { select: { id: true, name: true, email: true } },
        provider: { select: { user: { select: { name: true } } } }
      }
    });
    if (!session) throw new Error('SessionNotFound');
    if (['CANCELLED','COMPLETED'].includes(session.status)) throw new Error(`Session${session.status}`);
    const dbStart = session.startDate?.toISOString();
    if (originalSessionTime && dbStart !== originalSessionTime) throw new Error('SessionRescheduled');
    if (!session.client.email) throw new Error('ClientNoEmail');
    const now = new Date();
    const scheduled = session.startDate ? new Date(session.startDate) : new Date(sessionStartTime);
    if (now >= scheduled) throw new Error('SessionStarted');

    // 2️⃣ Pregătire date efective
    const emailTo = session.client.email;
    const nameTo = session.client.name || clientName;
    const providerTo = session.provider.user.name || providerName;
    const roomUrl = session.dailyRoomUrl || dailyRoomUrl;
    const notes = session.notes || sessionNotes;
    const startTime = session.startDate?.toISOString() || sessionStartTime;
    const endTime = session.endDate?.toISOString() || sessionEndTime;

    // 3️⃣ Trimitere email
    if (reminderType === '24h') {
      await sendConsultationReminder24h(emailTo, nameTo, providerTo, startTime, endTime, roomUrl, notes);
    } else if (reminderType === '1h') {
      await sendConsultationReminder1h(emailTo, nameTo, providerTo, startTime, endTime, roomUrl, notes);
    } else if (reminderType === 'at_time') {
      await sendConsultationReminderAtTime(emailTo, nameTo, providerTo, startTime, endTime, roomUrl, notes);
    } else {
      throw new Error('UnknownReminderType');
    }
    console.log(`✅ [${jobId}] Sent in ${Date.now() - start}ms to ${emailTo}`);

    // 4️⃣ (Opțional) Salvare status în DB
    try {
      /*
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: { remindersSent: { push: { type: reminderType, sentAt: new Date().toISOString(), success: true, sentTo: emailTo, jobId } } }
      });
      */
    } catch {}

    return { success: true, jobId, sessionId, sentTo: emailTo, processedAt: new Date().toISOString(), duration: Date.now() - start };
  } catch (err) {
    console.error(`❌ [${jobId}] Error:`, err instanceof Error ? err.message : err);
    throw err;
  }
}

// 🚀 WORKER INSTANCE
let reminderWorker: Worker<ConsultationReminderJobData> | null = null;

// 🚀 FUNCȚIE PENTRU PORNIREA WORKER-ULUI
export function startConsultationReminderWorker(): Worker<ConsultationReminderJobData> | null {
  if (reminderWorker) {
    console.log('⚠️ Consultation reminder worker already started');
    return reminderWorker;
  }

  if (!process.env.REDIS_URL) {
    console.warn('⚠️ REDIS_URL not configured');
    return null;
  }

  console.log('🔄 Starting consultation reminder worker...');
  console.log(`   Redis: ${redisOptions.host}:${redisOptions.port}`);

  try {
    // Inițializează Queue pentru monitoring (înlocuiește QueueScheduler)
    reminderQueue = new Queue<ConsultationReminderJobData>(
      'consultation-reminders',
      { connection: redisOptions }
    );

    // Inițializează Worker
    reminderWorker = new Worker<ConsultationReminderJobData>(
      'consultation-reminders',
      processConsultationReminder,
      { 
        connection: redisOptions, // Fix: folosește redisOptions în loc de connection nedefinit
        concurrency: 5, 
        removeOnComplete: { count: 25 }, 
        removeOnFail: { count: 100 }, 
        stalledInterval: 30000, 
        maxStalledCount: 1 
      }
    );

    // Event listeners with better error handling
    reminderWorker.on('ready', () => console.log('✅ Worker ready'));
    reminderWorker.on('active', job => console.log(`🔄 Active ${job.id}`));
    reminderWorker.on('completed', (job, res) => console.log(`✅ Completed ${job.id}`));
    reminderWorker.on('failed', (job, err) => console.error(`❌ Failed ${job?.id}:`, err.message));
    
    // Enhanced error handling
    reminderWorker.on('error', err => {
      console.error('❌ Worker error:', err.message);
      if (err.message.includes('Connection is closed') || err.message.includes('Command timed out')) {
        console.log('🔄 Attempting to restart worker in 5 seconds...');
        setTimeout(() => {
          console.log('🔄 Restarting worker due to connection issues...');
          restartWorker();
        }, 5000);
      }
    });

    // Queue event listeners with better error handling
    if (reminderQueue) {
      reminderQueue.on('error', err => {
        console.error('❌ Queue error:', err.message);
        // Don't restart on queue errors, just log them
      });
    }

    console.log('✅ Consultation reminder worker started');
    return reminderWorker;

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    return null;
  }
}

// � FUNCȚIE PENTRU RESTART WORKER
async function restartWorker(): Promise<void> {
  try {
    console.log('🔄 Restarting worker...');
    await stopConsultationReminderWorker();
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newWorker = startConsultationReminderWorker();
    if (newWorker) {
      console.log('✅ Worker restarted successfully');
    } else {
      console.error('❌ Failed to restart worker');
    }
  } catch (error) {
    console.error('❌ Error restarting worker:', error);
  }
}

// �🛑 FUNCȚIE PENTRU OPRIREA WORKER-ULUI
export async function stopConsultationReminderWorker(): Promise<void> {
  if (!reminderWorker) return;
  
  console.log('🛑 Stopping worker...');
  
  try {
    // Oprește worker-ul
    await reminderWorker.close();
    reminderWorker = null;
    
    // Închide queue-ul
    if (reminderQueue) {
      await reminderQueue.close();
      reminderQueue = null;
    }
    
    console.log('✅ Worker stopped');
  } catch (error) {
    console.error('❌ Error stopping worker:', error);
    throw error;
  }
}

// 📊 FUNCȚIE PENTRU STATUSUL WORKER-ULUI
export function getWorkerStatus() {
  if (!reminderWorker) {
    return { 
      running: false,
      message: 'Worker not started'
    };
  }

  try {
    return {
      running: true,
      isRunning: reminderWorker.isRunning(),
      isPaused: reminderWorker.isPaused(),
      // Informații despre procesarea curentă
      concurrency: 5,
      queueName: 'consultation-reminders',
      redisConfigured: !!process.env.REDIS_URL,
      startedAt: new Date().toISOString() // Ar trebui salvat când se pornește worker-ul
    };
  } catch (error) {
    return {
      running: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 🔧 FUNCȚII HELPER PENTRU DEBUGGING

export async function pauseWorker(): Promise<boolean> {
  if (!reminderWorker) return false;
  
  try {
    await reminderWorker.pause();
    console.log('⏸️ Consultation reminder worker paused');
    return true;
  } catch (error) {
    console.error('❌ Failed to pause worker:', error);
    return false;
  }
}

export async function resumeWorker(): Promise<boolean> {
  if (!reminderWorker) return false;
  
  try {
    await reminderWorker.resume();
    console.log('▶️ Consultation reminder worker resumed');
    return true;
  } catch (error) {
    console.error('❌ Failed to resume worker:', error);
    return false;
  }
}

// 📊 FUNCȚII PENTRU MONITORING QUEUE-UL
export async function getQueueStats() {
  if (!reminderQueue) {
    return { error: 'Queue not initialized' };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      reminderQueue.getWaiting(),
      reminderQueue.getActive(),
      reminderQueue.getCompleted(),
      reminderQueue.getFailed(),
      reminderQueue.getDelayed()
    ]);

    return {
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      },
      jobs: {
        waiting: waiting.slice(0, 5).map(job => ({ id: job.id, data: job.data })),
        active: active.slice(0, 5).map(job => ({ id: job.id, data: job.data })),
        failed: failed.slice(0, 5).map(job => ({ id: job.id, failedReason: job.failedReason })),
        delayed: delayed.slice(0, 5).map(job => ({ id: job.id, delay: job.opts.delay }))
      }
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 🧹 GRACEFUL SHUTDOWN PENTRU PROCES
if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📴 Received ${signal} - shutting down consultation reminder worker...`);
    
    try {
      await stopConsultationReminderWorker();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Pentru nodemon
}

// 🚀 AUTO-START WORKER DACĂ FIȘIERUL ESTE RULAT DIRECT
if (require.main === module) {
  console.log('🔄 Starting consultation reminder worker in standalone mode...');
  
  const worker = startConsultationReminderWorker();
  
  if (worker) {
    console.log('\n🎯 Worker started successfully!');
    console.log('   Waiting for reminder jobs...');
    console.log('   Press Ctrl+C to stop');
    
    // Afișează statistici periodic
    setInterval(async () => {
      const stats = await getQueueStats();
      if (!stats.error) {
        console.log(`📊 Queue stats: ${JSON.stringify(stats.counts)}`);
      }
    }, 60000); // la fiecare minut
    
  } else {
    console.log('\n❌ Failed to start worker');
    console.log('   Check your Redis configuration and try again');
    process.exit(1);
  }
}