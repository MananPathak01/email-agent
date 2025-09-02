import type {Express}
from "express";
import {createServer, type Server} from "http";
import {WebSocketServer, WebSocket} from "ws";
// import { storage } from "./storage"; // No longer needed - using Firebase directly
// import {
// analyzeEmail,
// generateEmailResponse,
// suggestTasks,
// summarizeConversation
// } from "./services/openai";
import {getCollectionRef, getDocRef, COLLECTIONS} from "./firebase";
import {
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import {GmailService, getAuthUrl, getTokensFromCode, refreshAccessToken} from "./services/gmail";
// import { vectorSearchService } from "./services/vectorSearch";
// import { insertEmailSchema, insertTaskSchema, insertEmailResponseSchema } from "@shared/schema"; // No longer needed

export async function registerRoutes(app : Express): Promise < Server > {
    const httpServer = createServer(app);

    // WebSocket setup for real-time updates
    const wss = new WebSocketServer(
        {server: httpServer, path: '/ws'}
    );

    const connectedClients = new Map<string, WebSocket>();

    wss.on('connection', (ws : WebSocket) => {
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
    const broadcast = (data : any) => {
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
            const {userId} = req.query;
            if (!userId) {
                return res.status(400).json({message: "User ID is required"});
            }
            console.log('Fetching Gmail accounts for user:', userId);

            const accountsCollection = getCollectionRef(COLLECTIONS.GMAIL_ACCOUNTS);
            const accountsQuery = query(accountsCollection, where('userId', '==', userId));
            const accountsSnapshot = await getDocs(accountsQuery);

            const accounts = [];
            accountsSnapshot.forEach((doc) => {
                accounts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('Found accounts:', accounts);
            res.json(accounts);
        } catch (error) {
            console.error('Error fetching Gmail accounts:', error);
            res.status(500).json({message: "Failed to fetch Gmail accounts"});
        }
    });

    // Gmail OAuth routes
    app.get("/api/auth/gmail", async (req, res) => {
        try {
            const authUrl = getAuthUrl();
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
            const gmailService = new GmailService(tokens.access_token, tokens.refresh_token);
            const email = await gmailService.getUserEmail();

            console.log('Creating Gmail account for:', {userId, email});

            // Store the Gmail account in Firebase
            const accountsCollection = getCollectionRef(COLLECTIONS.GMAIL_ACCOUNTS);

            const gmailAccount = {
                userId: userId as string,
                email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            const accountDocRef = await addDoc(accountsCollection, gmailAccount);

            const savedAccount = {
                id: accountDocRef.id,
                ... gmailAccount
            };
            console.log('Gmail account created:', savedAccount);

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

            const emails = [];
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

            // Simplified email creation without AI analysis for now
            let analysis = null;

            // Store email in Firebase
            const emailsCollection = getCollectionRef(COLLECTIONS.EMAILS);

            const emailToStore = {
                ... emailData,
                userId: emailData.userId || 'default-user',
                createdAt: new Date().toISOString(),
                receivedAt: emailData.receivedAt || new Date().toISOString(),
                status: 'pending',
                isOnboardingRelated: analysis ?. isOnboardingRelated || false,
                priority: analysis ?. priority || 'medium',
                category: analysis ?. category || 'general',
                aiAnalysis: analysis
            };

            const emailDocRef = await addDoc(emailsCollection, emailToStore);
            const savedEmail = {
                id: emailDocRef.id,
                ... emailToStore
            };

            // TODO: Add task creation back later

            broadcast({
                type: 'email_created',
                data: {
                    email: savedEmail,
                    analysis
                }
            });

            res.json({email: savedEmail, analysis});
        } catch (error) {
            console.error('Failed to create email:', error);
            res.status(500).json({message: "Failed to create email"});
        }
    });

    /* TODO: Implement email sync with Firebase
  app.post("/api/emails/sync", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const gmailAccounts = await storage.getGmailAccountsByUser(userId);
      const processedEmails: any[] = [];

      for (const account of gmailAccounts) {
        try {
          // Refresh token if needed
          const refreshedTokens = await refreshAccessToken(account.refreshToken);
          
          if (refreshedTokens.access_token) {
            await storage.updateGmailAccountTokens(account.id, refreshedTokens.access_token, refreshedTokens.refresh_token || account.refreshToken);
          }

          const gmailService = new GmailService(
            refreshedTokens.access_token || account.accessToken,
            refreshedTokens.refresh_token || account.refreshToken
          );

          const recentEmails = await gmailService.getRecentEmails(20);

          for (const email of recentEmails) {
            // Check if email already exists
            const existingEmail = await storage.getEmailByMessageId(email.id);
            if (existingEmail) continue;

            // Analyze email with AI
            const analysis = await analyzeEmail(email.content, email.subject, email.from);
            
            // Generate embedding for similarity search
            const embedding = await vectorSearchService.generateAndStoreEmbedding(
              email.content, 
              email.subject
            );

            // Store email
            const storedEmail = await storage.createEmail({
              gmailAccountId: account.id,
              messageId: email.id,
              threadId: email.threadId,
              subject: email.subject,
              fromEmail: email.from,
              fromName: email.from.split('<')[0].trim().replace(/['"]/g, ''),
              toEmail: email.to,
              content: email.content,
              htmlContent: email.htmlContent,
              isOnboardingRelated: analysis.isOnboardingRelated,
              priority: analysis.priority,
              category: analysis.category,
              aiAnalysis: analysis,
              embedding,
              receivedAt: email.receivedAt
            });

            // Create tasks if it's onboarding-related
            if (analysis.isOnboardingRelated && analysis.confidence > 0.7) {
              const taskSuggestions = await suggestTasks(email.content, analysis);
              
              for (const taskSuggestion of taskSuggestions) {
                await storage.createTask({
                  userId,
                  emailId: storedEmail.id,
                  title: taskSuggestion.title,
                  description: taskSuggestion.description,
                  type: taskSuggestion.type,
                  priority: taskSuggestion.priority,
                  dueDate: taskSuggestion.dueDate ? new Date(taskSuggestion.dueDate) : undefined,
                  metadata: { steps: taskSuggestion.steps }
                });
              }
            }

            processedEmails.push(storedEmail);
          }
        } catch (error) {
          console.error(`Error processing account ${account.email}:`, error);
        }
      }

      // Broadcast new emails to connected clients
      if (processedEmails.length > 0) {
        broadcast({
          type: 'new_emails',
          data: processedEmails
        });
      }

      res.json({ 
        success: true, 
        processedCount: processedEmails.length,
        emails: processedEmails 
      });
    } catch (error) {
      console.error("Email sync error:", error);
      res.status(500).json({ message: "Failed to sync emails" });
    }
  });

  app.post("/api/emails/:id/respond", async (req, res) => {
    try {
      const { id } = req.params;
      const { customMessage, useTemplate } = req.body;

      const email = await storage.getEmailById(parseInt(id));
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      let responseContent: string;

      if (customMessage) {
        responseContent = customMessage;
      } else {
        // Generate AI response
        const context = `This is an onboarding-related email. Category: ${email.category}. Priority: ${email.priority}.`;
        responseContent = await generateEmailResponse(
          email.content,
          email.subject,
          context,
          useTemplate
        );
      }

      // Store the response
      const response = await storage.createEmailResponse({
        originalEmailId: parseInt(id),
        responseContent,
        templateUsed: useTemplate
      });

      // Send the email via Gmail
      const gmailAccount = await storage.getGmailAccountById(email.gmailAccountId);
      if (gmailAccount) {
        const gmailService = new GmailService(gmailAccount.accessToken, gmailAccount.refreshToken);
        
        const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
        await gmailService.sendEmail(email.fromEmail, subject, responseContent, email.messageId);
        
        // Update response status
        await storage.updateEmailResponseStatus(response.id, 'sent', new Date());
        
        // Update email status
        await storage.updateEmailStatus(parseInt(id), 'replied');
      }

      // Broadcast update
      broadcast({
        type: 'email_responded',
        data: { emailId: parseInt(id), response }
      });

      res.json({ success: true, response });
    } catch (error) {
      console.error("Email response error:", error);
      res.status(500).json({ message: "Failed to send email response" });
    }
  });

  // Task management routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const tasks = await storage.getTasksByUser(userId as string);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      broadcast({
        type: 'task_created',
        data: task
      });

      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const task = await storage.updateTaskStatus(
        parseInt(id), 
        status, 
        status === 'completed' ? new Date() : undefined
      );

      broadcast({
        type: 'task_updated',
        data: task
      });

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // AI Chat routes
  app.post("/api/chat/process-emails", async (req, res) => {
    try {
      const { userId } = req.body;
      
      const pendingEmails = await storage.getPendingEmailsByUser(userId);
      const processedCount = pendingEmails.length;

      // Process each pending email
      for (const email of pendingEmails) {
        if (email.isOnboardingRelated) {
          // Generate response
          const context = `Category: ${email.category}. Priority: ${email.priority}.`;
          const responseContent = await generateEmailResponse(
            email.content,
            email.subject,
            context
          );

          await storage.createEmailResponse({
            originalEmailId: email.id,
            responseContent
          });

          await storage.updateEmailStatus(email.id, 'processed');
        }
      }

      broadcast({
        type: 'emails_processed',
        data: { processedCount }
      });

      res.json({ success: true, processedCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to process emails" });
    }
  });

  app.post("/api/chat/summarize", async (req, res) => {
    try {
      const { emailIds } = req.body;
      
      const emails = await Promise.all(
        emailIds.map((id: number) => storage.getEmailById(id))
      );

      const validEmails = emails.filter(email => email !== null);
      
      const summary = await summarizeConversation(
        validEmails.map(email => ({
          subject: email!.subject,
          content: email!.content,
          fromEmail: email!.fromEmail
        }))
      );

      res.json({ summary });
    } catch (error) {
      res.status(500).json({ message: "Failed to summarize conversation" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const stats = await storage.getDashboardStats(userId as string);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
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
  */

    return httpServer;
}
