// server/services/gmail.service.ts
import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import {adminDb} from '../firebase-admin';
import {addEmailProcessingJob} from '../lib/queue';
import {wsManager} from '../lib/websocket';
import {analyzeEmail} from '../lib/openai';

export class GmailService {
    createAuthClient() {
        return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    }

    async getGmailClient(userId: string) {
        let tokens = await this.getStoredTokens(userId);
        if (!tokens) {
            throw new Error('No stored tokens found for user.');
        }

        tokens = await this.refreshTokensIfNeeded(userId, tokens);

        if (tokens === null || tokens === undefined) {
            tokens = await this.refreshTokensIfNeeded(userId, tokens);
        }

        if (!tokens) {
            throw new Error('Failed to refresh tokens.');
        }

        const auth = this.createAuthClient();
        auth.setCredentials(tokens);
        return google.gmail({ version: 'v1', auth });
    }

    async refreshTokensIfNeeded(userId : string, tokens : any): Promise < any > {
        try {
            const auth = this.createAuthClient();
            auth.setCredentials(tokens);

            // Check if token is expired or will expire soon (within 5 minutes)
            const now = Date.now();
            const expiryTime = tokens.expiry_date || 0;
            const fiveMinutes = 5 * 60 * 1000;

            // Refresh if token expires within 30 minutes
            const thirtyMinutes = 30 * 60 * 1000;
            if (expiryTime && (expiryTime - now) < thirtyMinutes) { // Refresh the token
                const {credentials} = await auth.refreshAccessToken();

                if (credentials.access_token) { // Update tokens in database
                    await this.updateStoredTokens(userId, credentials);

                    return {
                        access_token: credentials.access_token,
                        refresh_token: credentials.refresh_token || tokens.refresh_token,
                        expiry_date: credentials.expiry_date || null,
                        token_type: 'Bearer',
                        scope: 'gmail'
                    };
                }
            }

            return tokens;
        } catch (error) {
            console.error('[Gmail] Error refreshing tokens:', error);
            throw error;
        }
    }

    async updateStoredTokens(userId : string, newTokens : any): Promise < void > {
        try {
            const {encrypt} = await import ('../utils/crypto');

            const emailAccountsRef = adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').get();

            if (! querySnapshot.empty) {
                const firstAccount = querySnapshot.docs[0];
                await firstAccount.ref.update({
                    accessToken: encrypt(newTokens.access_token || ''),
                    refreshToken: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : firstAccount.data().refreshToken,
                    tokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
                    updatedAt: new Date()
                });


            }
        } catch (error) {
            console.error('[Gmail] Error updating stored tokens:', error);
            throw error;
        }
    }

    async storeTokens(userId : string, tokens : any) {
        try {

            // This method is kept for compatibility but tokens should be stored via the OAuth callback
            // which uses the email_accounts collection
        } catch (error) {
            console.error('Error storing Gmail tokens:', error);
            throw error;
        }
    }

    async getAccountConnectionDate(userId : string): Promise < Date | null > {
        try { // Use the correct subcollection structure: users/{userId}/email_accounts
            const emailAccountsRef = adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').get();

            if (querySnapshot.empty) {
                return null;
            }

            const firstAccount = querySnapshot.docs[0];
            const accountData = firstAccount.data();
            return accountData.createdAt ? accountData.createdAt.toDate() : null;
        } catch (error) {
            console.error('Error getting connection date:', error);
            return null;
        }
    }

    async getStoredTokens(userId : string) {
        try {
            const emailAccountsRef = adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').orderBy('lastConnectedAt', 'desc').get();

            if (querySnapshot.empty) {
                return null;
            }

            // Get the most recently connected Gmail account
            const mostRecentAccount = querySnapshot.docs[0];
            const accountData = mostRecentAccount.data();

            console.log(`📧 Using Gmail account: ${
                accountData.email
            } (connected at: ${
                accountData.lastConnectedAt ?. toDate ?. ()
            })`);

            // Import decrypt function for token decryption
            const {decrypt} = await import ('../utils/crypto');

            // Decrypt tokens (handles both encrypted and plaintext tokens)
            const decryptedAccessToken = decrypt(accountData.accessToken);
            const decryptedRefreshToken = decrypt(accountData.refreshToken);

            // Return tokens in the format expected by the Gmail API
            return {
                access_token: decryptedAccessToken,
                refresh_token: decryptedRefreshToken,
                expiry_date: accountData.tokenExpiry ?. toMillis ? accountData.tokenExpiry.toMillis() : accountData.tokenExpiry,
                token_type: 'Bearer',
                scope: 'gmail',
                email: accountData.email // Include email for identification
            };
        } catch (error) {
            console.error('[Gmail] Error getting stored tokens:', error);
            throw error;
        }
    }

