import { useState, useEffect } from 'react';
import { mockApi, mockWebSocket } from '../lib/mockApi';
import {
  User,
  ConnectedAccount,
  EmailThread,
  DraftResponse,
  WorkflowTemplate,
  ChatMessage,
  AnalyticsData,
  ProcessingJob,
  SystemStatus,
  WebSocketEvent
} from '../types';

// Custom hook for user data
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await mockApi.getUser();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          setError(response.error || 'Failed to fetch user');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error, refetch: () => setLoading(true) };
}

// Custom hook for connected accounts
export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await mockApi.getConnectedAccounts();
        if (response.success && response.data) {
          setAccounts(response.data);
        } else {
          setError(response.error || 'Failed to fetch accounts');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const connectAccount = async (provider: 'gmail' | 'outlook') => {
    try {
      const response = await mockApi.connectAccount(provider);
      if (response.success && response.data) {
        // In a real app, this would redirect to OAuth
        console.log('Redirect to:', response.data.authUrl);
        // Simulate successful connection after delay
        setTimeout(() => {
          setAccounts(prev => [...prev, {
            id: `account_${provider}_${Date.now()}`,
            provider,
            email: `user@${provider === 'gmail' ? 'gmail.com' : 'outlook.com'}`,
            displayName: `New ${provider} Account`,
            isActive: true,
            lastSyncAt: new Date(),
            learningStatus: 'pending',
            emailCount: 0,
            processingStats: {
              totalProcessed: 0,
              draftsGenerated: 0,
              draftsAccepted: 0,
              averageConfidence: 0
            }
          }]);
        }, 2000);
      }
    } catch (err) {
      setError('Failed to connect account');
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const response = await mockApi.disconnectAccount(accountId);
      if (response.success) {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      }
    } catch (err) {
      setError('Failed to disconnect account');
    }
  };

  return { accounts, loading, error, connectAccount, disconnectAccount };
}

// Custom hook for email threads
export function useEmailThreads(page = 1, pageSize = 10) {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const response = await mockApi.getEmailThreads(page, pageSize);
        if (response.success && response.data) {
          setThreads(response.data.items);
          setHasMore(response.data.hasMore);
          setTotal(response.data.total);
        } else {
          setError(response.error || 'Failed to fetch threads');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [page, pageSize]);

  return { threads, loading, error, hasMore, total };
}

// Custom hook for draft responses
export function useDraftResponse(emailId: string | null) {
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId) {
      setDraft(null);
      return;
    }

    const fetchDraft = async () => {
      setLoading(true);
      try {
        const response = await mockApi.getDraftResponse(emailId);
        if (response.success && response.data) {
          setDraft(response.data);
        } else {
          setError(response.error || 'Failed to fetch draft');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
  }, [emailId]);

  const approveDraft = async (draftId: string) => {
    try {
      const response = await mockApi.approveDraft(draftId);
      if (response.success) {
        setDraft(prev => prev ? { ...prev, status: 'approved' } : null);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to approve draft');
      return false;
    }
  };

  const rejectDraft = async (draftId: string, feedback?: string) => {
    try {
      const response = await mockApi.rejectDraft(draftId, feedback);
      if (response.success) {
        setDraft(prev => prev ? { ...prev, status: 'rejected' } : null);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to reject draft');
      return false;
    }
  };

  const updateDraft = async (draftId: string, content: string) => {
    try {
      const response = await mockApi.updateDraft(draftId, content);
      if (response.success && response.data) {
        setDraft(response.data);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to update draft');
      return false;
    }
  };

  return { draft, loading, error, approveDraft, rejectDraft, updateDraft };
}

// Custom hook for workflow templates
export function useWorkflowTemplates() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await mockApi.getWorkflowTemplates();
        if (response.success && response.data) {
          setWorkflows(response.data);
        } else {
          setError(response.error || 'Failed to fetch workflows');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const updateWorkflow = async (workflowId: string, updates: Partial<WorkflowTemplate>) => {
    try {
      const response = await mockApi.updateWorkflowTemplate(workflowId, updates);
      if (response.success && response.data) {
        setWorkflows(prev => prev.map(w => w.id === workflowId ? response.data! : w));
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to update workflow');
      return false;
    }
  };

  const createWorkflow = async (workflow: Omit<WorkflowTemplate, 'id' | 'usageCount' | 'lastUsed'>) => {
    try {
      const response = await mockApi.createWorkflowTemplate(workflow);
      if (response.success && response.data) {
        setWorkflows(prev => [...prev, response.data!]);
        return response.data;
      }
      return null;
    } catch (err) {
      setError('Failed to create workflow');
      return null;
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await mockApi.deleteWorkflowTemplate(workflowId);
      if (response.success) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to delete workflow');
      return false;
    }
  };

  return { workflows, loading, error, updateWorkflow, createWorkflow, deleteWorkflow };
}

// Custom hook for chat
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await mockApi.getChatHistory();
        if (response.success && response.data) {
          setMessages(response.data);
        } else {
          setError(response.error || 'Failed to fetch chat history');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  const sendMessage = async (content: string) => {
    setSending(true);
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await mockApi.sendChatMessage(content);
      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!]);
      } else {
        setError(response.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSending(false);
    }
  };

  return { messages, loading, sending, error, sendMessage };
}

// Custom hook for analytics
export function useAnalytics(timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week') {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await mockApi.getAnalytics(timeframe);
        if (response.success && response.data) {
          setAnalytics(response.data);
        } else {
          setError(response.error || 'Failed to fetch analytics');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeframe]);

  return { analytics, loading, error };
}

// Custom hook for system status and real-time updates
export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await mockApi.getSystemStatus();
        if (response.success && response.data) {
          setStatus(response.data);
        } else {
          setError(response.error || 'Failed to fetch status');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Set up WebSocket connection for real-time updates
    mockWebSocket.connect();

    const handleEmailReceived = (event: WebSocketEvent) => {
      console.log('New email received:', event.data);
      // In a real app, you'd update the email threads here
    };

    const handleDraftGenerated = (event: WebSocketEvent) => {
      console.log('Draft generated:', event.data);
      // In a real app, you'd update the draft status here
    };

    mockWebSocket.on('email_received', handleEmailReceived);
    mockWebSocket.on('draft_generated', handleDraftGenerated);

    return () => {
      mockWebSocket.off('email_received', handleEmailReceived);
      mockWebSocket.off('draft_generated', handleDraftGenerated);
      mockWebSocket.disconnect();
    };
  }, []);

  return { status, loading, error };
}