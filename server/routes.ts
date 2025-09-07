import type {Express}
from "express";
import {createServer, Server} from "http";
import {WebSocketServer, WebSocket} from "ws";
import {getCollectionRef, getDocRef, COLLECTIONS} from "./firebase.js";

import bodyParser from "body-parser";
import {
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    orderBy,
    doc,
    DocumentData
} from 'firebase/firestore';

interface GmailAccount extends DocumentData {
    userId: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    isActive: boolean;
    provider: string;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    createdAt: string;
    updatedAt: string;
    lastConnectedAt: string;
}

import {GmailService as GmailServiceClass, getTokensFromCode} from "./services/gmail.js";
import {GmailService, getUserEmail, getAuthUrl} from "./services/gmail.service.js";
import {gmailRouter} from "./routes/gmail.routes.js";
import {authenticate} from "./middleware/auth.middleware.js";
import {IncomingEmailService} from './services/incoming-email.service.js';

export async function registerRoutes(app : Express): Promise < Server > { // Parse JSON bodies for webhooks
    app.use(bodyParser.json());

    // Register Gmail routes with authentication
    app.use('/api/gmail', gmailRouter);

    // Pub/Sub push webhook for Gmail notifications
    // Endpoint: POST /webhooks/pubsub/gmail
    // Expects body: { message: { data: base64(JSON{"emailAddress","historyId"}), attributes?: {...} }, subscription: string }
    app.post('/webhooks/pubsub/gmail', async (req, res) => {
        try {
            const msg = req.body ?. message;
            if (! msg || ! msg.data) {
                return res.status(400).json({error: 'Invalid Pub/Sub message'});
            }

            // Optional: verify Google-signed JWT in Authorization header (to be implemented for production)
            // const authHeader = req.header('Authorization');
            // TODO: verify JWT audience/issuer against env config

            const decoded = JSON.parse(Buffer.from(msg.data, 'base64').toString('utf8'))as {
                emailAddress : string;
                historyId : string | number
            };
            if (! decoded ?. emailAddress || ! decoded ?. historyId) {
                return res.status(400).json({error: 'Missing emailAddress or historyId'});
            }

            // Process asynchronously but ack immediately to Pub/Sub
            IncomingEmailService.processNotification(decoded.emailAddress, decoded.historyId).catch((e) => console.error('[PubSub] Processing error:', e));

            // Acknowledge receipt
            return res.status(204).send();
        } catch (err : any) {
            console.error('[PubSub] Handler error:', err ?. message || err);
            return res.status(500).json({error: 'Internal error'});
        }
    });

    // Rest of your existing routes...
    const httpServer = createServer(app);

    // Note: WebSocket functionality disabled for Vercel serverless deployment
    // Real-time updates would need to be implemented using polling or Server-Sent Events

    // Broadcast function (no-op for serverless)
    const broadcast = (data : any) => {
        // In serverless environment, we can't maintain persistent connections
        // Consider using database-based notifications or polling instead
        console.log('Broadcast attempted (disabled in serverless):', data);
    };

    // Gmail account routes
    app.get("/api/gmail/accounts", async (req, res) => {
        try {
            const {userId} = req.query as {
                userId?: string
            };
            if (!userId) {
                return res.status(400).json({message: "User ID is required"});
            }
            console.log('Fetching Gmail accounts for user:', userId);

            const accounts = await import ('./services/emailAccounts.service.js').then((m) => m.listEmailAccounts(userId));

            console.log('Found accounts:', accounts);
            return res.json(accounts); // empty array is fine
        } catch (error) {
            console.error('Error fetching Gmail accounts:', error);
            // Always reply 200 with empty list to avoid client error state
            return res.json([]);
        }
    });

    // Gmail OAuth routes
    app.get("/api/auth/gmail", authenticate, async (req, res) => {
        try {
            const userId = req.user ?. uid;
            if (! userId) {
                return res.status(401).json({error: 'User not authenticated'});
            }
            const authUrl = getAuthUrl(userId);
            res.json({authUrl});
        } catch (error) {
            res.status(500).json({message: "Failed to generate auth URL"});
        }
    });

    app.post("/api/auth/gmail/callback", async (req, res) => {
        try {
            const {code, userId} = req.body;

            console.log('OAuth callback received:', {
                code: !!code,
                userId
            });

            if (!code || !userId) {
                return res.status(400).json({message: "Code and userId are required"});
            }

            // Check if user exists in our database
            const userDocRef = getDocRef(COLLECTIONS.USERS, userId as string);
            const userDoc = await getDoc(userDocRef);
            if (! userDoc.exists()) {
                return res.status(400).json({message: "User not found. Please create account first."});
            }

            const tokens = await getTokensFromCode(code);

            if (! tokens.access_token || ! tokens.refresh_token) {
                return res.status(400).json({message: "Failed to get tokens"});
            }

            // Get user email from Gmail
            const email = await getUserEmail(tokens);

            console.log('Creating Gmail account for:', {userId, email});

            // Store the Gmail account in Firebase
            const accountsCollection = getCollectionRef(COLLECTIONS.GMAIL_ACCOUNTS);

            // Check if this email is already connected for this user
            const existingAccountQuery = query(accountsCollection, where('userId', '==', userId), where('email', '==', email));

            const existingAccount = await getDocs(existingAccountQuery);

            let accountDocRef;

            if (! existingAccount.empty) { // Update existing account
                const docId = existingAccount.docs[0].id;
                accountDocRef = doc(accountsCollection, docId);
                await setDoc(accountDocRef, {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isActive: true,
                    updatedAt: new Date().toISOString(),
                    lastConnectedAt: new Date().toISOString()
                }, {merge: true});
            } else { // Create new account
                const gmailAccount = {
                    userId: userId as string,
                    email,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isActive: true,
                    provider: 'gmail',
                    connectionStatus: 'connected',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastConnectedAt: new Date().toISOString()
                };

                accountDocRef = await addDoc(accountsCollection, gmailAccount);
            }

            // Get the saved account data
            const accountDoc = await getDoc(accountDocRef);
            const savedAccount = {
                id: accountDoc.id,
                ... accountDoc.data()
            };

            console.log('Gmail account saved:', savedAccount);

            // Broadcast the update to connected clients
            broadcast({
                type: 'gmail_account_connected',
                data: {
                    account: savedAccount
                }
            });

            res.json({success: true, account: savedAccount});
        } catch (error) {
            console.error("Gmail OAuth callback error:", error);
            res.status(500).json({message: "Failed to connect Gmail account"});
        }
    });

    // Email processing routes
    app.get("/api/emails", async (req, res) => {
        try {
            const {userId} = req.query;

            if (!userId) {
                return res.status(400).json({message: "User ID is required"});
            }

            const emailsCollection = getCollectionRef(COLLECTIONS.EMAILS);
            const emailsQuery = query(emailsCollection, where('userId', '==', userId), orderBy('receivedAt', 'desc'));
            const emailsSnapshot = await getDocs(emailsQuery);

            const emails: any[] = [];
            emailsSnapshot.forEach((doc) => {
                emails.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            res.json(emails);
        } catch (error) {
            res.status(500).json({message: "Failed to fetch emails"});
        }
    });

    // Manual email creation route
    app.post("/api/emails", async (req, res) => {
        try {
            const emailData = req.body;

            // Store email in Firebase
            const emailsCollection = getCollectionRef(COLLECTIONS.EMAILS);

            const emailToStore = {
                ... emailData,
                userId: emailData.userId || 'default-user',
                createdAt: new Date().toISOString(),
                receivedAt: emailData.receivedAt || new Date().toISOString(),
                status: 'pending',
                isOnboardingRelated: false,
                priority: 'medium',
                category: 'general',
                aiAnalysis: null
            };

            const emailDocRef = await addDoc(emailsCollection, emailToStore);
            const savedEmail = {
                id: emailDocRef.id,
                ... emailToStore
            };

            broadcast({
                type: 'email_created',
                data: {
                    email: savedEmail,
                    analysis: null
                }
            });

            res.json({email: savedEmail, analysis: null});
        } catch (error) {
            console.error('Failed to create email:', error);
            res.status(500).json({message: "Failed to create email"});
        }
    });

    // User routes
    app.get("/api/user/:id", async (req, res) => {
        try {
            const {id} = req.params;
            const userDocRef = getDocRef(COLLECTIONS.USERS, id);
            const userDoc = await getDoc(userDocRef);

            if (! userDoc.exists()) {
                return res.status(404).json({message: "User not found"});
            }

            res.json(userDoc.data());
        } catch (error) {
            res.status(500).json({message: "Failed to fetch user"});
        }
    });

    app.post("/api/user", async (req, res) => {
        try {
            const {id, email, name} = req.body;

            if (!id || !email || !name) {
                return res.status(400).json({message: "id, email, and name are required"});
            }

            const userDocRef = getDocRef(COLLECTIONS.USERS, id);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                return res.json(userDoc.data());
            }

            // Create new user
            const newUser = {
                username: email,
                email,
                name,
                role: 'user',
                createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);

            res.json(newUser);
        } catch (error) {
            console.error('Failed to create user:', error);
            res.status(500).json({message: "Failed to create user"});
        }
    });


    return httpServer;
}
