// src/scripts/start-reminder-worker.ts
import dotenv from 'dotenv';
dotenv.config();

import { startConsultationReminderWorker, stopConsultationReminderWorker } from '../workers/consultationReminderWorker';

async function startWorker() {
  console.log('🚀 Starting consultation reminder worker...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Redis URL: ${process.env.REDIS_URL ? 'configured' : 'NOT CONFIGURED'}`);

  if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL not configured in environment variables');
    console.log('💡 Add REDIS_URL to your .env or .env.local file');
    process.exit(1);
  }

  try {
    const worker = startConsultationReminderWorker();
    
    if (!worker) {
      console.error('❌ Failed to start consultation reminder worker');
      process.exit(1);
    }

    console.log('✅ Consultation reminder worker started successfully!');
    console.log('🎯 Worker is now listening for consultation reminder jobs...');
    console.log('💡 Press Ctrl+C to stop');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
      
      try {
        await stopConsultationReminderWorker();
        console.log('✅ Worker stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Heartbeat
    setInterval(() => {
      console.log(`💓 Worker heartbeat: ${new Date().toLocaleTimeString('ro-RO')}`);
    }, 60000);

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

startWorker().catch((error) => {
  console.error('❌ Fatal error starting worker:', error);
  process.exit(1);
});