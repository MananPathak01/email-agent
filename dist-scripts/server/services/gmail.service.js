"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailService = void 0;
exports.getAuthUrl = getAuthUrl;
exports.getTokensFromCode = getTokensFromCode;
exports.getUserEmail = getUserEmail;
// server/services/gmail.service.ts
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const firebase_admin_1 = require("../firebase-admin");
const queue_1 = require("../lib/queue");
const websocket_1 = require("../lib/websocket");
class GmailService {
    createAuthClient() {
        return new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    }
    async refreshTokensIfNeeded(userId, tokens) {
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
                const { credentials } = await auth.refreshAccessToken();
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
        }
        catch (error) {
            console.error('[Gmail] Error refreshing tokens:', error);
            throw error;
        }
    }
    async updateStoredTokens(userId, newTokens) {
        try {
            const { encrypt } = await Promise.resolve().then(() => __importStar(require('../utils/crypto')));
            const emailAccountsRef = firebase_admin_1.adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').get();
            if (!querySnapshot.empty) {
                const firstAccount = querySnapshot.docs[0];
                await firstAccount.ref.update({
                    accessToken: encrypt(newTokens.access_token || ''),
                    refreshToken: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : firstAccount.data().refreshToken,
                    tokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
                    updatedAt: new Date()
                });
            }
        }
        catch (error) {
            console.error('[Gmail] Error updating stored tokens:', error);
            throw error;
        }
    }
    async storeTokens(userId, tokens) {
        try {
            // This method is kept for compatibility but tokens should be stored via the OAuth callback
            // which uses the email_accounts collection
        }
        catch (error) {
            console.error('Error storing Gmail tokens:', error);
            throw error;
        }
    }
    async getAccountConnectionDate(userId) {
        try { // Use the correct subcollection structure: users/{userId}/email_accounts
            const emailAccountsRef = firebase_admin_1.adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').get();
            if (querySnapshot.empty) {
                return null;
            }
            const firstAccount = querySnapshot.docs[0];
            const accountData = firstAccount.data();
            return accountData.createdAt ? accountData.createdAt.toDate() : null;
        }
        catch (error) {
            console.error('Error getting connection date:', error);
            return null;
        }
    }
    async getStoredTokens(userId) {
        try {
            const emailAccountsRef = firebase_admin_1.adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').orderBy('lastConnectedAt', 'desc').get();
            if (querySnapshot.empty) {
                return null;
            }
            // Get the most recently connected Gmail account
            const mostRecentAccount = querySnapshot.docs[0];
            const accountData = mostRecentAccount.data();
            console.log(`📧 Using Gmail account: ${accountData.email} (connected at: ${accountData.lastConnectedAt?.toDate?.()})`);
            // Import decrypt function for token decryption
            const { decrypt } = await Promise.resolve().then(() => __importStar(require('../utils/crypto')));
            // Decrypt tokens (handles both encrypted and plaintext tokens)
            const decryptedAccessToken = decrypt(accountData.accessToken);
            const decryptedRefreshToken = decrypt(accountData.refreshToken);
            // Return tokens in the format expected by the Gmail API
            return {
                access_token: decryptedAccessToken,
                refresh_token: decryptedRefreshToken,
                expiry_date: accountData.tokenExpiry?.toMillis ? accountData.tokenExpiry.toMillis() : accountData.tokenExpiry,
                token_type: 'Bearer',
                scope: 'gmail',
                email: accountData.email // Include email for identification
            };
        }
        catch (error) {
            console.error('[Gmail] Error getting stored tokens:', error);
            throw error;
        }
    }
    async getStoredTokensForEmail(userId, email) {
        try {
            const emailAccountsRef = firebase_admin_1.adminDb.collection('users').doc(userId).collection('email_accounts');
            const querySnapshot = await emailAccountsRef.where('provider', '==', 'gmail').where('email', '==', email).get();
            if (querySnapshot.empty) {
                console.log(`❌ No Gmail account found for email: ${email}`);
                return null;
            }
            const accountDoc = querySnapshot.docs[0];
            const accountData = accountDoc.data();
            console.log(`📧 Found Gmail account: ${accountData.email}`);
            // Import decrypt function for token decryption
            const { decrypt } = await Promise.resolve().then(() => __importStar(require('../utils/crypto')));
            // Decrypt tokens (handles both encrypted and plaintext tokens)
            const decryptedAccessToken = decrypt(accountData.accessToken);
            const decryptedRefreshToken = decrypt(accountData.refreshToken);
            // Return tokens in the format expected by the Gmail API
            return {
                access_token: decryptedAccessToken,
                refresh_token: decryptedRefreshToken,
                expiry_date: accountData.tokenExpiry?.toMillis ? accountData.tokenExpiry.toMillis() : accountData.tokenExpiry,
                token_type: 'Bearer',
                scope: 'gmail',
                email: accountData.email
            };
        }
        catch (error) {
            console.error('[Gmail] Error getting stored tokens for email:', error);
            throw error;
        }
    }
    async getEmails(userId, maxResults = 10, onlyNewEmails = false) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (!tokens) {
                throw new Error('No stored tokens found');
            }
            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);
            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth });
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
            const response = await gmail.users.messages.list({ userId: 'me', maxResults, q: query });
            if (!response.data.messages) {
                return [];
            }
            const emails = await Promise.all(response.data.messages.map(async (message) => {
                const emailResponse = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });
                const email = emailResponse.data;
                const headers = email.payload?.headers || [];
                const getHeader = (name) => {
                    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
                    return header?.value || '';
                };
                const emailData = {
                    id: email.id,
                    threadId: email.threadId,
                    snippet: email.snippet,
                    headers: headers.map(h => ({ name: h.name, value: h.value })),
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
                const isUnread = email.labelIds?.includes('UNREAD');
                if (isUnread && onlyNewEmails) {
                    await this.processEmailWithAI(userId, emailData);
                }
                return emailData;
            }));
            return emails;
        }
        catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }
    async processEmailWithAI(userId, emailData) {
        try {
            console.log(`[Gmail AI] 🤖 Starting AI processing for email ${emailData.id}`);
            console.log(`[Gmail AI] Email details: subject="${emailData.subject}", from="${emailData.from}"`);
            // Notify user that email is being processed
            websocket_1.wsManager.notifyProcessingStatus(userId, {
                status: 'processing',
                emailId: emailData.id,
                message: 'Analyzing email with AI...'
            });
            // Add to background job queue for processing
            await (0, queue_1.addEmailProcessingJob)({ emailId: emailData.id, userId, provider: 'gmail', emailData });
            console.log(`[Gmail AI] ✅ Queued email ${emailData.id} for AI processing`);
        }
        catch (error) {
            console.error('[Gmail AI] ❌ Error processing email with AI:', error);
        }
    }
    async createDraft(userId, emailId, draftData) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (!tokens) {
                throw new Error('No stored tokens found');
            }
            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);
            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth });
            // Get original email to create proper reply
            const originalEmail = await gmail.users.messages.get({ userId: 'me', id: emailId, format: 'full' });
            const headers = originalEmail.data.payload?.headers || [];
            const getHeader = (name) => {
                const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
                return header?.value || '';
            };
            const originalFrom = getHeader('From');
            const originalSubject = getHeader('Subject');
            const messageId = getHeader('Message-ID');
            // Create draft message
            const draftMessage = {
                message: {
                    raw: this.createRawMessage({
                        to: originalFrom,
                        subject: originalSubject.startsWith('Re: ') ? originalSubject : `Re: ${originalSubject}`,
                        body: draftData.content,
                        inReplyTo: messageId,
                        references: messageId
                    })
                }
            };
            const response = await gmail.users.drafts.create({ userId: 'me', requestBody: draftMessage });
            // Notify user that draft is ready
            websocket_1.wsManager.notifyDraftGenerated(userId, emailId, {
                confidence: draftData.confidence,
                workflowUsed: draftData.workflowUsed,
                estimatedTimeToWrite: draftData.estimatedTimeToWrite || 10
            });
            return response.data;
        }
        catch (error) {
            console.error('Error creating Gmail draft:', error);
            throw error;
        }
    }
    createRawMessage(messageData) {
        const lines = [`To: ${messageData.to}`, `Subject: ${messageData.subject}`, 'Content-Type: text/html; charset=utf-8', 'MIME-Version: 1.0'];
        if (messageData.inReplyTo) {
            lines.push(`In-Reply-To: ${messageData.inReplyTo}`);
        }
        if (messageData.references) {
            lines.push(`References: ${messageData.references}`);
        }
        lines.push('', messageData.body);
        const rawMessage = lines.join('\r\n');
        return Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    async getHistoricalEmailsForLearning(userId, maxResults = 1000) {
        try {
            let tokens = await this.getStoredTokens(userId);
            if (!tokens) {
                throw new Error('No stored tokens found');
            }
            // Refresh tokens if needed
            tokens = await this.refreshTokensIfNeeded(userId, tokens);
            const auth = this.createAuthClient();
            auth.setCredentials(tokens);
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth });
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
                            id: message.id,
                            format: 'full'
                        });
                        const email = emailResponse.data;
                        const headers = email.payload?.headers || [];
                        const getHeader = (name) => {
                            const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
                            return header?.value || '';
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
                    allEmails.push(...emails);
                }
            }
            return allEmails;
        }
        catch (error) {
            console.error('Error fetching historical emails:', error);
            throw error;
        }
    }
    extractEmailBody(payload) {
        if (!payload)
            return '';
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString();
        }
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64').toString();
                }
            }
            // If no plain text, try HTML
            for (const part of payload.parts) {
                if (part.mimeType === 'text/html' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64').toString();
                }
            }
        }
        return '';
    }
}
exports.GmailService = GmailService;
/**
 * Generates the Google OAuth URL.
 */
function getAuthUrl(userId) {
    const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];
    const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent', state: userId });
    return authUrl;
}
/**
 * Exchanges an authorization code for tokens.
 */
async function getTokensFromCode(code) {
    const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Google');
    }
    return tokens;
}
/**
 * Gets the user's email address from Google using a new token.
 */
async function getUserEmail(tokens) {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`
        }
    });
    if (!res.ok) {
        console.error('[getUserEmail] Failed to fetch user info:', res.status, await res.text());
        throw new Error('Failed to fetch user info');
    }
    const userInfo = await res.json();
    if (!userInfo.email) {
        throw new Error("Failed to retrieve user's email from Google.");
    }
    return userInfo.email;
}