    async getStoredTokensForEmail(userId : string, email : string) {
        try {
            const emailAccountsRef = adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').where('email', '==', email).get();

            if (querySnapshot.empty) {
                console.log(`❌ No Gmail account found for email: ${email}`);
                return null;
            }

            const accountDoc = querySnapshot.docs[0];
            const accountData = accountDoc.data();

            console.log(`📧 Found Gmail account: ${
                accountData.email
            }`);

            // Import decrypt function for token decryption
            const {decrypt} = await import ('../utils/crypto');

            // Decrypt tokens (handles both encrypted and plaintext tokens)
            const decryptedAccessToken = decrypt(accountData.accessToken);
            const decryptedRefreshToken = decrypt(accountData.refreshToken);

            // Return tokens in the format expected by the Gmail API
            return {
                access_token: decryptedAccessToken,
                refresh_token: decryptedRefreshToken,
                expiry_date: accountData.tokenExpiry ?. toMillis ? accountData.tokenExpiry.toMillis() : accountData.tokenExpiry,
                token_type: 'Bearer',
                scope: 'gmail',
                email: accountData.email
            };

        } catch (error) {
            console.error('[Gmail] Error getting stored tokens for email:', error);
            throw error;
        }
    }

    async getEmails(userId : string, maxResults : number = 10, onlyNewEmails : boolean = false) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (! tokens) {
                throw new Error('No stored tokens found');
            }

            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);

            if (!tokens) {
                throw new Error('Failed to refresh tokens.');
            }

            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = google.gmail({version: 'v1', auth});

            // Build query to only get primary inbox emails (exclude promotions, social, updates, forums)
            let query = 'in:inbox -in:promotions -in:social -in:updates -in:forums';

            // If we only want new emails (after account connection), add date filter
            if (onlyNewEmails) {
                const connectionDate = await this.getAccountConnectionDate(userId);
                if (connectionDate) {
                    const dateStr = connectionDate.toISOString().split('T')[0].replace(/-/g, '/');
                    query += ` after:${dateStr}`;
                }
            }

            const response = await gmail.users.messages.list({userId: 'me', maxResults, q: query});

            if (! response.data.messages) {
                return [];
            }
            const emails = await Promise.all(response.data.messages.map(async (message) => {
                const emailResponse = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id !,
                    format: 'full'
                });
                const email = emailResponse.data;
                const headers = email.payload ?. headers || [];
                const getHeader = (name : string) => {
                    const header = headers.find(h => h.name ?. toLowerCase() === name.toLowerCase());
                    return header ?. value || '';
                };
                const emailData = {
                    id: email.id,
                    threadId: email.threadId,
                    snippet: email.snippet,
                    headers: headers.map(h => ({name: h.name, value: h.value})),
                    from: getHeader('From'),
                    to: getHeader('To'),
                    subject: getHeader('Subject'),
                    date: getHeader('Date'),
                    body: this.extractEmailBody(email.payload),
                    labels: email.labelIds || [],
                    provider: 'gmail'
                };
                // Only process emails for AI response generation if:
                // 1. Email is unread (new)
                // 2. Email is in primary inbox (already filtered by query)
                // 3. We're looking for new emails only
                const isUnread = email.labelIds ?. includes('UNREAD');
                if (isUnread && onlyNewEmails) {
                    await this.processEmailWithAI(userId, emailData);
                }
                return emailData;
            }));
            return emails;
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }

    async processEmailWithAI(userId : string, emailData : any) {
        try {
            console.log(`[Gmail AI] 🤖 Starting AI processing for email ${
                emailData.id
            }`);
            console.log(`[Gmail AI] Email details: subject="${
                emailData.subject
            }", from="${
                emailData.from
            }"`);

            // Notify user that email is being processed
            wsManager.notifyProcessingStatus(userId, {
                status: 'processing',
                emailId: emailData.id,
                message: 'Analyzing email with AI...'
            });

            // Add to background job queue for processing
            await addEmailProcessingJob({emailId: emailData.id, userId, provider: 'gmail', emailData});

            console.log(`[Gmail AI] ✅ Queued email ${
                emailData.id
            } for AI processing`);
        } catch (error) {
            console.error('[Gmail AI] ❌ Error processing email with AI:', error);
        }
    }

    async createDraft(userId : string, emailId : string, draftData : any) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (! tokens) {
                throw new Error('No stored tokens found');
            }

            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);

            if (!tokens) {
                throw new Error('Failed to refresh tokens.');
            }

            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = google.gmail({version: 'v1', auth});

            // Get original email to create proper reply
            const originalEmail = await gmail.users.messages.get({userId: 'me', id: emailId, format: 'full'});
            const headers = originalEmail.data.payload ?. headers || [];
            const getHeader = (name : string) => {
                const header = headers.find(h => h.name ?. toLowerCase() === name.toLowerCase());
                return header ?. value || '';
            };
            const originalFrom = getHeader('From');
            const originalSubject = getHeader('Subject');
            const messageId = getHeader('Message-ID');
            // Create draft message
            const draftMessage = {
                message: {
                    raw: this.createRawMessage(
                        {
                            to: originalFrom,
                            subject: originalSubject.startsWith('Re: ') ? originalSubject : `Re: ${originalSubject}`,
                            body: draftData.content,
                            inReplyTo: messageId,
                            references: messageId
                        }
                    )
                }
            };
            const response = await gmail.users.drafts.create({userId: 'me', requestBody: draftMessage});
            // Notify user that draft is ready
            wsManager.notifyDraftGenerated(userId, emailId, {
                confidence: draftData.confidence,
                workflowUsed: draftData.workflowUsed,
                estimatedTimeToWrite: draftData.estimatedTimeToWrite || 10
            });
            return response.data;
        } catch (error) {
            console.error('Error creating Gmail draft:', error);
            throw error;
        }
    }

    createRawMessage(messageData : {
        to: string;
        subject: string;
        body: string;
        inReplyTo?: string;
        references?: string;
    }): string {
        const lines = [`To: ${
                messageData.to
            }`, `Subject: ${
                messageData.subject
            }`, 'Content-Type: text/html; charset=utf-8', 'MIME-Version: 1.0'];
        if (messageData.inReplyTo) {
            lines.push(`In-Reply-To: ${
                messageData.inReplyTo
            }`);
        }
        if (messageData.references) {
            lines.push(`References: ${
                messageData.references
            }`);
        }
        lines.push('', messageData.body);
        const rawMessage = lines.join('\r\n');
        return Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    async getHistoricalEmailsForLearning(userId : string, maxResults : number = 1000) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (! tokens) {
                throw new Error('No stored tokens found');
            }

            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);

            if (!tokens) {
                throw new Error('Failed to refresh tokens.');
            }

            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = google.gmail({version: 'v1', auth});

            // Get emails from primary inbox and sent folder for learning
            const queries = [
                'in:inbox -in:promotions -in:social -in:updates -in:forums', // Primary inbox
                'in:sent' // Sent emails to learn communication style
            ];

            const allEmails = [];

            for (const query of queries) {
                const response = await gmail.users.messages.list({
                    userId: 'me',
                    maxResults: Math.floor(maxResults / 2), // Split between inbox and sent
                    q: query
                });

                if (response.data.messages) {
                    const emails = await Promise.all(response.data.messages.map(async (message) => {
                        const emailResponse = await gmail.users.messages.get({
                            userId: 'me',
                            id: message.id !,
                            format: 'full'
                        });

                        const email = emailResponse.data;
                        const headers = email.payload ?. headers || [];
                        const getHeader = (name : string) => {
                            const header = headers.find(h => h.name ?. toLowerCase() === name.toLowerCase());
                            return header ?. value || '';
                        };

                        return {
                            id: email.id,
                            threadId: email.threadId,
                            from: getHeader('From'),
                            to: getHeader('To'),
                            subject: getHeader('Subject'),
                            date: getHeader('Date'),
                            body: this.extractEmailBody(email.payload),
                            labels: email.labelIds || [],
                            isFromSent: query.includes('in:sent'),
                            provider: 'gmail'
                        };
                    }));

                    allEmails.push(... emails);
                }
            }


            return allEmails;
        } catch (error) {
            console.error('Error fetching historical emails:', error);
            throw error;
        }
    }

    extractEmailBody(payload : any): string {
        if (!payload) 
            return '';
        


        if (payload.body ?. data) {
            return Buffer.from(payload.body.data, 'base64').toString();
        }
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body ?. data) {
                    return Buffer.from(part.body.data, 'base64').toString();
                }
            }
            // If no plain text, try HTML
            for (const part of payload.parts) {
                if (part.mimeType === 'text/html' && part.body ?. data) {
                    return Buffer.from(part.body.data, 'base64').toString();
                }
            }
        }
        return '';
    }
}

/**
 * Generates the Google OAuth URL.
 */
export function getAuthUrl(userId : string): string {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes, prompt: 'consent', state: userId});
    return authUrl;
}
/**
 * Exchanges an authorization code for tokens.
 */
export async function getTokensFromCode(code: string): Promise<Credentials> {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
   if (!tokens.access_token || !tokens.refresh_token) {
       throw new Error('Failed to get tokens from Google');
   }
   return tokens;
}

/**
 * Gets the user's email address from Google using a new token.
 */
export async function getUserEmail(tokens : Credentials): Promise < string > { // Use node-fetch to call the userinfo endpoint directly
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${
                tokens.access_token
            }`
        }
    });

    if (! res.ok) {
        console.error('[getUserEmail] Failed to fetch user info:', res.status, await res.text());
        throw new Error('Failed to fetch user info');
    }

    const userInfo = await res.json();
    if (! userInfo.email) {
        throw new Error("Failed to retrieve user's email from Google.");
    }
    return userInfo.email;
}
