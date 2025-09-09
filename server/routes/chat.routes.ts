import { Router } from 'express';
import { ChatService } from '../services/chat.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { updateAutoDraftSettings, updateAutoDraftEnabled } from '../services/emailAccounts.service.js';
import { GmailWatchService } from '../services/gmail-watch.service.js';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/session
 * Create a new chat session
 */
router.post('/session', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const session = await chatService.createChatSession(userId);

        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Error creating chat session:', error);
        res.status(500).json({
            error: 'Failed to create chat session',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/chat/message
 * Send a message and get AI response
 */
router.post('/message', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { message, sessionId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const aiResponse = await chatService.processMessage(userId, message.trim(), sessionId);

        res.json({
            success: true,
            message: aiResponse
        });
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({
            error: 'Failed to process message',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/chat/welcome
 * Get welcome message for the user
 */
router.get('/welcome', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const welcomeMessage = await chatService.getWelcomeMessage(userId);

        res.json({
            success: true,
            message: welcomeMessage
        });
    } catch (error) {
        console.error('Error getting welcome message:', error);
        res.status(500).json({
            error: 'Failed to get welcome message',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/chat/email-accounts
 * Get user's connected email accounts for chat context
 */
router.get('/email-accounts', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const emailAccounts = await chatService.getUserEmailAccounts(userId);

        res.json({
            success: true,
            accounts: emailAccounts,
            hasConnectedEmails: emailAccounts.length > 0
        });
    } catch (error) {
        console.error('Error fetching email accounts for chat:', error);
        res.status(500).json({
            error: 'Failed to fetch email accounts',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/chat/auto-draft-settings
 * Update auto-draft settings for a specific email account
 */
router.put('/auto-draft-settings', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { accountId, settings } = req.body;

        if (!accountId || !settings) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'accountId and settings are required'
            });
        }

        // Validate settings
        const { tone, customInstructions } = settings;

        if (tone && !['professional', 'casual', 'friendly', 'formal'].includes(tone)) {
            return res.status(400).json({
                error: 'Invalid tone',
                message: 'Tone must be one of: professional, casual, friendly, formal'
            });
        }

        if (customInstructions && customInstructions.length > 500) {
            return res.status(400).json({
                error: 'Custom instructions too long',
                message: 'Custom instructions must be 500 characters or less'
            });
        }

        await updateAutoDraftSettings(accountId, userId, {
            tone: tone || undefined,
            customInstructions: customInstructions || undefined
        });

        res.json({
            success: true,
            message: 'Auto-draft settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating auto-draft settings:', error);
        res.status(500).json({
            error: 'Failed to update auto-draft settings',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/chat/auto-draft-enabled
 * Update auto-draft enabled state for a specific email account
 */
router.put('/auto-draft-enabled', authenticate, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { accountId, enabled } = req.body;

        if (!accountId || typeof enabled !== 'boolean') {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'accountId and enabled (boolean) are required'
            });
        }

        await updateAutoDraftEnabled(accountId, userId, enabled);

        // Get email address for watch service
        const { getEmailAccount } = await import('../services/emailAccounts.service.js');
        const account = await getEmailAccount(accountId, userId);

        if (!account) {
            return res.status(404).json({
                error: 'Email account not found',
                message: 'Could not find email account to manage watch'
            });
        }

        // Manage Gmail watch based on auto-draft state
        if (enabled) {
            console.log(`🔧 [AutoDraft] Registering watch for ${account.email}...`);
            try {
                await GmailWatchService.registerWatchForAccount(userId, account.email);
                console.log(`✅ [AutoDraft] Successfully registered watch for ${account.email}`);
            } catch (error) {
                console.error(`❌ [AutoDraft] Failed to register watch for ${account.email}:`, error);
            }
        } else {
            console.log(`🔧 [AutoDraft] Stopping watch for ${account.email}...`);
            try {
                await GmailWatchService.stopWatchForAccount(userId, account.email);
                console.log(`✅ [AutoDraft] Successfully stopped watch for ${account.email}`);
            } catch (error) {
                console.error(`❌ [AutoDraft] Failed to stop watch for ${account.email}:`, error);
            }
        }

        res.json({
            success: true,
            message: 'Auto-draft enabled state updated successfully'
        });
    } catch (error) {
        console.error('Error updating auto-draft enabled state:', error);
        res.status(500).json({
            error: 'Failed to update auto-draft enabled state',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export { router as chatRouter };