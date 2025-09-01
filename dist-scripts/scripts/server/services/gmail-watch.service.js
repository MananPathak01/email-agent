"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailWatchService = void 0;
const googleapis_1 = require("googleapis");
const firebase_admin_1 = require("../firebase-admin");
const gmail_service_1 = require("./gmail.service");
class GmailWatchService {
    static getTopicName() {
        const topic = process.env.PUBSUB_TOPIC_GMAIL;
        if (!topic)
            throw new Error('PUBSUB_TOPIC_GMAIL env is required');
        // Expected format: projects/<project-id>/topics/<topic-name>
        if (!topic.startsWith('projects/'))
            throw new Error('PUBSUB_TOPIC_GMAIL must be a fully qualified Pub/Sub topic name');
        return topic;
    }
    static async registerWatchForAccount(userId, accountEmail) {
        const gmailService = new gmail_service_1.GmailService();
        const tokens = await gmailService.getStoredTokensForEmail(userId, accountEmail);
        if (!tokens)
            return null;
        const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);
        const oauth2Client = gmailService.createAuthClient();
        oauth2Client.setCredentials(refreshed);
        const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
        const topicName = this.getTopicName();
        const res = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                topicName,
                labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
                labelFilterAction: 'include'
            }
        });
        const historyId = res.data.historyId;
        const expiration = res.data.expiration ? String(res.data.expiration) : undefined;
        // Persist lastHistoryId and watch metadata
        await this.updateAccountWatchState(userId, accountEmail, {
            lastHistoryId: historyId,
            watchTopic: topicName,
            watchExpiresAt: expiration ? new Date(Number(expiration)).toISOString() : null,
        });
        return { historyId, expiration };
    }
    static async updateAccountWatchState(userId, accountEmail, data) {
        // Find the account doc by email
        const snap = await firebase_admin_1.adminDb
            .collection('users')
            .doc(userId)
            .collection('email_accounts')
            .where('email', '==', accountEmail)
            .limit(1)
            .get();
        if (snap.empty)
            return;
        const ref = snap.docs[0].ref;
        await ref.update({ ...data, updatedAt: new Date().toISOString() });
    }
}
exports.GmailWatchService = GmailWatchService;
