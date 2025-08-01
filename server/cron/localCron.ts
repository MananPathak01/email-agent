import cron from 'node-cron';
import { executeSmartSyncCron } from './smartSyncCron';

let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the local cron job for smart sync
 */
export function startLocalCron(): void {
  if (cronJob) {
    console.log('[LocalCron] Cron job already running');
    return;
  }

  console.log('[LocalCron] Starting smart sync cron job...');
  
  // Run every 2 minutes
  cronJob = cron.schedule('*/2 * * * *', async () => {
    console.log('[LocalCron] Running scheduled smart sync...');
    try {
      await executeSmartSyncCron();
      console.log('[LocalCron] Scheduled smart sync completed successfully');
    } catch (error) {
      console.error('[LocalCron] Scheduled smart sync failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[LocalCron] Smart sync cron job started (runs every 2 minutes)');
}

/**
 * Stop the local cron job
 */
export function stopLocalCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[LocalCron] Smart sync cron job stopped');
  }
}

/**
 * Get cron job status
 */
export function getCronStatus(): { isRunning: boolean } {
  return {
    isRunning: cronJob !== null
  };
}

/**
 * Manual trigger for testing
 */
export async function triggerManualSync(): Promise<void> {
  console.log('[LocalCron] Manual sync triggered');
  try {
    await executeSmartSyncCron();
    console.log('[LocalCron] Manual sync completed successfully');
  } catch (error) {
    console.error('[LocalCron] Manual sync failed:', error);
    throw error;
  }
} 