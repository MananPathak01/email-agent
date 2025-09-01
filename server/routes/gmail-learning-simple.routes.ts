// server/routes/gmail-learning-simple.routes.ts
import {Router} from 'express';
import {GmailService} from '../services/gmail.service';
import {authenticate} from '../middleware/auth.middleware';
import {google} from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import {CommunicationProfileService, EmailData} from '../services/communication-profile.service';

// Types for learning progress
interface LearningProgress {
    stage: 'starting' | 'collecting' | 'analyzing' | 'saving' | 'complete' | 'error';
    message: string;
    progress: number;
    details?: string;
    emailsCollected?: {
        inbox: number;
        sent: number;
        context: number;
        total: number;
    };
    analysisResults?: {
        profileGenerated: boolean;
        confidence: number;
        categoriesAnalyzed: number;
    };
}

// Global learning progress storage
declare global {
    var learningProgress: {
    [userId: string]: LearningProgress
    } | undefined;
}

export const gmailLearningSimpleRouter = Router();

// Start email learning for specific account
gmailLearningSimpleRouter.post('/learn-emails/:email?', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({error: 'User not authenticated'});
        }

        const email = req.params.email || req.body.email;
        const context = req.body.context;

        if (!global.learningProgress) {
            global.learningProgress = {};
        }

        global.learningProgress[userId] = {
            stage: 'starting',
            message: 'Initializing email collection...', 
            progress: 5
        };

        setTimeout(async () => {
            await performSimpleEmailLearning(userId, email, context);
        }, 1000);

        res.json({success: true, message: 'Email learning started'});
    } catch (error) {
        console.error('Error starting email learning:', error);
        res.status(500).json({error: 'Failed to start email learning'});
    }
});

// Get learning progress
gmailLearningSimpleRouter.get('/learning-progress', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({error: 'User not authenticated'});
        }
        const progress = global.learningProgress?.[userId] || { stage: 'starting' as const, message: 'Initializing...', progress: 0 };
        res.json(progress);
    } catch (error) {
        console.error('Error getting learning progress:', error);
        res.status(500).json({error: 'Failed to get learning progress'});
    }
});

