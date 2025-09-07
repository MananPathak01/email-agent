import express from "express";
import {google} from "googleapis";
import {collection, query, where, getDocs} from 'firebase/firestore';
import {db} from './firebase.js';
import {addEmailAccount, listEmailAccounts} from './emailAccounts.js';
import {decrypt} from './utils/crypto.js';
import type {Request}
from 'express';
import {getAuth} from 'firebase-admin/auth';
import {OAuth2Client} from 'google-auth-library';

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID !;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET !;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI !;

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Middleware to verify Firebase ID token
const authenticate = async (req : any, res : any, next : any) => {
    try {
        const authHeader = req.headers.authorization;
        if (! authHeader ?. startsWith('Bearer ')) {
            return res.status(401).json({error: 'Unauthorized - No token provided'});
        }

        const idToken = authHeader.split(' ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid
        };
        next();
    } catch (error : any) {
        console.error('Authentication error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
            return res.status(401).json({error: 'Session expired. Please sign in again.'});
        }
        res.status(401).json({error: 'Unauthorized - Invalid token'});
    }
};

// 1. Start OAuth flow
router.get("/auth/gmail", authenticate, (req, res) => {
    try {
        const scopes = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.email", "openid"];

        const url = oauth2Client.generateAuthUrl({
            access_type: "offline", scope: scopes, prompt: "consent", state: req.user.uid // Include user ID in state for callback
        });

        res.json({authUrl: url});
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({error: 'Failed to generate authentication URL'});
    }
});

// 2. Handle OAuth callback
router.get("/auth/gmail/callback", async (req, res) => {
    const {code, state: userId} = req.query as {
        code?: string;
        state?: string
    };

    if (!code) 
        return res.status(400).send("Missing authorization code");
    
    if (!userId) 
        return res.status(400).send("Missing user ID in callback");
    

    try {
        const {tokens} = await oauth2Client.getToken(code);

        // Get user info from Google
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({version: 'v2', auth: oauth2Client});
        const userInfo = await oauth2.userinfo.get();

        if (! userInfo.data.email) {
            throw new Error('No email found in user info');
        }

        // Store account in Firestore via helper
        await addEmailAccount(userId, {
            email: userInfo.data.email,
            provider: 'gmail',
            accessToken: tokens.access_token !,
            refreshToken: tokens.refresh_token !,
            tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date)as any : undefined as any // Timestamp conversion handled inside helper
        });

        res.send("<script>window.close();</script>");
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send("<h1>Authentication failed</h1><p>Please try again.</p>");
    }
});

// Get connected Gmail accounts for the authenticated user
router.get("/gmail/accounts", authenticate, async (req, res) => {
    try {
        console.log(`Fetching Gmail accounts for user: ${
            req.user.uid
        }`);

        const accounts = await listEmailAccounts(req.user.uid);

        console.log(`Found ${
            accounts.length
        } Gmail accounts for user ${
            req.user.uid
        }`);
        res.json(accounts);
    } catch (error) {
        console.error('Error fetching Gmail accounts:', error);
        res.status(500).json({
            error: 'Failed to fetch Gmail accounts',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

// Fetch emails from Gmail
router.get("/gmail/emails", authenticate, async (req : Request & {
    user?: {
        uid: string
    }
}, res) => {
    try {
        const folder = req.query.folder as string || 'inbox';
        const accounts = await listEmailAccounts(req.user !.uid);
        if (accounts.length === 0) {
            return res.json({emails: [], message: 'No email accounts connected'});
        }
        const account = accounts[0];
        oauth2Client.setCredentials({
            access_token: decrypt(account.accessToken),
            refresh_token: decrypt(account.refreshToken),
            expiry_date: account.tokenExpiry ?. toMillis ? account.tokenExpiry.toMillis() : undefined
        });

        const gmail = google.gmail({version: "v1", auth: oauth2Client});
        const label = folder === "sent" ? "SENT" : "INBOX";

        const listRes = await gmail.users.messages.list({userId: "me", labelIds: [label], maxResults: 20});

        const messages = await Promise.all((listRes.data.messages || []).map(async (msg) => {
            const msgRes = await gmail.users.messages.get({
                userId: "me",
                id: msg.id !,
                format: "metadata",
                metadataHeaders: ["Subject", "From", "To", "Date"]
            });
            return {
                id: msg.id,
                snippet: msgRes.data.snippet,
                headers: msgRes.data.payload ?. headers
            };
        }));

        res.json(messages);
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({error: 'Failed to fetch emails'});
    }
});

export default router;
