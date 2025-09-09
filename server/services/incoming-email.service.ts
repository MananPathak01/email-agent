import { google } from 'googleapis';
import { adminDb } from '../firebase-admin.js';
import { GmailService } from './gmail.service.js';
import { GmailDraftService } from './gmail-draft.service.js';
export class IncomingEmailService { /** Process a Pub/Sub notification for a given email account. */
    static async processNotification(emailAddress: string, notificationHistoryId: string | number) {
        // Find account by email across users
        const accountSnap = await adminDb.collectionGroup('email_accounts').where('email', '==', emailAddress).get();

        if (accountSnap.empty) {
            return;
        }

        // If multiple accounts, prefer the one with autoDraftEnabled: true
        let accountDoc = accountSnap.docs[0];
        if (accountSnap.docs.length > 1) {
            const enabledAccount = accountSnap.docs.find(doc => doc.data().autoDraftEnabled === true);
            if (enabledAccount) {
                accountDoc = enabledAccount;
            }
        }

        const accountData: any = accountDoc.data();
        const userRef = accountDoc.ref.parent.parent; // users/{uid}
        if (!userRef)
            return;

        const userId = userRef.id;

        // Check if auto-draft is enabled for this account
        const autoDraftEnabled = accountData.autoDraftEnabled || accountData.AutoDraftEnabled || false; // Default to false if not set
        const autoDraftSettings = accountData.autoDraftSettings;

        if (!autoDraftEnabled) {
            return;
        }

        const gmailService = new GmailService();
        const tokens = await gmailService.getStoredTokensForEmail(userId, emailAddress);
        if (!tokens) {
            return;
        }

        const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);
        const auth = gmailService.createAuthClient();
        auth.setCredentials(refreshed);

        const gmail = google.gmail({ version: 'v1', auth });

        // Initialize lastHistoryId if not set: set to notification history and skip
        let lastHistoryId = accountData.lastHistoryId;
        if (!lastHistoryId) {
            // Set lastHistoryId to current notification to avoid processing historical emails
            await accountDoc.ref.update({ lastHistoryId: String(notificationHistoryId), updatedAt: new Date().toISOString() });
            console.log(`[Incoming] Initialized lastHistoryId for ${emailAddress} to ${notificationHistoryId} - skipping historical emails`);
            return;
        }

        // Check if this is the same history ID we've already processed
        if (String(lastHistoryId) === String(notificationHistoryId)) {
            return;
        }

        // Fetch history from lastHistoryId
        let pageToken: string | undefined;
        let latestHistoryId = String(lastHistoryId);
        const messageIds = new Set<string>();

        do {
            const res = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: String(lastHistoryId),
                historyTypes: ['messageAdded'],
                pageToken,
                labelId: undefined,
                maxResults: 1000
            } as any);

            const hist = res.data;
            if (hist.historyId) {
                latestHistoryId = String(hist.historyId);
            }

            if (hist.history) {
                for (const h of hist.history) {
                    if (h.messagesAdded) {
                        for (const m of h.messagesAdded) {
                            const id = m.message?.id;
                            const labels = m.message?.labelIds || [];

                            // Only process emails that are in INBOX and not SENT
                            if (id && labels.includes('INBOX') && !labels.includes('SENT')) {
                                messageIds.add(id);
                            }
                        }
                    }
                }
            }

            pageToken = hist.nextPageToken || undefined;
        } while (pageToken);

        // Process each message idempotently

        // Filter to only process very recent messages (within last 10 minutes)
        const recentCutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

        for (const messageId of Array.from(messageIds)) {
            const processedRef = accountDoc.ref.collection('incoming').doc(messageId);
            const processedSnap = await processedRef.get();
            if (processedSnap.exists) {
                continue;
            }

            // Fetch message to check its date
            const msgRes = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: ['Date']
            });

            const messageDate = new Date(msgRes.data.payload?.headers?.find(h => h.name === 'Date')?.value || 0);
            if (messageDate < recentCutoff) {
                await processedRef.set({ status: 'skipped', reason: 'too_old', createdAt: new Date().toISOString() });
                continue;
            }

            // Fetch full message metadata (we already have basic metadata from above)
            const fullMsgRes = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: [
                    'From',
                    'To',
                    'Subject',
                    'Message-Id',
                    'References',
                    'Reply-To',
                    'List-Unsubscribe',
                    'Precedence'
                ]
            });
            const message = fullMsgRes.data;
            const headers = message.payload?.headers || [];
            const from = getHeader(headers, 'From');

            // Skip typical bulk/auto messages
            const isNoReply = /no[-]?reply|mailer-daemon/i.test(from || '');
            const listUnsub = getHeader(headers, 'List-Unsubscribe');
            const precedence = getHeader(headers, 'Precedence');
            const isBulk = !!listUnsub || /(bulk|list|auto-reply)/i.test(precedence || '');
            if (isNoReply || isBulk) {
                await processedRef.set({ status: 'skipped', reason: 'bulk_or_noreply', createdAt: new Date().toISOString() });
                continue;
            }

            // Create AI-powered draft reply
            let draftId: string | undefined;
            try {
                draftId = await this.createAIReplyDraft(auth, message, emailAddress, autoDraftSettings);
                await processedRef.set({
                    status: 'processed',
                    replyDraftId: draftId,
                    subject: getHeader(headers, 'Subject'),
                    from,
                    threadId: message.threadId,
                    createdAt: new Date().toISOString()
                });
                console.log(`✅ Created AI draft reply for ${from}: ${getHeader(headers, 'Subject')}`);
            } catch (e: any) {
                console.error(`❌ [Incoming] Failed to create AI draft for ${messageId}:`, e?.message || e);
                await processedRef.set({
                    status: 'error',
                    error: e?.message || String(e),
                    createdAt: new Date().toISOString()
                });
            }
        }

        // Update lastHistoryId to latest seen
        await accountDoc.ref.update({ lastHistoryId: String(latestHistoryId), updatedAt: new Date().toISOString() });
    }

    /**
     * Create an AI-powered reply draft
     */
    private static async createAIReplyDraft(auth: any, message: any, emailAddress: string, autoDraftSettings?: any): Promise<string> {
        const gmail = google.gmail({ version: 'v1', auth });

        const headers = message.payload?.headers || [];
        const subject = getHeader(headers, 'Subject');
        const from = getHeader(headers, 'From');
        const messageId = getHeader(headers, 'Message-Id');

        // Get the email content
        const emailContent = this.extractEmailContent(message);

        // Generate AI response
        const { generateEmailResponse } = await import('./openai.js');
        const aiResponse = await generateEmailResponse(
            emailContent,
            subject,
            `Auto-draft settings: ${JSON.stringify(autoDraftSettings || {})}`
        );

        const replySubject = subject.startsWith('Re: ') ? subject : `Re: ${subject}`;

        // Create the draft
        const draft = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    threadId: message.threadId,
                    raw: Buffer.from(
                        `To: ${from}\r\n` +
                        `Subject: ${replySubject}\r\n` +
                        `In-Reply-To: ${messageId}\r\n` +
                        `References: ${messageId}\r\n` +
                        `\r\n` +
                        `${aiResponse}`
                    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                }
            }
        });

        return draft.data.id!;
    }

    /**
     * Extract email content from Gmail message
     */
    private static extractEmailContent(message: any): string {
        const payload = message.payload;
        if (!payload) return '';

        // Try to get text content
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        // Try to get content from parts
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
            }
        }

        return 'No content available';
    }
}

function getHeader(headers: any[], name: string): string {
    const h = headers.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
    return h?.value || '';
}