async function performSimpleEmailLearning(userId: string, specificEmail?: string, userContext?: any) {
    try {
        if (!global.learningProgress) global.learningProgress = {};

        global.learningProgress[userId] = { stage: 'collecting', message: 'Setting up Gmail connection...', progress: 20 };

        const gmailService = new GmailService();
        const tokens = specificEmail ? await gmailService.getStoredTokensForEmail(userId, specificEmail) : await gmailService.getStoredTokens(userId);
        if (!tokens) throw new Error(`No Gmail tokens found for ${specificEmail || 'user'}`);

        const refreshedTokens = await gmailService.refreshTokensIfNeeded(userId, tokens);
        if (!refreshedTokens) throw new Error('Failed to refresh Gmail tokens');
        
        const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        oauth2Client.setCredentials(refreshedTokens);
        const gmail = google.gmail({version: 'v1', auth: oauth2Client});

        // Prefer using a compact writing-style data JSON; if it doesn't exist, build it now.
        global.learningProgress[userId] = { stage: 'collecting', message: 'Preparing writing-style data...', progress: 55 };
        const fs = await import('fs');
        const path = await import('path');
        const dataDir = path.resolve(process.cwd(), 'data');
        const sanitizeEmail = (e: string) => e.replace(/[@.]/g, '-');
        const emailSlug = sanitizeEmail(refreshedTokens.email);
        let writingStyleData: any | null = null;
        try {
            const files = fs.readdirSync(dataDir).filter(f => f.startsWith(`writing-style-data-${emailSlug}`) && f.endsWith('.json'));
            if (files.length) {
                const latestFile = files.sort().reverse()[0];
                const json = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf-8'));
                // Slim for prompt
                const slimSamples = Array.isArray(json.sentEmails) ? json.sentEmails.slice(0, 5).map((e: any) => ({
                    from: e.from,
                    to: e.to,
                    subject: e.subject,
                    wordCount: e.wordCount
                })) : [];
                writingStyleData = {
                    userId: json.userId,
                    email: json.email,
                    collectedAt: json.collectedAt,
                    summary: json.summary,
                    samples: slimSamples
                };
            }
        } catch (e) {
            // If any error occurs reading existing file, we'll build fresh
            writingStyleData = null;
        }

        if (!writingStyleData) {
            global.learningProgress[userId] = { stage: 'collecting', message: 'Collecting sent emails (compact)...', progress: 60 };
            // Collect a small sample; we will NOT send bodies to the LLM
            const sentEmailsSample = await collectEmailsByLabel(gmail, 'SENT', 10);
            // Build compact samples
            const compactSamples = sentEmailsSample
                .filter((e: any) => e && e.subject)
                .slice(0, 5)
                .map((e: any) => ({
                    from: e.from || 'unknown',
                    to: Array.isArray(e.to) ? e.to : (e.to ? [e.to] : []),
                    subject: e.subject || 'No Subject',
                    wordCount: typeof e.body === 'string' ? e.body.trim().split(/\s+/).length : 0
                }));
            writingStyleData = {
                userId,
                email: refreshedTokens.email,
                collectedAt: new Date().toISOString(),
                summary: {
                    sentCount: sentEmailsSample.length,
                    contextCount: 0,
                    totalProcessed: sentEmailsSample.length
                },
                samples: compactSamples
            };
            // Persist a full snapshot for inspection purposes
            try {
                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                const fileName = `writing-style-data-${emailSlug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                fs.writeFileSync(path.join(dataDir, fileName), JSON.stringify(writingStyleData, null, 2), 'utf-8');
            } catch (e) {
                console.warn('⚠️ Failed to write writing-style data file:', e);
            }
        }

        // We now analyze using only the compact writing-style data
        const emailsForAnalysis: EmailData[] = [];

        global.learningProgress[userId] = { stage: 'analyzing', message: 'Running AI analysis...', progress: 95 };

        const analyzer = new CommunicationProfileService();
        const mergedContext = { ...(userContext || {}), writingStyleData };
        const profile = await analyzer.analyzeEmails(emailsForAnalysis, userId, mergedContext);
        await analyzer.saveProfile(userId, refreshedTokens.email, profile);

        global.learningProgress[userId] = {
            stage: 'complete',
            message: 'Analysis complete!',
            progress: 100,
            analysisResults: { profileGenerated: true, confidence: profile.confidence, categoriesAnalyzed: 13 }
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Learning process failed:', errorMsg);
        if (global.learningProgress) {
            global.learningProgress[userId] = { stage: 'error', message: 'Learning failed', progress: 0, details: errorMsg };
        }
    }
}

async function collectEmailsByLabel(gmail: any, labelId: string, maxResults: number = 50) {
    const response = await gmail.users.messages.list({ userId: 'me', labelIds: [labelId], maxResults });
    if (!response.data.messages) return [];

    const emailPromises = response.data.messages.map(async (message: any) => {
        try {
            const emailResponse = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' });
            const email = emailResponse.data;
            const headers = email.payload?.headers || [];
            const rawEmail = {
                id: email.id,
                threadId: email.threadId,
                from: getHeader(headers, 'From'),
                to: getHeader(headers, 'To'),
                subject: getHeader(headers, 'Subject'),
                body: extractEmailBody(email.payload),
            };
            return optimizeEmailForAnalysis(rawEmail, labelId === 'SENT');
        } catch (e) {
            return null; // Ignore single email fetch errors
        }
    });

    const emails = await Promise.all(emailPromises);
    return emails.filter(email => email !== null);
}

async function addThreadContextToEmails(gmail: any, sentEmails: any[]) {
    const emailsWithContext = await Promise.all(sentEmails.map(async (email) => {
        if (!email.threadId) return { ...email, threadContext: [] };
        try {
            const threadResponse = await gmail.users.threads.get({ userId: 'me', id: email.threadId, format: 'full' });
            const threadMessages = threadResponse.data.messages || [];
            const contextEmails = threadMessages
                .filter((msg: any) => msg.id !== email.id)
                .map((msg: any) => {
                    const headers = msg.payload?.headers || [];
                    const rawContextEmail = {
                        id: msg.id,
                        from: getHeader(headers, 'From'),
                        to: getHeader(headers, 'To'),
                        subject: getHeader(headers, 'Subject'),
                        body: extractEmailBody(msg.payload),
                    };
                    return optimizeEmailForAnalysis(rawContextEmail, false);
                });
            return { ...email, threadContext: contextEmails.filter((ctx: any) => ctx !== null) };
        } catch (error) {
            return { ...email, threadContext: [] }; // Ignore thread fetch errors
        }
    }));
    return emailsWithContext;
}

function getHeader(headers: any[], name: string): string {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
}

function extractEmailBody(payload: any): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    if (payload.parts) {
        let plainText = '';
        let htmlText = '';
        const findBody = (parts: any[]) => {
            for (const part of parts) {
                if (plainText) return;
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.mimeType === 'text/html' && part.body?.data) {
                    htmlText = Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.parts) {
                    findBody(part.parts);
                }
            }
        };
        findBody(payload.parts);
        return plainText || htmlText;
    }
    if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    return '';
}

function optimizeEmailForAnalysis(email: any, isSentEmail: boolean = false): any {
    const body = cleanEmailBody(email.body);
    if (body.length < 10 || isAutoGenerated(body)) {
        return null;
    }
    return {
        id: email.id || 'unknown',
        threadId: email.threadId,
        from: extractEmailAddress(email.from),
        to: Array.isArray(email.to) ? email.to.map(extractEmailAddress) : [extractEmailAddress(email.to)],
        cc: email.cc ? (Array.isArray(email.cc) ? email.cc.map(extractEmailAddress) : [extractEmailAddress(email.cc)]) : [],
        bcc: email.bcc ? (Array.isArray(email.bcc) ? email.bcc.map(extractEmailAddress) : [extractEmailAddress(email.bcc)]) : [],
        subject: email.subject?.replace(/^(Re:|Fwd?:)\s*/i, '').trim() || '',
        body: isSentEmail ? body : body.substring(0, 250) + (body.length > 250 ? '...' : ''),
        date: email.date || new Date().toISOString(),
        labels: email.labels || [],
        isSent: isSentEmail,
        wordCount: body.split(/\s+/).filter(w => w.length > 0).length
    };
}

function extractEmailAddress(emailField: string): string {
    if (!emailField) return '';
    const match = emailField.match(/<([^>]+)>/) || emailField.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1] : emailField.split(' ')[0];
}

function isAutoGenerated(body: string): boolean {
    const autoPatterns = [/^automated message/i, /^this is an automated/i, /^do not reply to this email/i];
    return autoPatterns.some(pattern => pattern.test(body));
}

function cleanEmailBody(body: string): string {
    if (!body) return '';
    let cleaned = body;
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    cleaned = cleaned.replace(/^>.*$/gm, '');
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    return cleaned.trim();
}