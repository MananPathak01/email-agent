import { adminDb } from '../firebase-admin.js';
import { IncomingEmailService } from './incoming-email.service.js';

// For Vercel: Poll more frequently but with shorter intervals
const POLLING_INTERVAL_MS = process.env.VERCEL ? 30 * 1000 : 60 * 1000; // 30s for Vercel, 60s for local

export class PollingService {
    public static isRunning = false;
    private static timer: NodeJS.Timeout | null = null;

    static start() {
        if (this.isRunning) {
            console.log('[PollingService] Polling is already running.');
            return;
        }

        console.log(`[PollingService] Starting polling service with an interval of ${POLLING_INTERVAL_MS / 1000
            } seconds.`);
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
            // Only poll accounts with auto-draft enabled
            const accountsSnapshot = await adminDb.collectionGroup('email_accounts')
                .where('autoDraftEnabled', '==', true)
                .get();

            if (accountsSnapshot.empty) {
                console.log('[PollingService] No active email accounts found to poll.');
                return;
            }

            console.log(`[PollingService] Found ${accountsSnapshot.size
                } active email accounts to check.`);

            let processedCount = 0;
            for (const doc of accountsSnapshot.docs) {
                const accountData = doc.data();
                const emailAddress = accountData.email;
                const lastHistoryId = accountData.lastHistoryId;

                if (!emailAddress || !lastHistoryId) {
                    console.warn(`[PollingService] Skipping account ${doc.id
                        } due to missing email or lastHistoryId.`);
                    continue;
                }

                try {
                    console.log(`[PollingService] Checking for new emails for ${emailAddress}...`);
                    await IncomingEmailService.processNotification(emailAddress, lastHistoryId);
                    processedCount++;
                } catch (error) {
                    console.error(`[PollingService] Error processing ${emailAddress}:`, error);
                }
            }

            console.log(`[PollingService] Processed ${processedCount} accounts successfully.`);

        } catch (error) {
            console.error('[PollingService] Error during polling cycle:', error);
        }
        console.log('[PollingService] Polling cycle finished.');
    }
}
