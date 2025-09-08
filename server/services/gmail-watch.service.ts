import { google } from 'googleapis';
import { adminDb } from '../firebase-admin.js';
import { GmailService } from './gmail.service.js';

export class GmailWatchService {
    static getTopicName(): string {
        const topic = process.env.PUBSUB_TOPIC_GMAIL;
        if (!topic)
            throw new Error('PUBSUB_TOPIC_GMAIL env is required');

        // Expected format: projects/<project-id>/topics/<topic-name>
        if (!topic.startsWith('projects/'))
            throw new Error('PUBSUB_TOPIC_GMAIL must be a fully qualified Pub/Sub topic name');

        return topic;
    }

    static async registerWatchForAccount(userId: string, accountEmail: string): Promise<{
        historyId: string;
        expiration?: string
    } | null> {
        const gmailService = new GmailService();
        const tokens = await gmailService.getStoredTokensForEmail(userId, accountEmail);
        if (!tokens)
            return null;

        const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);

        const oauth2Client = gmailService.createAuthClient();
        oauth2Client.setCredentials(refreshed);
        const gmail = google.gmail(
            { version: 'v1', auth: oauth2Client }
        );

        const topicName = this.getTopicName();

        const res = await gmail.users.watch(
            {
                userId: 'me',
                requestBody: {
                    topicName,
                    labelIds: [
                        'INBOX', 'CATEGORY_PERSONAL'
                    ],
                    labelFilterAction: 'include'
                }
            }
        );

        const historyId = res.data.historyId as string;
        const expiration = res.data.expiration ? String(res.data.expiration) : undefined;

        // Persist lastHistoryId and watch metadata
        await this.updateAccountWatchState(userId, accountEmail, {
            lastHistoryId: historyId,
            watchTopic: topicName,
            watchExpiresAt: expiration ? new Date(Number(expiration)).toISOString() : null
        });

        return { historyId, expiration };
    }

    static async updateAccountWatchState(userId: string, accountEmail: string, data: any) { // Find the account doc by email
        const snap = await adminDb.collection('users').doc(userId).collection('email_accounts').where('email', '==', accountEmail).limit(1).get();

        if (snap.empty)
            return;

        const ref = snap.docs[0].ref;
        await ref.update({
            ...data,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Stop Gmail watch for an account
     */
    static async stopWatchForAccount(userId: string, accountEmail: string): Promise<boolean> {
        try {
            console.log(`🛑 [GmailWatch] Stopping watch for ${accountEmail} (user: ${userId})`);

            const gmailService = new GmailService();
            const tokens = await gmailService.getStoredTokensForEmail(userId, accountEmail);
            if (!tokens) {
                console.warn(`[GmailWatch] No tokens found for ${accountEmail}`);
                return false;
            }

            const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);
            const oauth2Client = gmailService.createAuthClient();
            oauth2Client.setCredentials(refreshed);
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Stop the watch
            await gmail.users.stop({
                userId: 'me'
            });

            // Update account state to remove watch info
            await this.updateAccountWatchState(userId, accountEmail, {
                watchTopic: null,
                watchExpiresAt: null,
                lastHistoryId: null
            });

            console.log(`✅ [GmailWatch] Successfully stopped watch for ${accountEmail}`);
            return true;
        } catch (error: any) {
            console.error(`❌ [GmailWatch] Error stopping watch for ${accountEmail}:`, error.message);
            return false;
        }
    }

    /**
     * Check and renew expired watches
     */
    static async renewExpiredWatches(): Promise<void> {
        try {
            console.log('🔄 [GmailWatch] Checking for expired watches...');

            const now = new Date();
            const accountsSnapshot = await adminDb.collectionGroup('email_accounts')
                .where('watchExpiresAt', '!=', null)
                .where('autoDraftEnabled', '==', true)
                .get();

            let renewedCount = 0;
            for (const doc of accountsSnapshot.docs) {
                const accountData = doc.data();
                const watchExpiresAt = accountData.watchExpiresAt;

                if (watchExpiresAt && new Date(watchExpiresAt) < now) {
                    const userRef = doc.ref.parent.parent;
                    if (userRef) {
                        const userId = userRef.id;
                        const emailAddress = accountData.email;

                        console.log(`🔄 [GmailWatch] Renewing expired watch for ${emailAddress}`);

                        // Stop old watch and register new one
                        await this.stopWatchForAccount(userId, emailAddress);
                        const result = await this.registerWatchForAccount(userId, emailAddress);

                        if (result) {
                            renewedCount++;
                            console.log(`✅ [GmailWatch] Renewed watch for ${emailAddress}`);
                        }
                    }
                }
            }

            if (renewedCount > 0) {
                console.log(`🔄 [GmailWatch] Renewed ${renewedCount} expired watches`);
            } else {
                console.log('✅ [GmailWatch] No expired watches found');
            }
        } catch (error: any) {
            console.error('❌ [GmailWatch] Error renewing expired watches:', error.message);
        }
    }

    /**
     * Get watch statistics
     */
    static async getWatchStatistics(): Promise<{
        totalWatches: number;
        activeWatches: number;
        expiredWatches: number;
        expiringSoon: number;
    }> {
        try {
            const now = new Date();
            const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

            const allAccounts = await adminDb.collectionGroup('email_accounts').get();

            let totalWatches = 0;
            let activeWatches = 0;
            let expiredWatches = 0;
            let expiringSoon = 0;

            for (const doc of allAccounts.docs) {
                const accountData = doc.data();
                if (accountData.watchTopic) {
                    totalWatches++;

                    if (accountData.autoDraftEnabled) {
                        activeWatches++;

                        if (accountData.watchExpiresAt) {
                            const expiresAt = new Date(accountData.watchExpiresAt);
                            if (expiresAt < now) {
                                expiredWatches++;
                            } else if (expiresAt < soon) {
                                expiringSoon++;
                            }
                        }
                    }
                }
            }

            return {
                totalWatches,
                activeWatches,
                expiredWatches,
                expiringSoon
            };
        } catch (error: any) {
            console.error('❌ [GmailWatch] Error getting watch statistics:', error.message);
            return { totalWatches: 0, activeWatches: 0, expiredWatches: 0, expiringSoon: 0 };
        }
    }
}
