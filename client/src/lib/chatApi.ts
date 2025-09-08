import { apiRequest } from './api';

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

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: T;
    error?: string;
}

class ChatApi {
    /**
     * Create a new chat session
     */
    async createSession(): Promise<ApiResponse<ChatSession>> {
        try {
            const response = await apiRequest('POST', '/api/chat/session');
            return response;
        } catch (error) {
            console.error('Error creating chat session:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create chat session'
            };
        }
    }

    /**
     * Send a message and get AI response
     */
    async sendMessage(message: string, sessionId?: string): Promise<ApiResponse<ChatMessage>> {
        try {
            const response = await apiRequest('POST', '/api/chat/message', {
                message,
                sessionId
            });
            return response;
        } catch (error) {
            console.error('Error sending chat message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send message'
            };
        }
    }

    /**
     * Get welcome message for the user
     */
    async getWelcomeMessage(): Promise<ApiResponse<ChatMessage>> {
        try {
            const response = await apiRequest('GET', '/api/chat/welcome');
            return response;
        } catch (error) {
            console.error('Error getting welcome message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get welcome message'
            };
        }
    }

    /**
     * Get user's connected email accounts
     */
    async getEmailAccounts(): Promise<ApiResponse<{ accounts: any[]; hasConnectedEmails: boolean }>> {
        try {
            const response = await apiRequest('GET', '/api/chat/email-accounts');
            return response;
        } catch (error) {
            console.error('Error getting email accounts:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get email accounts'
            };
        }
    }

    /**
     * Update auto-draft settings for a specific email account
     */
    async updateAutoDraftSettings(
        accountId: string,
        settings: {
            tone?: 'professional' | 'casual' | 'friendly' | 'formal';
            customInstructions?: string;
        }
    ): Promise<ApiResponse<any>> {
        try {
            const response = await apiRequest('PUT', '/api/chat/auto-draft-settings', {
                accountId,
                settings
            });
            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('Error updating auto-draft settings:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update auto-draft settings'
            };
        }
    }

    /**
     * Update auto-draft enabled state for a specific email account
     */
    async updateAutoDraftEnabled(
        accountId: string,
        enabled: boolean
    ): Promise<ApiResponse<any>> {
        try {
            const response = await apiRequest('PUT', '/api/chat/auto-draft-enabled', {
                accountId,
                enabled
            });
            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('Error updating auto-draft enabled state:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update auto-draft enabled state'
            };
        }
    }
}

export const chatApi = new ChatApi();