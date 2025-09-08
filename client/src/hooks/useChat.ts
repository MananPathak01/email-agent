import { useState, useEffect, useCallback } from 'react';
import { chatApi, ChatMessage, ChatSession } from '@/lib/chatApi';
import { useAuth } from '@/contexts/AuthContext';

export interface UseChatReturn {
    // State
    messages: ChatMessage[];
    session: ChatSession | null;
    isLoading: boolean;
    isSending: boolean;
    error: string | null;
    hasConnectedEmails: boolean;

    // Actions
    sendMessage: (message: string) => Promise<void>;
    clearMessages: () => void;
    initializeChat: () => Promise<void>;
    refreshEmailStatus: () => Promise<void>;
}

export function useChat(): UseChatReturn {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [session, setSession] = useState<ChatSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasConnectedEmails, setHasConnectedEmails] = useState(false);

    /**
     * Initialize chat with welcome message
     */
    const initializeChat = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            // Get welcome message
            const welcomeResponse = await chatApi.getWelcomeMessage();
            if (welcomeResponse.success && welcomeResponse.message) {
                setMessages([welcomeResponse.message]);
                setHasConnectedEmails(welcomeResponse.message.context?.hasConnectedEmails || false);
            } else {
                // Don't show error, just set empty state
                setMessages([]);
                setHasConnectedEmails(false);
            }
        } catch (err) {
            // Don't show error, just set empty state
            setMessages([]);
            setHasConnectedEmails(false);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    /**
     * Send a message and get AI response
     */
    const sendMessage = useCallback(async (message: string) => {
        if (!user || !message.trim()) return;

        setIsSending(true);
        setError(null);

        // Add user message immediately
        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: message.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            // Send message to API
            const response = await chatApi.sendMessage(message.trim(), session?.id);

            if (response.success && response.message) {
                setMessages(prev => [...prev, response.message!]);

                // Update email connection status if provided
                if (response.message.context?.hasConnectedEmails !== undefined) {
                    setHasConnectedEmails(response.message.context.hasConnectedEmails);
                }
            } else {
                setError(response.error || 'Failed to send message');

                // Add error message
                const errorMessage: ChatMessage = {
                    id: `error_${Date.now()}`,
                    type: 'assistant',
                    content: 'I apologize, but I encountered an error processing your request. Please try again.',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');

            // Add error message
            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                type: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    }, [user, session?.id]);

    /**
     * Clear all messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    /**
     * Refresh email connection status
     */
    const refreshEmailStatus = useCallback(async () => {
        if (!user) return;

        try {
            const response = await chatApi.getEmailAccounts();
            if (response.success && response.data) {
                setHasConnectedEmails(response.data.hasConnectedEmails);
            }
        } catch (err) {
            console.error('Error refreshing email status:', err);
        }
    }, [user]);

    // Initialize chat when user changes
    useEffect(() => {
        if (user) {
            initializeChat();
        } else {
            setMessages([]);
            setSession(null);
            setHasConnectedEmails(false);
        }
    }, [user, initializeChat]);

    return {
        // State
        messages,
        session,
        isLoading,
        isSending,
        error,
        hasConnectedEmails,

        // Actions
        sendMessage,
        clearMessages,
        initializeChat,
        refreshEmailStatus
    };
}