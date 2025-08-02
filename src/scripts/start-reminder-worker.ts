// src/scripts/start-reminder-worker.ts - ENHANCED STARTUP SCRIPT PENTRU BullMQ v5
import dotenv from 'dotenv';
dotenv.config();

import { 
  startConsultationReminderWorker, 
  stopConsultationReminderWorker,
  getWorkerStatus,
  getQueueStats
} from '../workers/consultationReminderWorker';
import { 
  getQueueStatistics, 
  cleanQueue, 
  closeQueue 
} from '@/lib/consultationReminderQueue';

// 🎨 COLORS PENTRU CONSOLE
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function colorLog(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 📊 AFIȘEAZĂ STATISTICI QUEUE
async function displayQueueStats() {
  try {
    const stats = await getQueueStatistics();
    
    if (stats.error) {
      colorLog('red', `❌ Error getting stats: ${stats.error}`);
      return;
    }

    console.log('\n📊 Queue Statistics:');
    console.log(`   Waiting: ${stats.counts.waiting}`);
    console.log(`   Active: ${stats.counts.active}`);
    console.log(`   Completed: ${stats.counts.completed}`);
    console.log(`   Failed: ${stats.counts.failed}`);
    console.log(`   Delayed: ${stats.counts.delayed}`);
    console.log(`   Total: ${stats.counts.total}`);

    if (stats.upcomingJobs.length > 0) {
      console.log('\n⏰ Upcoming Jobs:');
      stats.upcomingJobs.forEach(job => {
        const scheduledTime = new Date(job.scheduledFor).toLocaleString('ro-RO');
        console.log(`   - ${job.reminderType} for ${job.sessionId} at ${scheduledTime}`);
      });
    }

    if (stats.recentFailed.length > 0) {
      console.log('\n❌ Recent Failed Jobs:');
      stats.recentFailed.forEach(job => {
        console.log(`   - ${job.id}: ${job.failedReason}`);
      });
    }

  } catch (error) {
    colorLog('red', `❌ Error displaying stats: ${error}`);
  }
}

// 🧹 COMANDĂ PENTRU CURĂȚAREA QUEUE-ULUI
async function cleanupQueue() {
  colorLog('yellow', '🧹 Cleaning queue...');
  
  try {
    const result = await cleanQueue({
      grace: 24 * 60 * 60 * 1000, // 24 ore
      limit: 200 // max 200 jobs
    });

    if (result.success) {
      colorLog('green', `✅ Queue cleaned: ${result.total} jobs removed`);
      console.log(`   - Completed: ${result.cleanedCompleted}`);
      console.log(`   - Failed: ${result.cleanedFailed}`);
    } else {
      colorLog('red', `❌ Failed to clean queue: ${result.error}`);
    }
  } catch (error) {
    colorLog('red', `❌ Error cleaning queue: ${error}`);
  }
}

// 🚀 FUNCȚIA PRINCIPALĂ
async function startWorker() {
  // Header
  colorLog('cyan', '╔══════════════════════════════════════════════════════════════╗');
  colorLog('cyan', '║           Consultation Reminder Worker (BullMQ v5)          ║');
  colorLog('cyan', '╚══════════════════════════════════════════════════════════════╝\n');

  console.log('🚀 Starting consultation reminder worker...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Redis URL: ${process.env.REDIS_URL ? 'configured' : 'NOT CONFIGURED'}`);

  // Verificare REDIS_URL
  if (!process.env.REDIS_URL) {
    colorLog('red', '❌ REDIS_URL not configured in environment variables');
    colorLog('yellow', '💡 Add REDIS_URL to your .env or .env.local file');
    colorLog('yellow', '   Example: REDIS_URL=redis://localhost:6379');
    process.exit(1);
  }

  try {
    // Pornește worker-ul
    const worker = startConsultationReminderWorker();
    
    if (!worker) {
      colorLog('red', '❌ Failed to start consultation reminder worker');
      process.exit(1);
    }

    colorLog('green', '✅ Consultation reminder worker started successfully!');
    colorLog('blue', '🎯 Worker is now listening for consultation reminder jobs...');
    
    // Afișează statistici inițiale
    await displayQueueStats();
    
    colorLog('yellow', '\n💡 Available commands:');
    colorLog('yellow', '   - Ctrl+C: Stop worker gracefully');
    colorLog('yellow', '   - SIGUSR1: Display queue statistics');
    colorLog('yellow', '   - SIGUSR2: Clean old jobs from queue');

    console.log('\n' + '='.repeat(60));

    // 🎯 SETUP HANDLERS PENTRU SIGNALE
    const displayStats = async () => {
      console.log('\n' + '='.repeat(60));
      colorLog('blue', '📊 QUEUE STATISTICS REQUESTED');
      await displayQueueStats();
      const workerStatus = getWorkerStatus();
      console.log('\n👤 Worker Status:', JSON.stringify(workerStatus, null, 2));
      console.log('='.repeat(60));
    };

    const cleanup = async () => {
      console.log('\n' + '='.repeat(60));
      colorLog('yellow', '🧹 QUEUE CLEANUP REQUESTED');
      await cleanupQueue();
      await displayQueueStats();
      console.log('='.repeat(60));
    };

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log('\n' + '='.repeat(60));
      colorLog('yellow', `📴 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Afișează statistici finale
        colorLog('blue', '📊 Final queue statistics:');
        await displayQueueStats();
        
        // Oprește worker-ul
        colorLog('yellow', '🛑 Stopping worker...');
        await stopConsultationReminderWorker();
        
        // Închide queue-ul
        colorLog('yellow', '📦 Closing queue...');
        await closeQueue();
        
        colorLog('green', '✅ Worker stopped successfully');
        console.log('='.repeat(60));
        process.exit(0);
      } catch (error) {
        colorLog('red', `❌ Error during shutdown: ${error}`);
        process.exit(1);
      }
    };

    // Event listeners
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR1', displayStats); // Kill -USR1 <pid> pentru stats
    process.on('SIGUSR2', cleanup);      // Kill -USR2 <pid> pentru cleanup

    // 💓 HEARTBEAT CU STATISTICI PERIODICE
    let heartbeatCount = 0;
    const heartbeatInterval = setInterval(async () => {
      heartbeatCount++;
      const now = new Date();
      const timeString = now.toLocaleTimeString('ro-RO');
      
      // Heartbeat basic la fiecare minut
      colorLog('green', `💓 Worker heartbeat #${heartbeatCount}: ${timeString}`);
      
      // Statistici detaliate la fiecare 5 minute
      if (heartbeatCount % 5 === 0) {
        console.log('\n' + '-'.repeat(40));
        colorLog('blue', '📊 Periodic Statistics Update:');
        await displayQueueStats();
        console.log('-'.repeat(40));
      }
      
      // Cleanup automat la fiecare oră
      if (heartbeatCount % 60 === 0) {
        colorLog('yellow', '🧹 Hourly automatic cleanup...');
        await cleanupQueue();
      }
      
    }, 60000); // la fiecare minut

    // Cleanup interval când se oprește
    process.on('exit', () => {
      clearInterval(heartbeatInterval);
    });

    // 🔍 MONITORIZARE ERORI NEGESTIONATE
    process.on('uncaughtException', (error) => {
      colorLog('red', `❌ Uncaught Exception: ${error.message}`);
      console.error('Stack:', error.stack);
      shutdown('EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      colorLog('red', `❌ Unhandled Rejection at: ${promise}`);
      colorLog('red', `   Reason: ${reason}`);
      shutdown('REJECTION');
    });

  } catch (error) {
    colorLog('red', `❌ Failed to start worker: ${error}`);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

// 🌟 FUNCȚIE PENTRU HELP
function showHelp() {
  console.log(`
Usage: npm run worker:reminders [options]

Options:
  --help, -h     Show this help message
  --stats, -s    Show queue statistics and exit
  --clean, -c    Clean old jobs and exit
  --version, -v  Show version

Environment Variables:
  REDIS_URL      Redis connection URL (required)
  NODE_ENV       Environment (development/production)

Examples:
  npm run worker:reminders           # Start worker
  npm run worker:reminders --stats   # Show statistics
  npm run worker:reminders --clean   # Clean old jobs
  
During runtime:
  kill -USR1 <pid>  # Show statistics
  kill -USR2 <pid>  # Clean old jobs
  kill -INT <pid>   # Graceful shutdown
`);
}

// 🎯 MAIN EXECUTION
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log('Consultation Reminder Worker v1.0.0 (BullMQ v5)');
    process.exit(0);
  }
  
  if (args.includes('--stats') || args.includes('-s')) {
    console.log('📊 Fetching queue statistics...\n');
    await displayQueueStats();
    process.exit(0);
  }
  
  if (args.includes('--clean') || args.includes('-c')) {
    await cleanupQueue();
    process.exit(0);
  }
  
  // Start normal worker
  await startWorker();
}

// Run main function
main().catch((error) => {
  colorLog('red', `❌ Fatal error: ${error}`);
  console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
  process.exit(1);
});