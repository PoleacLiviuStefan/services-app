// lib/queue.ts - SISTEM COMPLET DE QUEUE-URI PENTRU CONSULTAȚII
import { Queue, Worker, Job } from 'bullmq';

// Configurare Redis pentru BullMQ
const getRedisConfig = () => {
  if (!process.env.REDIS_URL) {
    console.warn('⚠️ REDIS_URL not configured - job queues will not work');
    return null;
  }

  // Parse Redis URL pentru BullMQ
  const url = new URL(process.env.REDIS_URL);
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    db: 0, // BullMQ folosește db 0 by default
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    connectTimeout: 30000,
    commandTimeout: 15000,
    keepAlive: 30000,
    family: 4,
    // Pentru conexiuni SSL (dacă e necesar)
    ...(url.protocol === 'rediss:' && {
      tls: {
        rejectUnauthorized: false
      }
    })
  };
};

const redisConfig = getRedisConfig();

// 🆕 TIPURI COMPLETE PENTRU JOB-URI
export interface ConsultationReminderJobData {
  // Identificatori
  sessionId: string;
  clientId: string;
  providerId: string;
  
  // Date personale
  clientEmail: string;
  clientName: string;
  providerName: string;
  
  // Timing
  sessionStartTime: string; // ISO string
  sessionEndTime: string;   // ISO string
  reminderType: '24h' | '1h' | 'at_time'; // 🆕 3 tipuri de reminder-uri
  
  // Opționale
  dailyRoomUrl?: string;
  sessionNotes?: string;
  consultationType?: string;
  
  // Metadata pentru tracking
  scheduledAt?: string;      // Când a fost programat reminder-ul
  originalSessionTime?: string; // Pentru detectarea modificărilor
}

// Alte tipuri de job-uri pentru viitor
export interface EmailJobData {
  type: 'confirmation' | 'cancellation' | 'reschedule' | 'test';
  to: string;
  data: any;
}

export interface NotificationJobData {
  userId: string;
  type: 'reminder' | 'update' | 'system';
  message: string;
  metadata?: any;
}

// 🆕 QUEUE PENTRU REMINDER-URI DE CONSULTAȚII
export const consultationReminderQueue = redisConfig ? new Queue<ConsultationReminderJobData>(
  'consultation-reminders',
  {
    connection: redisConfig,
    defaultJobOptions: {
      removeOnComplete: 25,  // Păstrează ultimele 25 job-uri completate
      removeOnFail: 100,     // Păstrează ultimele 100 job-uri eșuate
      attempts: 3,           // Numărul de încercări
      backoff: {
        type: 'exponential',
        delay: 5000,         // 5s, 10s, 20s
      },
      // Setări pentru job-urile delayed
      delay: 0,
    },
  }
) : null;

// 🆕 QUEUE PENTRU EMAIL-URI GENERALE
export const emailQueue = redisConfig ? new Queue<EmailJobData>(
  'email-notifications',
  {
    connection: redisConfig,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  }
) : null;

