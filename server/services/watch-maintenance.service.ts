import { GmailWatchService } from './gmail-watch.service.js';

export class WatchMaintenanceService {
    private static isRunning = false;
    private static timer: NodeJS.Timeout | null = null;
    private static readonly MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

    static start() {
        if (this.isRunning) {
            console.log('[WatchMaintenance] Service is already running.');
            return;
        }

        console.log('[WatchMaintenance] Starting watch maintenance service.');
        this.isRunning = true;

        // Run maintenance immediately on start
        this.performMaintenance();

        // Schedule regular maintenance
        this.timer = setInterval(() => {
            this.performMaintenance();
        }, this.MAINTENANCE_INTERVAL_MS);
    }

    static stop() {
        if (!this.isRunning || !this.timer) {
            console.log('[WatchMaintenance] Service is not running.');
            return;
        }

        console.log('[WatchMaintenance] Stopping watch maintenance service.');
        clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
    }

    private static async performMaintenance() {
        console.log('[WatchMaintenance] Starting watch maintenance cycle...');

        try {
            // Renew expired watches for accounts with auto-draft enabled
            await GmailWatchService.renewExpiredWatches();
            console.log('[WatchMaintenance] Watch maintenance completed successfully.');
        } catch (error) {
            console.error('[WatchMaintenance] Error during maintenance:', error);
        }
    }
}