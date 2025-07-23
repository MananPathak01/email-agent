import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getCollectionRef, getDocRef, COLLECTIONS } from "./firebase";

import bodyParser from "body-parser";
import { getDocs, getDoc, setDoc, addDoc, query, where, orderBy, doc, DocumentData } from 'firebase/firestore';

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

import { GmailService, getAuthUrl, getTokensFromCode } from "./services/gmail.service";
import { gmailRouter } from "./routes/gmail.routes";
import { authenticate } from "./middleware/auth.middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parse JSON bodies for webhooks
  app.use(bodyParser.json());
  
  // Register Gmail routes with authentication
  app.use('/api/gmail', gmailRouter);
  
  // Rest of your existing routes...
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = Math.random().toString(36).substring(7);
    connectedClients.set(clientId, ws);

    ws.on('close', () => {
      connectedClients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(clientId);
    });
  });

  // Broadcast to all connected clients
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Gmail account routes
  app.get("/api/gmail/accounts", async (req, res) => {
    try {
      const { userId } = req.query as { userId?: string };
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      console.log('Fetching Gmail accounts for user:', userId);

      const accounts = await import('./emailAccounts').then((m) => m.listEmailAccounts(userId));

      console.log('Found accounts:', accounts);
      return res.json(accounts); // empty array is fine
    } catch (error) {
      console.error('Error fetching Gmail accounts:', error);
      // Always reply 200 with empty list to avoid client error state
      return res.json([]);
    }
  });

  // Gmail OAuth routes
  app.get("/api/auth/gmail", async (req, res) => {
    try {
      const authUrl = getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  app.post("/api/auth/gmail/callback", async (req, res) => {
    try {
      const { code, userId } = req.body;
      
      console.log('OAuth callback received:', { code: !!code, userId });
      
      if (!code || !userId) {
        return res.status(400).json({ message: "Code and userId are required" });
      }

      // Check if user exists in our database
      const userDocRef = getDocRef(COLLECTIONS.USERS, userId as string);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        return res.status(400).json({ message: "User not found. Please create account first." });
      }

      const tokens = await getTokensFromCode(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        return res.status(400).json({ message: "Failed to get tokens" });
      }

      // Get user email from Gmail
      const gmailService = new GmailService(tokens.access_token, tokens.refresh_token);
      const email = await gmailService.getUserEmail();
      
      console.log('Creating Gmail account for:', { userId, email });

      // Store the Gmail account in Firebase
      const accountsCollection = getCollectionRef(COLLECTIONS.GMAIL_ACCOUNTS);
      
      // Check if this email is already connected for this user
      const existingAccountQuery = query(
        accountsCollection,
        where('userId', '==', userId),
        where('email', '==', email)
      );
      
      const existingAccount = await getDocs(existingAccountQuery);
      
      let accountDocRef;
      
      if (!existingAccount.empty) {
        // Update existing account
        const docId = existingAccount.docs[0].id;
        accountDocRef = doc(accountsCollection, docId);
        await setDoc(accountDocRef, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isActive: true,
          updatedAt: new Date().toISOString(),
          lastConnectedAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        // Create new account
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
          lastConnectedAt: new Date().toISOString(),
        };
        
        accountDocRef = await addDoc(accountsCollection, gmailAccount);
      }
      
      // Get the saved account data
      const accountDoc = await getDoc(accountDocRef);
      const savedAccount = { id: accountDoc.id, ...accountDoc.data() };
      
      console.log('Gmail account saved:', savedAccount);
      
      // Broadcast the update to connected clients
      broadcast({
        type: 'gmail_account_connected',
        data: { account: savedAccount }
      });

      res.json({ success: true, account: savedAccount });
    } catch (error) {
      console.error("Gmail OAuth callback error:", error);
      res.status(500).json({ message: "Failed to connect Gmail account" });
    }
  });

  // Email processing routes
  app.get("/api/emails", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const emailsCollection = getCollectionRef(COLLECTIONS.EMAILS);
      const emailsQuery = query(emailsCollection, where('userId', '==', userId), orderBy('receivedAt', 'desc'));
      const emailsSnapshot = await getDocs(emailsQuery);
      
      const emails = [];
      emailsSnapshot.forEach((doc) => {
        emails.push({ id: doc.id, ...doc.data() });
      });
      
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  // Manual email creation route
  app.post("/api/emails", async (req, res) => {
    try {
      const emailData = req.body;
      
      // Store email in Firebase
      const emailsCollection = getCollectionRef(COLLECTIONS.EMAILS);
      
      const emailToStore = {
        ...emailData,
        userId: emailData.userId || 'default-user',
        createdAt: new Date().toISOString(),
        receivedAt: emailData.receivedAt || new Date().toISOString(),
        status: 'pending',
        isOnboardingRelated: false,
        priority: 'medium',
        category: 'general',
        aiAnalysis: null,
      };
      
      const emailDocRef = await addDoc(emailsCollection, emailToStore);
      const savedEmail = { id: emailDocRef.id, ...emailToStore };
      
      broadcast({
        type: 'email_created',
        data: { email: savedEmail, analysis: null }
      });

      res.json({ email: savedEmail, analysis: null });
    } catch (error) {
      console.error('Failed to create email:', error);
      res.status(500).json({ message: "Failed to create email" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userDocRef = getDocRef(COLLECTIONS.USERS, id);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(userDoc.data());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/user", async (req, res) => {
    try {
      const { id, email, name } = req.body;

      if (!id || !email || !name) {
        return res.status(400).json({ message: "id, email, and name are required" });
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
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUser);

      res.json(newUser);
    } catch (error) {
      console.error('Failed to create user:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });




  return httpServer;
}
