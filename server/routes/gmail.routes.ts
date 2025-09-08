// server/routes/gmail.routes.ts
import { Router } from 'express';
import { GmailService, getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getEmailAnalysis, getDraftResponse, updateDraftStatus } from '../services/email.service.js';
import { listEmailAccounts, upsertEmailAccount, updateEmailAccount } from '../services/emailAccounts.service.js';
import { google } from 'googleapis';
import express from 'express';
import { gmailLearningSimpleRouter } from './gmail-learning-simple.routes.js';
import { GmailWatchService } from '../services/gmail-watch.service.js';

export const gmailRouter = Router();

// Ensure JSON body parsing for this router
gmailRouter.use(express.json());

// Add simple learning routes (using proven EmailCollector)
gmailRouter.use('/', gmailLearningSimpleRouter);

// Register Gmail watch for Pub/Sub (per account)
// gmailRouter.post('/watch/register', authenticate, async (req, res) => {
// try {
//     const userId = req.user?.uid;
//     if (!userId) return res.status(401).json({ error: 'User not authenticated' });
//     const { email } = req.body as { email?: string };
//     if (!email) return res.status(400).json({ error: 'Missing email' });

//     const result = await GmailWatchService.registerWatchForAccount(userId, email);
//     if (!result) return res.status(400).json({ error: 'Account or tokens not found' });

//     res.json({ success: true, historyId: result.historyId, expiresAt: result.expiration || null });
// } catch (e:any) {
//     console.error('[Watch] Register error:', e?.message || e);
//     res.status(500).json({ error: 'Failed to register watch' });
// }
// });

// Start OAuth flow
gmailRouter.get('/auth', authenticate, (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const authUrl = getAuthUrl(userId);
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
});

// Handle OAuth callback
gmailRouter.get('/auth/callback', async (req, res) => {
    try {
        const { code, state: userId, error } = req.query;

        if (error) {
            console.error('[OAuthCallback] OAuth error:', error);
            return res.redirect(`/oauth/callback?error=${encodeURIComponent(error as string)
                }`);
        }

        if (!code) {
            console.error('[OAuthCallback] Missing code');
            return res.redirect('/oauth/callback?error=missing_code');
        }

        if (!userId) {
            console.error('[OAuthCallback] Missing userId');
            return res.redirect('/oauth/callback?error=missing_user_id');
        }

        // 1. Exchange authorization code for tokens
        const tokens = await getTokensFromCode(code as string);

        // Debug: Log token info (remove in production)
        console.log('🔍 [DEBUG] Token lengths - Access:', tokens.access_token?.length, 'Refresh:', tokens.refresh_token?.length);

        // 2. Try to fetch user info (email)
        let email = null;
        try {
            email = await getUserEmail(tokens);
        } catch (error) {
            console.error('[OAuthCallback] Error fetching user email:', error);
        }

        // 3. Upsert account in DB (if email is available, use it; else use null and update later)
        console.log('🔍 [DEBUG] Storing tokens in database...');
        let accountRecord = await upsertEmailAccount(userId as string, {
            email: email || null,
            provider: 'gmail',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: tokens.expiry_date || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        });
        console.log('🔍 [DEBUG] Tokens stored successfully');

        // If email was not available at upsert, try to update it now
        if (!email && accountRecord && accountRecord.id) {
            try {
                email = await getUserEmail(tokens);
                await updateEmailAccount(accountRecord.id, userId as string, { email });
            } catch (updateErr) {
                console.error('[OAuthCallback] Error updating email in DB:', updateErr);
            }
        }

        // OAuth callback successful

        // Historical learning will be triggered by the frontend learning dialog

        // Redirect to frontend callback page with success
        res.redirect(`/oauth/callback?success=true&email=${encodeURIComponent(email || '')
            }`);
    } catch (error) {
        console.error('[OAuthCallback] Error:', error);
        res.redirect(`/oauth/callback?error=${encodeURIComponent('authentication_failed')
            }`);
    }
});

// Get connected accounts - USE AUTHENTICATION MIDDLEWARE
gmailRouter.get('/accounts', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const accounts = await listEmailAccounts(userId);

        // Transform accounts to match frontend GmailAccount type
        const transformedAccounts = accounts.map(account => ({
            id: account.id || account.email, // Use email as fallback ID
            email: account.email,
            isActive: account.isActive || true,
            connectionStatus: (account.isActive && account.email && account.accessToken && account.refreshToken) ? 'connected' : 'error',
            lastConnectedAt: account.createdAt || new Date().toISOString(),
            autoDraftEnabled: account.autoDraftEnabled || false
        }));

        res.json(transformedAccounts);
    } catch (error: any) {
        console.error('Error in /api/gmail/accounts:', error.message);

        if (error.code) {
            return res.status(400).json({ error: error.message, code: error.code, details: error.details });
        }

        res.status(500).json({
            error: 'Failed to fetch Gmail accounts',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Register Gmail watch for auto-draft functionality
gmailRouter.post('/register-watch', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { accountEmail } = req.body;
        if (!accountEmail) {
            return res.status(400).json({ error: 'accountEmail is required' });
        }

        console.log(`🔍 Registering Gmail watch for ${accountEmail} (user: ${userId})`);

        const result = await GmailWatchService.registerWatchForAccount(userId, accountEmail);

        if (!result) {
            return res.status(400).json({ error: 'Failed to register Gmail watch' });
        }

        console.log(`✅ Gmail watch registered successfully for ${accountEmail}:`, result);

        res.json({
            success: true,
            message: 'Gmail watch registered successfully',
            data: result
        });
    } catch (error: any) {
        console.error('Error registering Gmail watch:', error);
        res.status(500).json({
            error: 'Failed to register Gmail watch',
            message: error.message
        });
    }
});

// Get watch statistics (admin endpoint)
gmailRouter.get('/watch-stats', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const stats = await GmailWatchService.getWatchStatistics();

        res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        console.error('Error getting watch statistics:', error);
        res.status(500).json({
            error: 'Failed to get watch statistics',
            message: error.message
        });
    }
});

