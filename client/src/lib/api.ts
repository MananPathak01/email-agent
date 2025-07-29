import { apiRequest } from "./queryClient";
import { getAuth } from 'firebase/auth';
import { auth } from '@/firebase';

// Re-export apiRequest for direct use
export { apiRequest };

export interface EmailAnalytics {
  totalEmails: number;
  onboardingEmails: number;
  pendingEmails: number;
  processedToday: number;
  averageResponseTime: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completedToday: number;
  averageCompletionTime: number;
}

export async function syncEmails(userId: number) {
  const response = await apiRequest('POST', '/api/emails/sync', { userId });
  return response.json();
}

export async function sendEmailResponse(emailId: number, customMessage?: string) {
  const response = await apiRequest('POST', `/api/emails/${emailId}/respond`, {
    customMessage,
  });
  return response.json();
}

export async function createTask(taskData: any) {
  const response = await apiRequest('POST', '/api/tasks', taskData);
  return response.json();
}

export async function updateTaskStatus(taskId: number, status: string) {
  const response = await apiRequest('PATCH', `/api/tasks/${taskId}/status`, {
    status,
  });
  return response.json();
}

export async function processAllEmails(userId: number) {
  const response = await apiRequest('POST', '/api/chat/process-emails', {
    userId,
  });
  return response.json();
}

export async function summarizeConversation(emailIds: number[]) {
  const response = await apiRequest('POST', '/api/chat/summarize', {
    emailIds,
  });
  return response.json();
}

export async function getEmailAnalytics(userId: number): Promise<EmailAnalytics> {
  const response = await apiRequest('GET', `/api/analytics/emails?userId=${userId}`);
  return response.json();
}

export async function getTaskAnalytics(userId: number): Promise<TaskAnalytics> {
  const response = await apiRequest('GET', `/api/analytics/tasks?userId=${userId}`);
  return response.json();
}

export async function connectGmailAccount(userId: number) {
  const response = await apiRequest('GET', '/api/auth/gmail');
  const data = await response.json();
  
  // Open OAuth popup
  const popup = window.open(
    data.authUrl,
    'gmail-oauth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  );

  return new Promise((resolve, reject) => {
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        resolve(true);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(checkClosed);
      if (popup && !popup.closed) {
        popup.close();
      }
      reject(new Error('OAuth timeout'));
    }, 300000);
  });
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    mimeType: string;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: Array<{
      partId: string;
      mimeType: string;
      filename: string;
      headers: Array<{
        name: string;
        value: string;
      }>;
      body: {
        data?: string;
        size?: number;
        attachmentId?: string;
      };
    }>;
  };
  sizeEstimate: number;
  parsedPayload?: {
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      attachmentId: string;
    }>;
  };
}

export interface EmailListResponse {
  emails: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
  error?: boolean;
  message?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface EmailListOptions {
  accountId?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  q?: string;
}

export interface GmailAccount {
  id: string;
  email: string;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastConnectedAt: string;
}

// Helper function to get auth token
async function getAuthHeaders() {
  try {
    const token = await auth.currentUser?.getIdToken();
    // Token check removed from logs
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error('Failed to get authentication token');
  }
}

// Gmail API functions
export const gmailApi = {
  // Get connected accounts
  async getAccounts(): Promise<GmailAccount[]> {
    try {
      const headers = await getAuthHeaders();
      // Fetching accounts
      const response = await fetch('/api/gmail/accounts', {
        headers,
      });
      // Accounts response
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch accounts:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText} ${errorText}`);
      }
      const data = await response.json();
      // Accounts data processed
      return data;
    } catch (error) {
      console.error('Error in getAccounts:', error);
      throw error;
    }
  },

  // Get all labels for an account
  async getLabels(accountId?: string): Promise<GmailLabel[]> {
    try {
      const url = new URL('/api/gmail/labels', window.location.origin);
      if (accountId) {
        url.searchParams.append('accountId', accountId);
      }
      // Fetching labels
      const response = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });
      // Labels response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch labels: ${response.status} ${response.statusText} ${errorText}`);
      }
      
      try {
        const data = await response.json();
        // Labels data processed
        
        // Check if there's an error message in the response
        if (data.error === true) {
          throw new Error(data.message || 'Failed to fetch labels');
        }
        
        return data.labels || [];
      } catch (parseError) {
        console.error('Error parsing labels response:', parseError);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error in getLabels:', error);
      throw error;
    }
  },

  // Get emails with options
  async getEmails(options: EmailListOptions = {}): Promise<EmailListResponse> {
    try {
      const url = new URL('/api/gmail/emails', window.location.origin);
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v));
          } else {
            url.searchParams.append(key, value.toString());
          }
        }
      });
      // Fetching emails with options
      const response = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });
      // Emails response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText} ${errorText}`);
      }
      try {
        const data = await response.json();
        // Emails data processed
        // Check for error messages in the response
        if (data.error === true || (typeof data.message === 'string' && data.message.includes('not properly configured'))) {
          throw new Error(data.message || 'Failed to fetch emails');
        }
        return data;
      } catch (parseError) {
        console.error('Error parsing emails response:', parseError);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error in getEmails:', error);
      throw error;
    }
  },

  // Get single email for preview
  async getEmail(messageId: string, accountId?: string): Promise<EmailMessage> {
    if (!messageId) {
      throw new Error('Message ID is required');
    }
    const url = new URL(`/api/gmail/emails/${messageId}`, window.location.origin);
    if (accountId) {
      url.searchParams.append('accountId', accountId);
    }
    const response = await fetch(url.toString(), {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch email: ${response.status} ${response.statusText} ${errorText}`);
    }
    return response.json();
  },
}
