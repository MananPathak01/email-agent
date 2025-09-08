import Groq from 'groq-sdk';
import { adminDb } from '../firebase-admin.js';
import { CommunicationProfileService } from './communication-profile.service.js';
import { emailAccountsService } from './emailAccounts.service.js';

export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    emailDraft?: {
        subject: string;
        body: string;
    };
    context?: {
        emailAccountId?: string;
        hasConnectedEmails: boolean;
        userProfile?: any;
    };
}

export interface ChatSession {
    id: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
}

export class ChatService {
    private groq: Groq;
    private communicationProfileService: CommunicationProfileService;
    private emailAccountsService = emailAccountsService;

    constructor() {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is required');
        }

        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        this.communicationProfileService = new CommunicationProfileService();
        this.emailAccountsService = emailAccountsService;
    }

    /**
     * Create a new chat session for a user
     */
    async createChatSession(userId: string): Promise<ChatSession> {
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session: ChatSession = {
            id: sessionId,
            userId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };

        // Store in memory for now (sessions are not persisted)
        // In production, you might want to store in Redis or database
        return session;
    }

    /**
     * Get user's connected email accounts
     */
    async getUserEmailAccounts(userId: string) {
        try {
            const accounts = await this.emailAccountsService.listEmailAccounts(userId);
            // Debug logging removed for cleaner output
            // Filter only active accounts
            const activeAccounts = accounts.filter(account => account.isActive);
            // Debug logging removed for cleaner output
            return activeAccounts;
        } catch (error) {
            console.error('Error fetching email accounts:', error);
            return [];
        }
    }

    /**
     * Process a user message and generate AI response
     */
    async processMessage(
        userId: string,
        message: string,
        sessionId?: string
    ): Promise<ChatMessage> {
        try {
            // Get user's email accounts to understand context
            const emailAccounts = await this.getUserEmailAccounts(userId);
            const hasConnectedEmails = emailAccounts.length > 0;

            // Create system prompt based on user's context
            const systemPrompt = this.createSystemPrompt(hasConnectedEmails, emailAccounts);

            // Generate AI response using Groq
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.7,
                max_tokens: 1000,
                stream: false
            });

            const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error processing your request.';

            // Check if the response should include email draft generation
            const emailDraft = this.extractEmailDraft(aiResponse, message);

            const assistantMessage: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                emailDraft,
                context: {
                    hasConnectedEmails,
                    emailAccountId: emailAccounts[0]?.id
                }
            };

            return assistantMessage;

        } catch (error) {
            console.error('Error processing chat message:', error);

            // Return error message
            return {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please try again.',
                timestamp: new Date(),
                context: {
                    hasConnectedEmails: false
                }
            };
        }
    }

    /**
     * Create system prompt based on user's email connection status
     */
    private createSystemPrompt(hasConnectedEmails: boolean, emailAccounts: any[]): string {
        if (!hasConnectedEmails) {
            return `You are MailWise, an AI email assistant. The user has not connected any email accounts yet.

Your role:
- Help them understand the benefits of connecting their email
- Guide them through the email connection process
- Explain how you can help with email management once connected
- Be friendly, helpful, and encouraging

Key points to mention:
- You can analyze their email patterns and writing style
- Generate contextual email drafts
- Help manage email workflows
- Provide insights about their communication patterns

Always encourage them to connect their email to get started with the full experience.`;
        }

        const accountEmails = emailAccounts.map(acc => acc.email).join(', ');

        return `You are MailWise, an AI email assistant. The user has connected the following email account(s): ${accountEmails}

Your capabilities:
- Analyze email patterns and communication style
- Generate contextual email drafts that match their writing style
- Help manage email workflows and responses
- Provide insights about their email communication
- Suggest improvements to their email management

When helping with emails:
- Always consider their communication style and preferences
- Generate drafts that sound natural and match their tone
- Provide multiple response options when appropriate
- Include relevant context and attachments when needed

Be helpful, professional, and focus on making their email management more efficient.`;
    }

    /**
     * Extract email draft from AI response if applicable
     */
    private extractEmailDraft(aiResponse: string, userMessage: string): { subject: string; body: string } | undefined {
        // Simple heuristic to detect if user is asking for email generation
        const emailKeywords = ['email', 'draft', 'reply', 'respond', 'send', 'write'];
        const hasEmailIntent = emailKeywords.some(keyword =>
            userMessage.toLowerCase().includes(keyword)
        );

        if (!hasEmailIntent) {
            return undefined;
        }

        // Try to extract subject and body from AI response
        // This is a simple implementation - you might want to make it more sophisticated
        const subjectMatch = aiResponse.match(/Subject:\s*(.+)/i);
        const bodyMatch = aiResponse.match(/Body:\s*([\s\S]+)/i);

        if (subjectMatch && bodyMatch) {
            return {
                subject: subjectMatch[1].trim(),
                body: bodyMatch[1].trim()
            };
        }

        // If no structured format, try to generate a simple draft
        if (hasEmailIntent) {
            return {
                subject: 'Draft Email',
                body: aiResponse
            };
        }

        return undefined;
    }

    /**
     * Get welcome message for new users
     */
    async getWelcomeMessage(userId: string): Promise<ChatMessage> {
        const emailAccounts = await this.getUserEmailAccounts(userId);
        const hasConnectedEmails = emailAccounts.length > 0;

        // Debug logging removed for cleaner output

        if (!hasConnectedEmails) {
            return {
                id: `welcome_${Date.now()}`,
                type: 'assistant',
                content: `Welcome to MailWise! 👋

I'm your AI email assistant, and I'm here to help you manage your emails more efficiently. To get started, you'll need to connect your email account.

Here's what I can help you with once you're connected:
• 📧 Generate contextual email drafts that match your writing style
• 🧠 Analyze your communication patterns and preferences  
• ⚡ Create quick responses for common email types
• 📊 Provide insights about your email habits
• 🎯 Help manage email workflows and follow-ups

Ready to connect your email? Just let me know and I'll guide you through the process!`,
                timestamp: new Date(),
                context: {
                    hasConnectedEmails: false
                }
            };
        }

        const accountEmails = emailAccounts.map(acc => acc.email).join(', ');

        return {
            id: `welcome_${Date.now()}`,
            type: 'assistant',
            content: `Welcome back! 👋

I can see you have ${emailAccounts.length} email account(s) connected: ${accountEmails}

I'm ready to help you with:
• 📧 Generating email drafts that match your style
• 🧠 Analyzing your communication patterns
• ⚡ Creating quick responses
• 📊 Providing email insights
• 🎯 Managing your email workflows

What would you like to work on today? You can ask me to:
- "Write a reply to [email topic]"
- "Help me draft an email to [person]"
- "Analyze my recent email patterns"
- "Generate a follow-up email"

How can I assist you?`,
            timestamp: new Date(),
            context: {
                hasConnectedEmails: true,
                emailAccountId: emailAccounts[0]?.id
            }
        };
    }
}