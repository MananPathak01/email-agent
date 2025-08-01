import SmartSyncService from '../services/smartSync';

/**
 * Smart Sync Cron Job
 * 
 * This can be used with:
 * 1. Node-cron for local development
 * 2. Cloud Functions for production
 * 3. External cron services (Vercel, Netlify, etc.)
 */

const smartSyncService = new SmartSyncService();

/**
 * Execute smart sync (called by cron)
 */
export async function executeSmartSyncCron(): Promise<void> {
  console.log('[SmartSyncCron] Starting scheduled smart sync');
  
  try {
    await smartSyncService.executeSmartSync();
    console.log('[SmartSyncCron] Scheduled smart sync completed successfully');
  } catch (error) {
    console.error('[SmartSyncCron] Scheduled smart sync failed:', error);
    throw error;
  }
}

/**
 * Deployment Options:
 * 
 * 1. Local Development: Use node-cron
 *    npm install node-cron @types/node-cron
 * 
 * 2. Vercel/Netlify: Create api/cron/smart-sync.ts
 * 
 * 3. Firebase Cloud Functions: Create functions/src/smartSync.ts
 * 
 * See documentation for implementation details.
 */ 