// Get user's emails (now with AI processing)
gmailRouter.get('/emails', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const limit = parseInt(req.query.limit as string) || 10;
        const onlyNewEmails = req.query.onlyNew === 'true'; // Only process new emails for AI responses
        const gmailService = new GmailService();
        const emails = await gmailService.getEmails(userId, limit, onlyNewEmails);
        // Add AI analysis data to emails
        const emailsWithAI = await Promise.all(emails.map(async (email) => {
            if (!email.id) {
                return {
                    ...email,
                    analysis: null,
                    hasDraft: false,
                    draftStatus: null
                };
            }
            const analysis = await getEmailAnalysis(email.id, userId);
            const draft = await getDraftResponse(email.id, userId);
            return {
                ...email,
                analysis: analysis?.analysis || null,
                hasDraft: !!draft,
                draftStatus: draft?.status || null
            };
        }));
        res.json({ emails: emailsWithAI });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Get AI analysis for specific email
gmailRouter.get('/emails/:emailId/analysis', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { emailId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const analysis = await getEmailAnalysis(emailId, userId);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    } catch (error) {
        console.error('Error fetching email analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});

// Get AI-generated draft for specific email
gmailRouter.get('/emails/:emailId/draft', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { emailId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const draft = await getDraftResponse(emailId, userId);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }
        res.json(draft);
    } catch (error) {
        console.error('Error fetching draft:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// Approve AI-generated draft
gmailRouter.post('/emails/:emailId/draft/approve', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { emailId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await updateDraftStatus(emailId, userId, 'approved');
        res.json({ success: true, message: 'Draft approved' });
    } catch (error) {
        console.error('Error approving draft:', error);
        res.status(500).json({ error: 'Failed to approve draft' });
    }
});

// Reject AI-generated draft
gmailRouter.post('/emails/:emailId/draft/reject', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { emailId } = req.params;
        const { feedback } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await updateDraftStatus(emailId, userId, 'rejected', { feedback });
        res.json({ success: true, message: 'Draft rejected' });
    } catch (error) {
        console.error('Error rejecting draft:', error);
        res.status(500).json({ error: 'Failed to reject draft' });
    }
});

// Create a test draft
gmailRouter.post('/create-test-draft', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { to, subject, content } = req.body;

        // Input validation
        if (to && (typeof to !== 'string' || to.length > 254)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (subject && (typeof subject !== 'string' || subject.length > 998)) {
            return res.status(400).json({ error: 'Subject too long (max 998 characters)' });
        }
        if (content && (typeof content !== 'string' || content.length > 50000)) {
            return res.status(400).json({ error: 'Content too long (max 50,000 characters)' });
        }


        const gmailService = new GmailService();

        const gmail = await gmailService.getGmailClient(userId);

        // Create draft message
        const rawMessage = gmailService.createRawMessage({
            to: to || 'test@example.com',
            subject: subject || 'Test Draft from AI Email Agent',
            body: content || 'This is a test draft created by the AI Email Agent.\n\nBest regards,\nYour AI Assistant'
        });

        const draftMessage = {
            message: {
                raw: rawMessage
            }
        };


        const response = await gmail.users.drafts.create({ userId: 'me', requestBody: draftMessage });


        res.json({ success: true, draftId: response.data.id, message: 'Test draft created successfully! Check your Gmail drafts folder.' });
    } catch (error: any) {
        console.error('[Test Draft] ❌ Error creating test draft:', error);
        console.error('[Test Draft] Error details:', error.message);
        console.error('[Test Draft] Error stack:', error.stack);

        // Handle specific authentication errors
        if (error.code === 401 || error.message?.includes('Login Required')) {
            return res.status(401).json({ error: 'Gmail authentication expired. Please reconnect your Gmail account.', code: 'AUTH_EXPIRED' });
        }

        res.status(500).json({
            error: 'Failed to create test draft',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Debug endpoint to manually process a specific email
gmailRouter.post('/emails/:emailId/process', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { emailId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        console.log(`[Debug] Manual processing requested for email ${emailId}`);

        const gmailService = new GmailService();

        // Fetch the specific email
        const gmail = await gmailService.getGmailClient(userId);

        const emailResponse = await gmail.users.messages.get({ userId: 'me', id: emailId, format: 'full' });

        const email = emailResponse.data;
        const headers = email.payload?.headers || [];
        const getHeader = (name: string) => {
            const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        const emailData = {
            id: email.id,
            threadId: email.threadId,
            snippet: email.snippet,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            body: gmailService.extractEmailBody(email.payload),
            labels: email.labelIds || [],
            provider: 'gmail'
        };

        // Force process with AI
        await gmailService.processEmailWithAI(userId, emailData);

        res.json({ success: true, message: 'Email processing triggered', emailData });
    } catch (error) {
        console.error('Error manually processing email:', error);
        res.status(500).json({ error: 'Failed to process email' });
    }
});