// 🆕 FUNCȚIA PRINCIPALĂ PENTRU PROGRAMAREA REMINDER-URILOR
export async function scheduleConsultationReminders(sessionData: {
  sessionId: string;
  clientId: string;
  providerId: string;
  clientEmail: string;
  clientName: string;
  providerName: string;
  sessionStartTime: Date;
  sessionEndTime: Date;
  dailyRoomUrl?: string;
  sessionNotes?: string;
  consultationType?: string;
}) {
  if (!consultationReminderQueue) {
    console.warn('⚠️ Consultation reminder queue not available - skipping reminder scheduling');
    return { 
      success: false, 
      message: 'Queue not available - check Redis configuration',
      scheduledJobs: [],
      scheduledCount: 0,
      sessionId: sessionData.sessionId
    };
  }

  try {
    const now = new Date();
    const sessionStart = new Date(sessionData.sessionStartTime);
    
    // Validări de siguranță
    if (sessionStart <= now) {
      console.warn(`⚠️ Cannot schedule reminders for past session ${sessionData.sessionId}`);
      return {
        success: false,
        message: 'Session is in the past',
        scheduledJobs: [],
        scheduledCount: 0,
        sessionId: sessionData.sessionId
      };
    }

    // Calculează delay-urile pentru reminder-uri
    const msIn24h = 24 * 60 * 60 * 1000;
    const msIn1h = 60 * 60 * 1000;
    const msIn2min = 2 * 60 * 1000;
    
    const delay24h = sessionStart.getTime() - now.getTime() - msIn24h;    // 24h înainte
    const delay1h = sessionStart.getTime() - now.getTime() - msIn1h;      // 1h înainte
    const delayAtTime = sessionStart.getTime() - now.getTime() - msIn2min; // 2 minute înainte

    console.log(`⏰ Scheduling reminders for session ${sessionData.sessionId}:`);
    console.log(`   - Session start: ${sessionStart.toISOString()}`);
    console.log(`   - Current time: ${now.toISOString()}`);
    console.log(`   - 24h reminder: ${delay24h > 0 ? 'YES' : 'NO'} (delay: ${delay24h}ms)`);
    console.log(`   - 1h reminder: ${delay1h > 0 ? 'YES' : 'NO'} (delay: ${delay1h}ms)`);
    console.log(`   - At-time reminder: ${delayAtTime > 0 ? 'YES' : 'NO'} (delay: ${delayAtTime}ms)`);

    const scheduledJobs: { type: string; jobId: string; scheduledFor: Date }[] = [];
    const jobPromises: Promise<Job<ConsultationReminderJobData>>[] = [];

    // Date comune pentru toate job-urile
    const baseJobData = {
      sessionId: sessionData.sessionId,
      clientId: sessionData.clientId,
      providerId: sessionData.providerId,
      clientEmail: sessionData.clientEmail,
      clientName: sessionData.clientName,
      providerName: sessionData.providerName,
      sessionStartTime: sessionData.sessionStartTime.toISOString(),
      sessionEndTime: sessionData.sessionEndTime.toISOString(),
      dailyRoomUrl: sessionData.dailyRoomUrl,
      sessionNotes: sessionData.sessionNotes,
      consultationType: sessionData.consultationType || 'CONSULTATION',
      scheduledAt: now.toISOString(),
      originalSessionTime: sessionData.sessionStartTime.toISOString(),
    };

    // 📅 JOB PENTRU REMINDER 24H ÎNAINTE
    if (delay24h > 0) {
      const jobId = `reminder-24h-${sessionData.sessionId}`;
      const job24h = consultationReminderQueue.add(
        'send-reminder',
        {
          ...baseJobData,
          reminderType: '24h' as const,
        },
        {
          delay: delay24h,
          jobId: jobId,
        }
      );
      jobPromises.push(job24h);
      scheduledJobs.push({
        type: '24h',
        jobId: jobId,
        scheduledFor: new Date(now.getTime() + delay24h)
      });
      console.log(`✅ 24h reminder scheduled for session ${sessionData.sessionId} at ${new Date(now.getTime() + delay24h).toISOString()}`);
    } else {
      console.log(`⚠️ Session ${sessionData.sessionId} starts in less than 24h - skipping 24h reminder`);
    }

    // 🕐 JOB PENTRU REMINDER 1H ÎNAINTE
    if (delay1h > 0) {
      const jobId = `reminder-1h-${sessionData.sessionId}`;
      const job1h = consultationReminderQueue.add(
        'send-reminder',
        {
          ...baseJobData,
          reminderType: '1h' as const,
        },
        {
          delay: delay1h,
          jobId: jobId,
        }
      );
      jobPromises.push(job1h);
      scheduledJobs.push({
        type: '1h',
        jobId: jobId,
        scheduledFor: new Date(now.getTime() + delay1h)
      });
      console.log(`✅ 1h reminder scheduled for session ${sessionData.sessionId} at ${new Date(now.getTime() + delay1h).toISOString()}`);
    } else {
      console.log(`⚠️ Session ${sessionData.sessionId} starts in less than 1h - skipping 1h reminder`);
    }

    // ⚡ JOB PENTRU REMINDER "LA TIMP" (2 minute înainte)
    if (delayAtTime > 0) {
      const jobId = `reminder-at-time-${sessionData.sessionId}`;
      const jobAtTime = consultationReminderQueue.add(
        'send-reminder',
        {
          ...baseJobData,
          reminderType: 'at_time' as const,
        },
        {
          delay: delayAtTime,
          jobId: jobId,
        }
      );
      jobPromises.push(jobAtTime);
      scheduledJobs.push({
        type: 'at_time',
        jobId: jobId,
        scheduledFor: new Date(now.getTime() + delayAtTime)
      });
      console.log(`✅ At-time reminder scheduled for session ${sessionData.sessionId} at ${new Date(now.getTime() + delayAtTime).toISOString()}`);
    } else {
      console.log(`⚠️ Session ${sessionData.sessionId} starts in less than 2 minutes - skipping at-time reminder`);
    }

    // Așteaptă ca toate job-urile să fie adăugate
    const jobs = await Promise.all(jobPromises);
    
    console.log(`🎯 Successfully scheduled ${jobs.length} reminder jobs for session ${sessionData.sessionId}`);
    
    return {
      success: true,
      scheduledJobs: scheduledJobs,
      scheduledCount: jobs.length,
      sessionId: sessionData.sessionId,
      message: `Scheduled ${jobs.length} reminder(s) successfully`
    };

  } catch (error) {
    console.error('❌ Error scheduling consultation reminders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      scheduledJobs: [],
      scheduledCount: 0,
      sessionId: sessionData.sessionId,
      message: `Failed to schedule reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 🚫 FUNCȚIE PENTRU ANULAREA REMINDER-URILOR
export async function cancelConsultationReminders(sessionId: string) {
  if (!consultationReminderQueue) {
    console.warn('⚠️ Consultation reminder queue not available - cannot cancel reminders');
    return { 
      success: false, 
      message: 'Queue not available',
      cancelledJobs: []
    };
  }

  try {
    console.log(`🚫 Attempting to cancel reminders for session ${sessionId}`);
    
    // ID-urile job-urilor de anulat
    const jobIds = [
      `reminder-24h-${sessionId}`,
      `reminder-1h-${sessionId}`,
      `reminder-at-time-${sessionId}`,
    ];

    const cancelResults: { jobId: string; success: boolean; reason?: string }[] = [];

    // Încearcă să anuleze fiecare job
    for (const jobId of jobIds) {
      try {
        const job = await consultationReminderQueue.getJob(jobId);
        
        if (job) {
          const state = await job.getState();
          console.log(`   - Job ${jobId}: state = ${state}`);
          
          if (state === 'delayed' || state === 'waiting') {
            await job.remove();
            cancelResults.push({ jobId, success: true });
            console.log(`✅ Cancelled job ${jobId}`);
          } else {
            cancelResults.push({ 
              jobId, 
              success: false, 
              reason: `Job is ${state}, cannot cancel` 
            });
            console.log(`⚠️ Job ${jobId} is ${state}, cannot cancel`);
          }
        } else {
          cancelResults.push({ 
            jobId, 
            success: false, 
            reason: 'Job not found' 
          });
          console.log(`⚠️ Job ${jobId} not found`);
        }
      } catch (jobError) {
        cancelResults.push({ 
          jobId, 
          success: false, 
          reason: jobError instanceof Error ? jobError.message : 'Unknown error' 
        });
        console.warn(`⚠️ Error handling job ${jobId}:`, jobError);
      }
    }

    const successfulCancellations = cancelResults.filter(r => r.success).length;
    
    console.log(`✅ Cancelled ${successfulCancellations}/${jobIds.length} reminder jobs for session ${sessionId}`);
    
    return { 
      success: true,
      cancelledJobs: cancelResults,
      cancelledCount: successfulCancellations,
      sessionId
    };

  } catch (error) {
    console.error(`❌ Error cancelling reminders for session ${sessionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cancelledJobs: [],
      sessionId
    };
  }
}

// 🔄 FUNCȚIE PENTRU REPROGRAMAREA REMINDER-URILOR
export async function rescheduleConsultationReminders(
  sessionId: string,
  newSessionData: {
    clientId: string;
    providerId: string;
    clientEmail: string;
    clientName: string;
    providerName: string;
    sessionStartTime: Date;
    sessionEndTime: Date;
    dailyRoomUrl?: string;
    sessionNotes?: string;
    consultationType?: string;
  }
) {
  console.log(`🔄 Rescheduling reminders for session ${sessionId}`);
  
  // Anulează reminder-urile existente
  const cancelResult = await cancelConsultationReminders(sessionId);
  console.log(`   - Cancelled ${cancelResult.cancelledCount || 0} existing reminders`);
  
  // Programează reminder-uri noi
  const scheduleResult = await scheduleConsultationReminders({
    sessionId,
    ...newSessionData,
  });
  
  console.log(`   - Scheduled ${scheduleResult.scheduledCount || 0} new reminders`);
  
  return {
    success: scheduleResult.success,
    cancelled: cancelResult,
    scheduled: scheduleResult,
    message: `Rescheduled: cancelled ${cancelResult.cancelledCount || 0}, scheduled ${scheduleResult.scheduledCount || 0} reminders`
  };
}

// 📊 FUNCȚIE PENTRU STATUSUL QUEUE-ULUI
export async function getQueueStatus() {
  if (!consultationReminderQueue) {
    return { 
      available: false, 
      message: 'Queue not configured - check Redis settings' 
    };
  }

  try {
    const [waiting, delayed, active, completed, failed] = await Promise.all([
      consultationReminderQueue.getWaiting(),
      consultationReminderQueue.getDelayed(),
      consultationReminderQueue.getActive(),
      consultationReminderQueue.getCompleted(),
      consultationReminderQueue.getFailed(),
    ]);

    return {
      available: true,
      timestamp: new Date().toISOString(),
      counts: {
        waiting: waiting.length,
        delayed: delayed.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + delayed.length + active.length
      },
      jobs: {
        waiting: waiting.slice(0, 5).map(job => ({
          id: job.id,
          name: job.name,
          data: {
            sessionId: job.data.sessionId,
            reminderType: job.data.reminderType,
            clientName: job.data.clientName,
            sessionStartTime: job.data.sessionStartTime
          }
        })),
        delayed: delayed.slice(0, 10).map(job => ({
          id: job.id,
          name: job.name,
          delay: job.opts.delay,
          scheduledFor: new Date(Date.now() + (job.opts.delay || 0)).toISOString(),
          data: {
            sessionId: job.data.sessionId,
            reminderType: job.data.reminderType,
            clientName: job.data.clientName,
            sessionStartTime: job.data.sessionStartTime
          }
        })),
        active: active.map(job => ({
          id: job.id,
          name: job.name,
          processedOn: job.processedOn,
          data: {
            sessionId: job.data.sessionId,
            reminderType: job.data.reminderType,
            clientName: job.data.clientName
          }
        })),
        recent_completed: completed.slice(0, 5).map(job => ({
          id: job.id,
          finishedOn: job.finishedOn,
          data: {
            sessionId: job.data.sessionId,
            reminderType: job.data.reminderType,
            clientName: job.data.clientName
          }
        })),
        recent_failed: failed.slice(0, 5).map(job => ({
          id: job.id,
          failedReason: job.failedReason,
          data: {
            sessionId: job.data.sessionId,
            reminderType: job.data.reminderType,
            clientName: job.data.clientName
          }
        }))
      }
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// 🔍 FUNCȚII HELPER PENTRU DEBUGGING

export async function getJobDetails(jobId: string) {
  if (!consultationReminderQueue) {
    return { error: 'Queue not available' };
  }

  try {
    const job = await consultationReminderQueue.getJob(jobId);
    
    if (!job) {
      return { error: 'Job not found' };
    }

    const state = await job.getState();
    
    return {
      id: job.id,
      name: job.name,
      state,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      returnvalue: job.returnvalue,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getSessionReminders(sessionId: string) {
  if (!consultationReminderQueue) {
    return { error: 'Queue not available' };
  }

  try {
    const jobIds = [
      `reminder-24h-${sessionId}`,
      `reminder-1h-${sessionId}`,
      `reminder-at-time-${sessionId}`,
    ];

    const results = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await consultationReminderQueue.getJob(jobId);
        if (!job) return null;
        
        const state = await job.getState();
        return {
          jobId,
          state,
          data: job.data,
          scheduledFor: job.opts.delay ? new Date(Date.now() + job.opts.delay) : null,
          progress: job.progress
        };
      })
    );

    return {
      sessionId,
      reminders: results.filter(r => r !== null),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    };
  }
}

// 📧 FUNCȚIE PENTRU TRIMITEREA EMAIL-URILOR GENERALE
export async function scheduleEmail(emailData: EmailJobData, delay?: number) {
  if (!emailQueue) {
    console.warn('⚠️ Email queue not available');
    return { success: false, message: 'Email queue not configured' };
  }

  try {
    const job = await emailQueue.add(
      'send-email',
      emailData,
      { delay: delay || 0 }
    );

    return {
      success: true,
      jobId: job.id,
      message: 'Email scheduled successfully'
    };
  } catch (error) {
    console.error('❌ Error scheduling email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 🧹 CLEANUP FUNCȚII
export async function closeQueues() {
  const promises = [];
  
  if (consultationReminderQueue) {
    promises.push(consultationReminderQueue.close());
    console.log('🔄 Closing consultation reminder queue...');
  }
  
  if (emailQueue) {
    promises.push(emailQueue.close());
    console.log('🔄 Closing email queue...');
  }

  await Promise.all(promises);
  console.log('✅ All queues closed');
}

// 🧪 FUNCȚIE DE TEST
export async function testQueue() {
  if (!consultationReminderQueue) {
    return { success: false, message: 'Queue not available' };
  }

  try {
    const testJobData: ConsultationReminderJobData = {
      sessionId: `test-${Date.now()}`,
      clientId: 'test-client',
      providerId: 'test-provider',
      clientEmail: 'test@example.com',
      clientName: 'Test Client',
      providerName: 'Test Provider',
      sessionStartTime: new Date(Date.now() + 60000).toISOString(), // 1 minut în viitor
      sessionEndTime: new Date(Date.now() + 120000).toISOString(),  // 2 minute în viitor
      reminderType: 'at_time',
      consultationType: 'TEST'
    };

    const job = await consultationReminderQueue.add(
      'test-reminder',
      testJobData,
      { delay: 5000 } // 5 secunde delay
    );

    return {
      success: true,
      jobId: job.id,
      message: 'Test job added successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}