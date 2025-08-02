// Quick test to verify Redis configuration fixes
import dotenv from 'dotenv';
dotenv.config();

import { startConsultationReminderWorker, stopConsultationReminderWorker, getWorkerStatus } from './src/workers/consultationReminderWorker.js';

console.log('🔧 Testing worker with fixed Redis configuration...');
console.log(`📍 Redis URL: ${process.env.REDIS_URL ? 'configured' : 'NOT CONFIGURED'}`);

const worker = startConsultationReminderWorker();

if (worker) {
  console.log('✅ Worker started successfully!');
  
  // Test for 10 seconds
  setTimeout(async () => {
    console.log('📊 Worker status:', getWorkerStatus());
    console.log('🛑 Stopping worker...');
    await stopConsultationReminderWorker();
    console.log('✅ Test completed');
    process.exit(0);
  }, 10000);
} else {
  console.log('❌ Failed to start worker');
  process.exit(1);
}
