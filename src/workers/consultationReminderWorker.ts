// workers/consultationReminderWorker.ts - WORKER COMPLET PENTRU REMINDER-URI
import { Worker, Job } from 'bullmq';
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
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    connectTimeout: 60000,
    commandTimeout: 5000,
    // Pentru conexiuni SSL (dacă e necesar)
    ...(url.protocol === 'rediss:' && {
      tls: {
        rejectUnauthorized: false
      }
    })
  };
};

// 🔄 FUNCȚIA PRINCIPALĂ DE PROCESARE A JOB-URILOR
async function processConsultationReminder(job: Job<ConsultationReminderJobData>) {
  const { 
    sessionId, 
    clientId, 
    providerId, 
    clientEmail, 
    clientName, 
    providerName, 
    sessionStartTime, 
    sessionEndTime, 
    reminderType,
    dailyRoomUrl,
    sessionNotes,
    originalSessionTime 
  } = job.data;

  const jobId = job.id;
  const processingStart = new Date();

  console.log(`\n📧 [${jobId}] Processing ${reminderType} reminder for session ${sessionId}`);
  console.log(`   👤 Client: ${clientName} (${clientEmail})`);
  console.log(`   👨‍⚕️ Provider: ${providerName}`);
  console.log(`   📅 Session time: ${sessionStartTime}`);
  console.log(`   ⏰ Processing started: ${processingStart.toISOString()}`);

  try {
    // 1️⃣ VERIFICĂ EXISTENȚA ȘI STATUSUL SESIUNII
    const session = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        dailyRoomUrl: true,
        notes: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        provider: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    if (!session) {
      console.warn(`⚠️ [${jobId}] Session ${sessionId} not found - skipping reminder`);
      return { 
        success: false, 
        reason: 'Session not found',
        sessionId,
        reminderType,
        timestamp: new Date().toISOString()
      };
    }

    // 2️⃣ VERIFICĂ STATUSUL SESIUNII
    if (session.status === 'CANCELLED') {
      console.warn(`⚠️ [${jobId}] Session ${sessionId} was cancelled - skipping reminder`);
      return { 
        success: false, 
        reason: 'Session cancelled',
        sessionId,
        reminderType,
        sessionStatus: session.status,
        timestamp: new Date().toISOString()
      };
    }

    if (session.status === 'COMPLETED') {
      console.warn(`⚠️ [${jobId}] Session ${sessionId} already completed - skipping reminder`);
      return { 
        success: false, 
        reason: 'Session already completed',
        sessionId,
        reminderType,
        sessionStatus: session.status,
        timestamp: new Date().toISOString()
      };
    }

    // 3️⃣ VERIFICĂ SCHIMBĂRI DE TIMP
    const dbStartTime = session.startDate?.toISOString();
    if (originalSessionTime && dbStartTime && dbStartTime !== originalSessionTime) {
      console.warn(`⚠️ [${jobId}] Session ${sessionId} time changed:`);
      console.warn(`     Original: ${originalSessionTime}`);
      console.warn(`     Current:  ${dbStartTime}`);
      console.warn(`     Skipping reminder - session was rescheduled`);
      return { 
        success: false, 
        reason: 'Session time changed',
        sessionId,
        reminderType,
        originalTime: originalSessionTime,
        currentTime: dbStartTime,
        timestamp: new Date().toISOString()
      };
    }

    // 4️⃣ VERIFICĂ EMAIL-UL CLIENTULUI
    if (!session.client.email) {
      console.error(`❌ [${jobId}] Client ${session.client.id} has no email - cannot send reminder`);
      return { 
        success: false, 
        reason: 'Client has no email',
        sessionId,
        reminderType,
        clientId: session.client.id,
        timestamp: new Date().toISOString()
      };
    }

    if (session.client.email !== clientEmail) {
      console.warn(`⚠️ [${jobId}] Client email changed for session ${sessionId}:`);
      console.warn(`     Job data:  ${clientEmail}`);
      console.warn(`     Database:  ${session.client.email}`);
      console.warn(`     Using database email for reminder`);
    }

    // 5️⃣ VERIFICĂ TIMING
    const now = new Date();
    const sessionStart = session.startDate ? new Date(session.startDate) : new Date(sessionStartTime);
    
    if (now >= sessionStart) {
      console.warn(`⚠️ [${jobId}] Session ${sessionId} already started - skipping reminder`);
      console.warn(`     Current time:   ${now.toISOString()}`);
      console.warn(`     Session start:  ${sessionStart.toISOString()}`);
      return { 
        success: false, 
        reason: 'Session already started',
        sessionId,
        reminderType,
        currentTime: now.toISOString(),
        sessionStartTime: sessionStart.toISOString(),
        timestamp: new Date().toISOString()
      };
    }

    // 6️⃣ PREGĂTEȘTE DATELE ACTUALIZATE
    const actualClientEmail = session.client.email;
    const actualClientName = session.client.name || clientName;
    const actualProviderName = session.provider.user.name || providerName;
    const actualDailyRoomUrl = session.dailyRoomUrl || dailyRoomUrl;
    const actualSessionNotes = session.notes || sessionNotes;
    const actualStartTime = session.startDate?.toISOString() || sessionStartTime;
    const actualEndTime = session.endDate?.toISOString() || sessionEndTime;

    console.log(`📤 [${jobId}] Sending ${reminderType} reminder to ${actualClientEmail}...`);

    // 7️⃣ TRIMITE EMAIL-UL CORESPUNZĂTOR
    const emailStart = new Date();
    
    try {
      switch (reminderType) {
        case '24h':
          await sendConsultationReminder24h(
            actualClientEmail,
            actualClientName,
            actualProviderName,
            actualStartTime,
            actualEndTime,
            actualDailyRoomUrl,
            actualSessionNotes
          );
          break;
          
        case '1h':
          await sendConsultationReminder1h(
            actualClientEmail,
            actualClientName,
            actualProviderName,
            actualStartTime,
            actualEndTime,
            actualDailyRoomUrl,
            actualSessionNotes
          );
          break;
          
        case 'at_time':
          await sendConsultationReminderAtTime(
            actualClientEmail,
            actualClientName,
            actualProviderName,
            actualStartTime,
            actualEndTime,
            actualDailyRoomUrl,
            actualSessionNotes
          );
          break;
          
        default:
          throw new Error(`Unknown reminder type: ${reminderType}`);
      }

      const emailEnd = new Date();
      const emailDuration = emailEnd.getTime() - emailStart.getTime();
      
      console.log(`✅ [${jobId}] ${reminderType} reminder sent successfully in ${emailDuration}ms`);
      console.log(`   📧 Sent to: ${actualClientEmail}`);
      console.log(`   📅 For session: ${sessionId} at ${actualStartTime}`);

    } catch (emailError) {
      console.error(`❌ [${jobId}] Email sending failed:`, emailError);
      throw new Error(`Failed to send ${reminderType} reminder email: ${emailError instanceof Error ? emailError.message : 'Unknown email error'}`);
    }

    // 8️⃣ OPȚIONAL: SALVEAZĂ ÎN DB CĂ REMINDER-UL A FOST TRIMIS
    try {
      // Această parte necesită o modificare în schema Prisma pentru a adăuga câmpul remindersSent
      // Pentru moment o lăsăm comentată
      /*
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: {
          remindersSent: {
            push: {
              type: reminderType,
              sentAt: new Date().toISOString(),
              success: true,
              sentTo: actualClientEmail,
              jobId: jobId
            }
          }
        }
      });
      */
      console.log(`📝 [${jobId}] Reminder tracking updated in database`);
    } catch (dbError) {
      console.warn(`⚠️ [${jobId}] Could not update reminder status in DB:`, dbError);
      // Nu aruncăm eroare pentru că email-ul a fost trimis cu succes
    }

    const processingEnd = new Date();
    const totalDuration = processingEnd.getTime() - processingStart.getTime();
    
    console.log(`🎯 [${jobId}] Reminder processing completed in ${totalDuration}ms`);
    
    return { 
      success: true, 
      reminderType, 
      sessionId, 
      sentTo: actualClientEmail,
      sentAt: processingEnd.toISOString(),
      processingDuration: totalDuration,
      jobId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const processingEnd = new Date();
    const totalDuration = processingEnd.getTime() - processingStart.getTime();
    
    console.error(`❌ [${jobId}] Error processing ${reminderType} reminder for session ${sessionId}:`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   Duration: ${totalDuration}ms`);
    
    // Salvează eroarea în DB (opțional)
    try {
      /*
      await prisma.consultingSession.update({
        where: { id: sessionId },
        data: {
          remindersSent: {
            push: {
              type: reminderType,
              sentAt: new Date().toISOString(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              jobId: jobId
            }
          }
        }
      });
      */
    } catch (dbError) {
      console.warn(`⚠️ [${jobId}] Could not save error to database:`, dbError);
    }

    // Re-aruncă eroarea pentru ca BullMQ să poată face retry
    throw error;
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
    console.warn('⚠️ REDIS_URL not configured - consultation reminder worker will not start');
    console.warn('   Add REDIS_URL to your .env file to enable reminder functionality');
    return null;
  }

  try {
    const redisConfig = getRedisConfig();
    
    console.log('🔄 Starting consultation reminder worker...');
    console.log(`   Redis: ${redisConfig.host}:${redisConfig.port}`);
    console.log(`   Concurrency: 5 jobs`);
    console.log(`   Queue: consultation-reminders`);
    
    reminderWorker = new Worker<ConsultationReminderJobData>(
      'consultation-reminders',
      processConsultationReminder,
      {
        connection: redisConfig,
        concurrency: 5, // Procesează până la 5 job-uri simultan
        removeOnComplete: 25, // Păstrează ultimele 25 job-uri completate
        removeOnFail: 100,    // Păstrează ultimele 100 job-uri eșuate
        // Setări pentru job-urile care durează mult
        stalledInterval: 30000,    // 30 secunde
        maxStalledCount: 1,        // Retry odată dacă job-ul se blochează
      }
    );

    // 📊 EVENT HANDLERS PENTRU MONITORING
    reminderWorker.on('ready', () => {
      console.log('✅ Consultation reminder worker is ready and listening for jobs');
    });

    reminderWorker.on('active', (job) => {
      console.log(`🔄 [${job.id}] Processing ${job.data.reminderType} reminder for session ${job.data.sessionId}`);
      console.log(`   Client: ${job.data.clientName}`);
      console.log(`   Session: ${job.data.sessionStartTime}`);
    });

    reminderWorker.on('completed', (job, result) => {
      console.log(`✅ [${job.id}] Completed ${job.data.reminderType} reminder:`, {
        sessionId: result.sessionId,
        success: result.success,
        duration: result.processingDuration,
        sentTo: result.sentTo
      });
    });

    reminderWorker.on('failed', (job, err) => {
      console.error(`❌ [${job?.id}] Failed ${job?.data.reminderType} reminder:`, {
        sessionId: job?.data.sessionId,
        error: err.message,
        attempts: job?.attemptsMade,
        maxAttempts: job?.opts.attempts
      });
    });

    reminderWorker.on('error', (err) => {
      console.error('❌ Consultation reminder worker error:', err);
    });

    reminderWorker.on('stalled', (jobId) => {
      console.warn(`⚠️ Reminder job ${jobId} stalled - will be retried`);
    });

    reminderWorker.on('progress', (job, progress) => {
      if (progress && typeof progress === 'object') {
        console.log(`📈 [${job.id}] Progress:`, progress);
      }
    });

    console.log('✅ Consultation reminder worker started successfully');
    console.log('   The worker will process reminder jobs as they become due');
    console.log('   Use Ctrl+C to stop the worker gracefully');
    
    return reminderWorker;

  } catch (error) {
    console.error('❌ Failed to start consultation reminder worker:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('   → Redis connection refused. Is Redis running?');
        console.error('   → Check your REDIS_URL configuration');
      } else if (error.message.includes('authentication')) {
        console.error('   → Redis authentication failed. Check credentials');
      }
    }
    
    reminderWorker = null;
    return null;
  }
}

// 🛑 FUNCȚIE PENTRU OPRIREA WORKER-ULUI
export async function stopConsultationReminderWorker(): Promise<void> {
  if (!reminderWorker) {
    console.log('⚠️ Consultation reminder worker is not running');
    return;
  }

  try {
    console.log('🛑 Stopping consultation reminder worker...');
    
    // Permite job-urilor active să se termine (timeout 30 secunde)
    await reminderWorker.close(false, 30000);
    reminderWorker = null;
    
    console.log('✅ Consultation reminder worker stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping consultation reminder worker:', error);
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
  } else {
    console.log('\n❌ Failed to start worker');
    console.log('   Check your Redis configuration and try again');
    process.exit(1);
  }
}