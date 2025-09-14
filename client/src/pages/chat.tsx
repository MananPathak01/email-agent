import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuth } from "firebase/auth";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import EmailProviderSelectionDialog from "@/components/dialogs/EmailProviderSelectionDialog";
import AutoDraftSettingsDialog from "@/components/dialogs/AutoDraftSettingsDialog";
import { chatApi } from "@/lib/chatApi";
import { toast } from "sonner";
import {
    Plus,
    X,
    Menu,
    Send,
    User,
    Bot,
    History,
    Loader2,
    Mail,
    AlertCircle,
    Settings
} from "lucide-react";

interface Conversation {
    id: string;
    title: string;
    isActive?: boolean;
}

interface GmailAccount {
    id: string;
    email: string;
    isActive: boolean;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    lastConnectedAt: string;
    autoDraftEnabled?: boolean;
}

export default function ChatPage() {
    const { user } = useAuth();
    const auth = getAuth();
    const queryClient = useQueryClient();

    const {
        messages,
        isLoading,
        isSending,
        error,
        sendMessage,
        clearMessages,
        refreshEmailStatus
    } = useChat();

    const [isConversationsPanelOpen, setIsConversationsPanelOpen] = useState(true);
    const [autoDraftEnabled, setAutoDraftEnabled] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [showProviderDialog, setShowProviderDialog] = useState(false);
    const [isConnectingGmail, setIsConnectingGmail] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [isTogglingAutoDraft, setIsTogglingAutoDraft] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch connected Gmail accounts using the same approach as sidebar
    const {
        data: gmailAccounts = [],
        isLoading: isLoadingAccounts,
        error: accountsError,
        refetch: refetchAccounts
    } = useQuery<GmailAccount[]>({
        queryKey: ['gmailAccounts'],
        queryFn: async (): Promise<GmailAccount[]> => {
            if (!user || !auth.currentUser) return [];

            const idToken = await auth.currentUser.getIdToken();
            const baseURL = 'https://email-agent-1-4duk.onrender.com';
            const response = await fetch(baseURL + '/api/gmail/accounts', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Failed to fetch accounts:', errorData);
                throw new Error(`Failed to fetch accounts: ${response.status} ${errorData}`);
            }

            return response.json();
        },
        enabled: !!user && !!auth.currentUser,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        meta: {
            errorMessage: 'Failed to load connected accounts'
        }
    });

    // Check if user has connected emails
    const hasConnectedEmails = gmailAccounts.length > 0;

    // Load auto-draft state from database when accounts change
    useEffect(() => {
        if (gmailAccounts.length > 0) {
            // Check if any account has auto-draft enabled
            const anyEnabled = gmailAccounts.some(account => account.autoDraftEnabled);
            setAutoDraftEnabled(anyEnabled);
        } else {
            setAutoDraftEnabled(false);
        }
    }, [gmailAccounts]);

    // Gmail OAuth mutation using the same approach as sidebar
    const connectGmailMutation = useMutation({
        mutationFn: async (): Promise<void> => {
            if (!user) throw new Error('User not authenticated');

            // Get the Firebase auth instance and current user
            const auth = getAuth();
            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error('No authenticated Firebase user found');
            }

            // Get the auth URL
            const idToken = await currentUser.getIdToken();
            const baseURL = 'https://email-agent-1-4duk.onrender.com';
            const response = await fetch(baseURL + '/api/gmail/auth', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to get auth URL: ${response.status} ${errorData}`);
            }

            const { authUrl } = await response.json();

            if (!authUrl) {
                throw new Error('No auth URL received from server');
            }

            // Open OAuth popup with better dimensions and positioning
            const popup = window.open(
                authUrl,
                'gmail-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes,left=' +
                (window.screen.width / 2 - 250) + ',top=' + (window.screen.height / 2 - 300)
            );

            return new Promise((resolve, reject) => {
                // Listen for messages from the popup
                const messageListener = (event: MessageEvent) => {
                    console.log('📨 Received message:', event.data);
                    // Allow messages from both frontend and backend origins
                    const allowedOrigins = [
                        window.location.origin, // http://localhost:5173 (frontend)
                        'http://localhost:5000', // backend server
                        'http://localhost:3001'  // alternative backend port
                    ];

                    if (!allowedOrigins.includes(event.origin)) {
                        console.log('❌ Message origin not allowed:', event.origin, 'allowed:', allowedOrigins);
                        return;
                    }

                    if (event.data.type === 'oauth_success') {
                        window.removeEventListener('message', messageListener);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        // Extract the Gmail email address from the callback data
                        const gmailEmail = event.data.data?.email;
                        if (gmailEmail) {
                            toast.success('Gmail account connected successfully!');
                            // Refetch accounts to update the UI
                            refetchAccounts();
                            // Close the dialog
                            setShowProviderDialog(false);
                        }
                        resolve();
                    } else if (event.data.type === 'oauth_error') {
                        window.removeEventListener('message', messageListener);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        const errorMessage = event.data.error || 'OAuth authentication failed';
                        toast.error(`Gmail connection failed: ${errorMessage}`);
                        reject(new Error(errorMessage));
                    }
                };

                // Add the message listener
                window.addEventListener('message', messageListener);

                // Check if popup was closed manually
                const checkClosed = setInterval(() => {
                    if (popup && popup.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageListener);
                        reject(new Error('OAuth popup was closed'));
                    }
                }, 1000);

                // Clean up after 5 minutes
                setTimeout(() => {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageListener);
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                    reject(new Error('OAuth timeout'));
                }, 300000); // 5 minutes
            });
        },
        onSuccess: () => {
            console.log('✅ Gmail connection successful');
        },
        onError: (error) => {
            console.error('❌ Gmail connection failed:', error);
            toast.error(`Failed to connect Gmail: ${error.message}`);
        }
    });

    // Empty state - will be populated with real data
    const conversations: Conversation[] = [];

    const handleNewEmailDraft = (recipient: string) => {
        setMessageInput(`Write me a new email to ${recipient}`);
        // Focus the textarea
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [messageInput]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isSending) return;

        // If no email connected, show message instead of sending
        if (!hasConnectedEmails) {
            toast.error("Please connect an email account to start chatting with the AI assistant.");
            return;
        }

        const message = messageInput.trim();
        setMessageInput("");

        await sendMessage(message);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleConnectGmail = async () => {
        try {
            await connectGmailMutation.mutateAsync();
        } catch (error) {
            // Error handling is done in the mutation
            console.error('Connect Gmail error:', error);
        }
    };

    const handleConnectEmail = () => {
        setShowProviderDialog(true);
    };

    const handleProviderDialogClose = () => {
        setShowProviderDialog(false);
    };

    const handleAutoDraftToggle = async (enabled: boolean) => {
        if (!hasConnectedEmails || isTogglingAutoDraft) return;

        setIsTogglingAutoDraft(true);
        try {
            // Update all connected email accounts
            const updatePromises = gmailAccounts.map(account =>
                chatApi.updateAutoDraftEnabled(account.id, enabled)
            );

            const results = await Promise.all(updatePromises);
            const allSuccessful = results.every(result => result.success);

            if (allSuccessful) {
                setAutoDraftEnabled(enabled);
                toast.success(`Auto-draft replies ${enabled ? 'enabled' : 'disabled'} successfully!`);
            } else {
                toast.error('Failed to update some accounts. Please try again.');
            }
        } catch (error) {
            console.error('Error updating auto-draft state:', error);
            toast.error('Failed to update auto-draft state. Please try again.');
        } finally {
            setIsTogglingAutoDraft(false);
        }
    };

    // Determine if we should show the input in the middle or bottom
    const hasConversation = messages.length > 1; // More than just the welcome message
    const showMiddleInput = !hasConversation && !isLoading;

    return (
        <div className="relative flex size-full min-h-screen flex-col bg-gray-100" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
            {/* Header */}
            <Header currentTab="chat" />

            {/* Main Content */}
            <main className="flex flex-1">
                {/* Chat Area */}
                <div className="flex flex-1 flex-col">
                    {/* Auto-Draft Header */}
                    <div className="border-b border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold text-gray-800">Auto Draft Replies</h3>
                                <button
                                    type="button"
                                    className={`${autoDraftEnabled ? 'bg-gray-800' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 ${!hasConnectedEmails || isTogglingAutoDraft
                                        ? 'cursor-not-allowed opacity-50 hover:bg-gray-300 hover:opacity-60'
                                        : 'cursor-pointer hover:bg-gray-700'
                                        }`}
                                    onClick={() => {
                                        if (hasConnectedEmails && !isTogglingAutoDraft) {
                                            handleAutoDraftToggle(!autoDraftEnabled);
                                        }
                                    }}
                                    role="switch"
                                    aria-checked={autoDraftEnabled}
                                    disabled={!hasConnectedEmails || isTogglingAutoDraft}
                                    title={!hasConnectedEmails ? "Connect an email account to enable auto-draft replies" : isTogglingAutoDraft ? "Updating..." : "Toggle auto-draft replies"}
                                >
                                    <span className="sr-only">Auto-draft emails</span>
                                    <span
                                        className={`${autoDraftEnabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                                {hasConnectedEmails && autoDraftEnabled && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSettingsDialog(true)}
                                        className="ml-2 h-8 w-8 p-0"
                                        title="Customize auto-draft settings"
                                        disabled={isTogglingAutoDraft}
                                    >
                                        {isTogglingAutoDraft ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                                        ) : (
                                            <Settings className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!hasConnectedEmails && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleConnectEmail}
                                        className="inline-flex items-center gap-2"
                                    >
                                        <Mail className="h-4 w-4" />
                                        <span>Connect Email</span>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="inline-flex md:hidden items-center gap-2"
                                >
                                    <History className="h-4 w-4" />
                                    <span>History</span>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {hasConnectedEmails
                                    ? "AI will help you draft emails, manage your inbox, and automate workflows."
                                    : "Connect your email account to get started with AI-powered email assistance."
                                }
                            </p>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    <span className="text-gray-600">Initializing chat...</span>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="max-w-md mx-auto">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Bot className="h-8 w-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Welcome to MailWise
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        I'm your AI email assistant. I can help you draft emails, manage your inbox, and automate your email workflows.
                                    </p>

                                    {hasConnectedEmails ? (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-gray-700 mb-3">Quick actions:</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setMessageInput("Help me draft a professional email to my team about project updates")}
                                                    className="justify-start text-left"
                                                >
                                                    Draft a team update email
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setMessageInput("Write a follow-up email to a client about our meeting")}
                                                    className="justify-start text-left"
                                                >
                                                    Follow up with a client
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setMessageInput("Create a professional out-of-office reply message")}
                                                    className="justify-start text-left"
                                                >
                                                    Set up out-of-office reply
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setMessageInput("Help me write a thank you email after an interview")}
                                                    className="justify-start text-left"
                                                >
                                                    Thank you email after interview
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                                    <span className="text-sm font-medium text-blue-800">Email Connection Required</span>
                                                </div>
                                                <p className="text-sm text-blue-700 mb-3">
                                                    To get the full experience, connect your email account so I can help you with your actual emails.
                                                </p>
                                                <Button
                                                    onClick={handleConnectEmail}
                                                    className="w-full"
                                                >
                                                    <Mail className="h-4 w-4 mr-2" />
                                                    Connect Email Account
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Messages */
                            <div className="space-y-6">
                                {messages.map((message) => (
                                    <div key={message.id} className="flex items-start gap-4">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {message.type === 'user' ? (
                                                <User className="h-4 w-4" />
                                            ) : (
                                                <Bot className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {message.type === 'user' ? 'You' : 'MailWise AI'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="prose prose-sm max-w-none">
                                                <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                                            </div>

                                            {/* Email Draft Preview */}
                                            {message.emailDraft && (
                                                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Mail className="h-4 w-4 text-gray-500" />
                                                        <span className="text-sm font-medium text-gray-700">Email Draft</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject:</span>
                                                            <p className="text-sm text-gray-800 font-medium">{message.emailDraft.subject}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Body:</span>
                                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.emailDraft.body}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Message Input - Always visible */}
                    {showMiddleInput ? (
                        /* Middle Input for new conversations */
                        <div className="p-6 bg-white border-t border-gray-200">
                            <div className="max-w-2xl mx-auto">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <Textarea
                                            ref={textareaRef}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder={hasConnectedEmails
                                                ? "Ask me to help with your emails..."
                                                : "Connect your email account to get started..."
                                            }
                                            disabled={isSending}
                                            className="min-h-[44px] max-h-32 resize-none rounded-2xl border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || isSending}
                                        size="lg"
                                        className="px-4"
                                    >
                                        {isSending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {!hasConnectedEmails && (
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Connect your email account to start chatting with the AI assistant.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Bottom Input for active conversations */
                        <div className="border-t border-gray-200 bg-white p-4">
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <Textarea
                                        ref={textareaRef}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={hasConnectedEmails
                                            ? "Ask me to help with your emails..."
                                            : "Connect your email account to get started..."
                                        }
                                        disabled={isSending}
                                        className="min-h-[44px] max-h-32 resize-none rounded-2xl border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || isSending}
                                    size="lg"
                                    className="px-4"
                                >
                                    {isSending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {!hasConnectedEmails && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Connect your email account to start chatting with the AI assistant.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Email Provider Selection Dialog */}
            <EmailProviderSelectionDialog
                open={showProviderDialog}
                onOpenChange={handleProviderDialogClose}
                onConnectGmail={handleConnectGmail}
                isConnecting={connectGmailMutation.isPending}
            />

            {/* Auto-Draft Settings Dialog */}
            <AutoDraftSettingsDialog
                open={showSettingsDialog}
                onOpenChange={setShowSettingsDialog}
                connectedEmails={gmailAccounts}
            />
        </div>
    );
}