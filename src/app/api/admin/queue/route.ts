// /api/admin/queue/route.ts - ENDPOINT PENTRU ADMINISTRAREA COZII
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getQueueStatus, 
  cancelConsultationReminders, 
  consultationReminderQueue 
} from '@/lib/queue';
import { 
  startConsultationReminderWorker, 
  stopConsultationReminderWorker, 
  getWorkerStatus 
} from '@/workers/consultationReminderWorker';

// GET - Status coadă și worker
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Verifică că utilizatorul este admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log('📊 Verificare status coadă și worker...');

    // Obține statusul cozii
    const queueStatus = await getQueueStatus();
    
    // Obține statusul worker-ului
    const workerStatus = getWorkerStatus();

    // Informații despre configurare
    const redisConfigured = !!process.env.REDIS_URL;
    const redisUrl = process.env.REDIS_URL ? 
      process.env.REDIS_URL.replace(/\/\/[^:]*:[^@]*@/, '//****:****@') : 
      null;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      configuration: {
        redisConfigured,
        redisUrl,
        nodeEnv: process.env.NODE_ENV,
      },
      queue: queueStatus,
      worker: workerStatus,
    });

  } catch (error) {
    console.error('❌ Error getting queue status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get queue status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Acțiuni pe coadă (start/stop worker, cancel job)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verifică că utilizatorul este admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { action, sessionId, jobId } = await request.json();

    console.log(`🔧 Queue action: ${action}`, { sessionId, jobId });

    switch (action) {
      case 'start_worker':
        {
          const worker = startConsultationReminderWorker();
          return NextResponse.json({
            success: !!worker,
            message: worker ? 'Worker started successfully' : 'Worker could not be started',
            worker: getWorkerStatus(),
          });
        }

      case 'stop_worker':
        {
          await stopConsultationReminderWorker();
          return NextResponse.json({
            success: true,
            message: 'Worker stopped successfully',
            worker: getWorkerStatus(),
          });
        }

      case 'cancel_session_reminders':
        {
          if (!sessionId) {
            return NextResponse.json(
              { error: 'sessionId is required for cancel_session_reminders' },
              { status: 400 }
            );
          }

          const result = await cancelConsultationReminders(sessionId);
          return NextResponse.json({
            success: result.success,
            message: result.success ? 
              `Reminders cancelled for session ${sessionId}` : 
              result.message,
            sessionId,
          });
        }

      case 'remove_job':
        {
          if (!consultationReminderQueue) {
            return NextResponse.json(
              { error: 'Queue not available' },
              { status: 503 }
            );
          }

          if (!jobId) {
            return NextResponse.json(
              { error: 'jobId is required for remove_job' },
              { status: 400 }
            );
          }

          const job = await consultationReminderQueue.getJob(jobId);
          if (!job) {
            return NextResponse.json(
              { error: `Job ${jobId} not found` },
              { status: 404 }
            );
          }

          await job.remove();
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} removed successfully`,
            jobId,
          });
        }

      case 'clean_queue':
        {
          if (!consultationReminderQueue) {
            return NextResponse.json(
              { error: 'Queue not available' },
              { status: 503 }
            );
          }

          // Curăță job-urile completate și eșuate
          await consultationReminderQueue.clean(0, 100, 'completed');
          await consultationReminderQueue.clean(0, 100, 'failed');
          
          return NextResponse.json({
            success: true,
            message: 'Queue cleaned successfully',
          });
        }

      case 'get_job_details':
        {
          if (!consultationReminderQueue) {
            return NextResponse.json(
              { error: 'Queue not available' },
              { status: 503 }
            );
          }

          if (!jobId) {
            return NextResponse.json(
              { error: 'jobId is required for get_job_details' },
              { status: 400 }
            );
          }

          const job = await consultationReminderQueue.getJob(jobId);
          if (!job) {
            return NextResponse.json(
              { error: `Job ${jobId} not found` },
              { status: 404 }
            );
          }

          return NextResponse.json({
            success: true,
            job: {
              id: job.id,
              name: job.name,
              data: job.data,
              opts: job.opts,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              processedOn: job.processedOn,
              finishedOn: job.finishedOn,
              failedReason: job.failedReason,
            },
          });
        }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error executing queue action:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute queue action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Anulare reminder-uri pentru o sesiune
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verifică că utilizatorul este admin sau proprietarul sesiunii
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Pentru non-admin, verifică că sesiunea aparține utilizatorului
    if (session.user.role !== 'ADMIN') {
      const { prisma } = await import('@/lib/prisma');
      
      const consultingSession = await prisma.consultingSession.findUnique({
        where: { id: sessionId },
        select: { clientId: true, providerId: true, provider: { select: { userId: true } } }
      });

      if (!consultingSession) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Verifică că utilizatorul este clientul sau provider-ul
      const isClient = consultingSession.clientId === session.user.id;
      const isProvider = consultingSession.provider.userId === session.user.id;
      
      if (!isClient && !isProvider) {
        return NextResponse.json(
          { error: 'Unauthorized - Session does not belong to user' },
          { status: 403 }
        );
      }
    }

    console.log(`🚫 Anulare reminder-uri pentru sesiunea ${sessionId} de către ${session.user.id}`);

    const result = await cancelConsultationReminders(sessionId);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 
        `Reminder-urile pentru sesiunea ${sessionId} au fost anulate` : 
        result.message,
      sessionId,
    });

  } catch (error) {
    console.error('❌ Error cancelling reminders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}