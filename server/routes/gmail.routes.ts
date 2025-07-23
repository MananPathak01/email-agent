// server/routes/gmail.routes.ts
import { Router } from 'express';
import { getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail.service';
import { addEmailAccount, listEmailAccounts, updateEmailAccount, upsertEmailAccount } from '../services/emailAccounts.service';
import { authenticate } from '../middleware/auth.middleware';
import { Timestamp } from 'firebase-admin/firestore';
import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
  console.log('[OAuthCallback] Request body:', req.body);
  try {
    const { code, state: userId, userId: userIdDirect } = req.body;
    const finalUserId = userIdDirect || userId;
    console.log('[OAuthCallback] Received code:', code);
    console.log('[OAuthCallback] Received userId:', finalUserId);
    if (!code) {
      console.error('[OAuthCallback] Missing code');
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    if (!finalUserId) {
      console.error('[OAuthCallback] Missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }
    console.log('[OAuthCallback] Exchanging code for tokens:', code);
    // 1. Exchange authorization code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('[OAuthCallback] Tokens from Google:', tokens);

    // 2. Try to fetch user info (email)
    let email = null;
    try {
      email = await getUserEmail(tokens);
      console.log('[OAuthCallback] Successfully fetched user email:', email);
    } catch (error) {
      console.error('[OAuthCallback] Error fetching user email:', error);
    }

    // 3. Upsert account in DB (if email is available, use it; else use null and update later)
    let accountRecord = await upsertEmailAccount(finalUserId, {
      email: email || null,
      provider: 'gmail',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });
    console.log('[OAuthCallback] Upserted account in DB:', accountRecord);

    // If email was not available at upsert, try to update it now
    if (!email && accountRecord && accountRecord.id) {
      try {
        email = await getUserEmail(tokens);
        await updateEmailAccount(accountRecord.id, finalUserId, { email });
        console.log('[OAuthCallback] Successfully updated email in DB:', email);
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
    console.log('[Gmail Accounts] Raw accounts from DB:', accounts);
    // Transform accounts to match frontend GmailAccount type
    const transformedAccounts = accounts.map(account => ({
      id: account.id || account.email, // Use email as fallback ID
      email: account.email,
      isActive: account.isActive || true,
      connectionStatus: (account.isActive && account.email && account.accessToken && account.refreshToken) ? 'connected' : 'error',
      lastConnectedAt: account.createdAt || new Date().toISOString()
    }));
    console.log('[Gmail Accounts] Transformed accounts sent to frontend:', transformedAccounts);
    
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

    const accounts = await listEmailAccounts(userId);
    if (accounts.length === 0) {
      return res.json({ emails: [], message: 'No email accounts connected' });
    }

    const account = accounts.find(acc => acc.isActive);
    if (!account) {
      return res.json({ emails: [], message: 'No active email account found' });
    }

    // Assuming GmailService is defined elsewhere or needs to be imported
    // For now, we'll just return a placeholder message as the class is not provided
    res.json({ emails: [], message: 'GmailService is not available in this context' });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});