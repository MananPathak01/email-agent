// server/routes/gmail.routes.ts
import { Router } from 'express';
import { getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail.service';
import { createSimpleGmailService } from '../services/gmail-simple.service';
import { addEmailAccount, listEmailAccounts, updateEmailAccount, upsertEmailAccount } from '../services/emailAccounts.service';
import { authenticate } from '../middleware/auth.middleware';
import { decrypt } from '../utils/crypto';
import express from 'express';

export const gmailRouter = Router();

// Ensure JSON body parsing for this router
gmailRouter.use(express.json());

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
gmailRouter.post('/auth/callback', async (req, res) => {
  try {
    const { code, state: userId, userId: userIdDirect } = req.body;
    const finalUserId = userIdDirect || userId;
    if (!code) {
      console.error('[OAuthCallback] Missing code');
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    if (!finalUserId) {
      console.error('[OAuthCallback] Missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }
    // 1. Exchange authorization code for tokens
    const tokens = await getTokensFromCode(code);

    // 2. Try to fetch user info (email)
    let email = null;
    try {
      email = await getUserEmail(tokens);
    } catch (error) {
      console.error('[OAuthCallback] Error fetching user email:', error);
    }

    // 3. Upsert account in DB (if email is available, use it; else use null and update later)
    let accountRecord = await upsertEmailAccount(finalUserId, {
      email: email || null,
      provider: 'gmail',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date || null, // Store as number (ms since epoch)
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });

    // If email was not available at upsert, try to update it now
    if (!email && accountRecord && accountRecord.id) {
      try {
        email = await getUserEmail(tokens);
        await updateEmailAccount(accountRecord.id, finalUserId, { email });
      } catch (updateErr) {
        console.error('[OAuthCallback] Error updating email in DB:', updateErr);
      }
    }

    res.json({ success: true, email });
  } catch (error) {
    console.error('[OAuthCallback] Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get connected accounts - USE AUTHENTICATION MIDDLEWARE
gmailRouter.get('/accounts', authenticate, async (req, res) => {
  try {
    // Get userId from authenticated user (set by middleware)
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
      lastConnectedAt: account.createdAt || new Date().toISOString()
    }));
    
    res.json(transformedAccounts);
  } catch (error: any) {
    console.error('Error in /api/gmail/accounts:', error.message);
    
    if (error.code) {
      return res.status(400).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch Gmail accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get emails from a connected account
gmailRouter.get('/emails', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      accountId,
      maxResults = '20',
      pageToken,
      labelIds,
      q = '',
    } = req.query;

    const accounts = await listEmailAccounts(userId);
    if (accounts.length === 0) {
      return res.json({ emails: [], message: 'No email accounts connected' });
    }

    // Find the requested account or use the first active one
    const account = accountId
      ? accounts.find(acc => acc.id === accountId)
      : accounts.find(acc => acc.isActive);

    if (!account) {
      return res.json({ emails: [], message: 'No active email account found' });
    }

    try {
      const gmailService = createSimpleGmailService(
        account.accessToken,
        account.refreshToken
      );

      // Pass labelIds and q to getEmailsWithDetails
      let labelIdsArray: string[] | undefined = undefined;
      if (labelIds) {
        if (Array.isArray(labelIds)) {
          labelIdsArray = labelIds.flatMap(id => String(id).split(','));
        } else if (typeof labelIds === 'string') {
          labelIdsArray = labelIds.split(',');
        } else {
          labelIdsArray = [String(labelIds)];
        }
      }
      // Debug logging for labelIds
      console.log('labelIds from req.query:', labelIds, 'type:', typeof labelIds);
      console.log('labelIdsArray to Gmail:', labelIdsArray);
      const emails = await gmailService.getEmailsWithDetails(
        parseInt(maxResults as string, 10),
        labelIdsArray,
        q as string
      );
      
      const result = {
        emails: emails,
        resultSizeEstimate: emails.length,
        nextPageToken: undefined // SimpleGmailService doesn't support pagination yet
      };

      res.json(result);
    } catch (serviceError) {
      console.error('Gmail service error:', serviceError);
      // Return empty emails array with error message
      res.json({
        emails: [],
        resultSizeEstimate: 0,
        message: 'Email service is not properly configured. Please check your account settings.',
        error: true
      });
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      code: 'EMAILS_ERROR'
    });
  }
});

// Get email labels
gmailRouter.get('/labels', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { accountId } = req.query;

    const accounts = await listEmailAccounts(userId);
    if (accounts.length === 0) {
      return res.json({ labels: [], message: 'No email accounts connected' });
    }

    // Find the requested account or use the first active one
    const account = accountId
      ? accounts.find(acc => acc.id === accountId)
      : accounts.find(acc => acc.isActive);

    if (!account) {
      return res.json({ labels: [], message: 'No active email account found' });
    }

    try {
      const gmailService = createSimpleGmailService(
        account.accessToken,
        account.refreshToken
      );

      const labels = await gmailService.getLabels();
      res.json({ labels });
    } catch (serviceError) {
      console.error('Gmail service error:', serviceError);
      // Return empty labels array with error message instead of throwing
      res.json({
        labels: [],
        error: true,
        message: 'Failed to initialize Gmail service. Please reconnect your account.'
      });
    }
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels', code: 'LABELS_ERROR' });
  }
});

// Get a single email
gmailRouter.get('/emails/:messageId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { messageId } = req.params;
    const { accountId } = req.query;

    const accounts = await listEmailAccounts(userId);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No email accounts connected' });
    }

    // Find the requested account or use the first active one
    const account = accountId 
      ? accounts.find(acc => acc.id === accountId)
      : accounts.find(acc => acc.isActive);

    if (!account) {
      return res.status(404).json({ error: 'No active email account found' });
    }

    const gmailService = createSimpleGmailService(
      account.accessToken,
      account.refreshToken
    );

    const email = await gmailService.getEmail(messageId);
    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Modify email (mark as read/unread, move to trash)
gmailRouter.post('/emails/:messageId/modify', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { messageId } = req.params;
    const { accountId } = req.query;
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const accounts = await listEmailAccounts(userId);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No email accounts connected' });
    }

    // Find the requested account or use the first active one
    const account = accountId 
      ? accounts.find(acc => acc.id === accountId)
      : accounts.find(acc => acc.isActive);

    if (!account) {
      return res.status(404).json({ error: 'No active email account found' });
    }

    const gmailService = createSimpleGmailService(
      account.accessToken,
      account.refreshToken
    );

    // Note: SimpleGmailService doesn't support email modification actions yet
    // This is a temporary limitation while we use the simplified service
    return res.status(501).json({ 
      error: 'Email modification actions are temporarily unavailable',
      message: 'This feature will be restored once the Gmail service is fully updated'
    });
  } catch (error) {
    console.error('Error modifying email:', error);
    res.status(500).json({ error: 'Failed to modify email' });
  }
});