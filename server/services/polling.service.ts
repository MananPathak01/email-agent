import { adminDb } from '../firebase-admin';
import { IncomingEmailService } from './incoming-email.service';

const POLLING_INTERVAL_MS = 60 * 1000; // Poll every 60 seconds

export class PollingService {
  public static isRunning = false;
  private static timer: NodeJS.Timeout | null = null;

  static start() {
    if (this.isRunning) {
      console.log('[PollingService] Polling is already running.');
      return;
    }

    console.log(`[PollingService] Starting polling service with an interval of ${POLLING_INTERVAL_MS / 1000} seconds.`);
    this.isRunning = true;
    this.timer = setInterval(() => this.poll(), POLLING_INTERVAL_MS);
    // Run once immediately on start
    this.poll(); 
  }

  static stop() {
    if (!this.isRunning || !this.timer) {
      console.log('[PollingService] Polling is not running.');
      return;
    }

    console.log('[PollingService] Stopping polling service.');
    clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
  }

  private static async poll() {
    console.log('[PollingService] Starting new polling cycle...');
    try {
      const accountsSnapshot = await adminDb.collectionGroup('email_accounts').get();

      if (accountsSnapshot.empty) {
        console.log('[PollingService] No email accounts found to poll.');
        return;
      }

      console.log(`[PollingService] Found ${accountsSnapshot.size} email accounts to check.`);

      for (const doc of accountsSnapshot.docs) {
        const accountData = doc.data();
        const emailAddress = accountData.email;
        const lastHistoryId = accountData.lastHistoryId;

        if (!emailAddress || !lastHistoryId) {
          console.warn(`[PollingService] Skipping account ${doc.id} due to missing email or lastHistoryId.`);
          continue;
        }

        console.log(`[PollingService] Checking for new emails for ${emailAddress}...`);
        // We can reuse the logic from IncomingEmailService, as it already handles history fetching.
        await IncomingEmailService.processNotification(emailAddress, lastHistoryId);
      }

    } catch (error) {
      console.error('[PollingService] Error during polling cycle:', error);
    }
    console.log('[PollingService] Polling cycle finished.');
  }
}
