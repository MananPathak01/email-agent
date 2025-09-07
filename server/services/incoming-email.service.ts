import {google} from 'googleapis';
import {adminDb} from '../firebase-admin.js';
import {GmailService} from './gmail.service.js';
import {GmailDraftService} from './gmail-draft.service.js';

export class IncomingEmailService { /** Process a Pub/Sub notification for a given email account. */
    static async processNotification(emailAddress : string, notificationHistoryId : string | number) {
        console.log(`[Incoming] Processing notification for ${emailAddress} with historyId ${notificationHistoryId}`);
        // Find account by email across users
        const accountSnap = await adminDb.collectionGroup('email_accounts').where('email', '==', emailAddress).limit(1).get();

        if (accountSnap.empty) {
            console.warn(`[Incoming] No account found for ${emailAddress}`);
            return;
        }

        const accountDoc = accountSnap.docs[0];
        const accountData: any = accountDoc.data();

        const userRef = accountDoc.ref.parent.parent; // users/{uid}
        if (! userRef) 
            return;
        
        const userId = userRef.id;

        const gmailService = new GmailService();
        const tokens = await gmailService.getStoredTokensForEmail(userId, emailAddress);
        if (! tokens) {
            console.warn(`[Incoming] No tokens for ${emailAddress}`);
            return;
        }

        const refreshed = await gmailService.refreshTokensIfNeeded(userId, tokens);
        const auth = gmailService.createAuthClient();
        auth.setCredentials(refreshed);

        const gmail = google.gmail({version: 'v1', auth});

        // Initialize lastHistoryId if not set: set to notification history and skip
        let lastHistoryId = accountData.lastHistoryId;
        if (! lastHistoryId) {
            await accountDoc.ref.update({lastHistoryId: String(notificationHistoryId), updatedAt: new Date().toISOString()});
            console.log(`[Incoming] Initialized lastHistoryId for ${emailAddress} to ${notificationHistoryId}`);
            return;
        }

        // Fetch history from lastHistoryId
        let pageToken: string | undefined;
        let latestHistoryId = String(lastHistoryId);
        const messageIds = new Set<string>();

        do {
            console.log(`[Incoming] Fetching history starting from ${lastHistoryId}`);
            const res = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: String(lastHistoryId),
                historyTypes: ['messageAdded'],
                pageToken,
                labelId: undefined,
                maxResults: 1000
            }
            as any);

            const hist = res.data;
            if (hist.historyId) 
                latestHistoryId = String(hist.historyId);
            
            if (hist.history) {
                for (const h of hist.history) {
                    if (h.messagesAdded) {
                        for (const m of h.messagesAdded) {
                            const id = m.message ?. id;
                            const labels = m.message ?. labelIds || [];
                            if (id && labels.includes('INBOX') && labels.includes('CATEGORY_PERSONAL') && ! labels.includes('SENT')) {
                                messageIds.add(id);
                            }
                        }
                    }
                }
            }

            pageToken = hist.nextPageToken || undefined;
        } while (pageToken);

        // Process each message idempotently
        for (const messageId of messageIds) {
            const processedRef = accountDoc.ref.collection('incoming').doc(messageId);
            const processedSnap = await processedRef.get();
            if (processedSnap.exists) 
                continue;
            
            // idempotent

            // Fetch message metadata
            const msgRes = await gmail.users.messages.get({
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
            const message = msgRes.data;
            const headers = message.payload ?. headers || [];
            const from = getHeader(headers, 'From');

            // Skip typical bulk/auto messages
            const isNoReply = /no[-]?reply|mailer-daemon/i.test(from || '');
            const listUnsub = getHeader(headers, 'List-Unsubscribe');
            const precedence = getHeader(headers, 'Precedence');
            const isBulk = !! listUnsub || /(bulk|list|auto-reply)/i.test(precedence || '');
            if (isNoReply || isBulk) {
                await processedRef.set({status: 'skipped', reason: 'bulk_or_noreply', createdAt: new Date().toISOString()});
                continue;
            }

            // Create manual draft reply
            let draftId: string | undefined;
            try {
                draftId = await GmailDraftService.createManualReplyDraft(auth, message, emailAddress);
                await processedRef.set({
                    status: 'processed',
                    replyDraftId: draftId,
                    subject: getHeader(headers, 'Subject'),
                    from,
                    threadId: message.threadId,
                    createdAt: new Date().toISOString()
                });
            } catch (e : any) {
                console.error('[Incoming] Failed to create draft:', e ?. message || e);
                await processedRef.set({
                    status: 'error',
                    error: e ?. message || String(e),
                    createdAt: new Date().toISOString()
                });
            }
        }

        // Update lastHistoryId to latest seen
        await accountDoc.ref.update({lastHistoryId: String(latestHistoryId), updatedAt: new Date().toISOString()});
    }
}

function getHeader(headers : any[], name : string): string {
    const h = headers.find((x : any) => x.name ?. toLowerCase() === name.toLowerCase());
    return h ?. value || '';
}
