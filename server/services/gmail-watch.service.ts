import {google} from 'googleapis';
import {adminDb} from '../firebase-admin.js';
import {GmailService} from './gmail.service.js';

export class GmailWatchService {
    static getTopicName(): string {
        const topic = process.env.PUBSUB_TOPIC_GMAIL;
        if (! topic) 
            throw new Error('PUBSUB_TOPIC_GMAIL env is required');
        
        // Expected format: projects/<project-id>/topics/<topic-name>
        if (! topic.startsWith('projects/')) 
            throw new Error('PUBSUB_TOPIC_GMAIL must be a fully qualified Pub/Sub topic name');
        
        return topic;
    }

    static async registerWatchForAccount(userId : string, accountEmail : string): Promise < {
        historyId: string;
        expiration?: string
    } | null > {
        const gmailService = new GmailService();
        const tokens = await gmailService.getStoredTokensForEmail(userId, accountEmail);
        if (! tokens) 
            return null;
        
        const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);

        const oauth2Client = gmailService.createAuthClient();
        oauth2Client.setCredentials(refreshed);
        const gmail = google.gmail(
            {version: 'v1', auth: oauth2Client}
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

        return {historyId, expiration};
    }

    static async updateAccountWatchState(userId : string, accountEmail : string, data : any) { // Find the account doc by email
        const snap = await adminDb.collection('users').doc(userId).collection('email_accounts').where('email', '==', accountEmail).limit(1).get();

        if (snap.empty) 
            return;
        
        const ref = snap.docs[0].ref;
        await ref.update({
            ...data,
            updatedAt: new Date().toISOString()
        });
    }
}
