import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuth } from 'firebase/auth';

export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  labels: string[];
  provider: string;
  analysis?: {
    intent: string;
    urgency: string;
    sentiment: string;
    requiresResponse: boolean;
    confidence: number;
  };
  hasDraft?: boolean;
  draftStatus?: string;
}

export interface GmailDraft {
  content: string;
  confidence: number;
  workflowUsed?: string;
  reasoning: string;
}

export function useGmailEmails(limit = 10, onlyNewEmails = true) {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEmails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/gmail/emails?limit=${limit}&onlyNew=${onlyNewEmails}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched Gmail emails:', data);
      
      if (data.emails) {
        setEmails(data.emails);
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error('Error fetching Gmail emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [user, limit]);

  return {
    emails,
    loading,
    error,
    refetch: fetchEmails,
  };
}

export function useGmailDraft(emailId: string | null) {
  const [draft, setDraft] = useState<GmailDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDraft = async () => {
    if (!user || !emailId) return;

    try {
      setLoading(true);
      setError(null);

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/gmail/emails/${emailId}/draft`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setDraft(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDraft(data);
    } catch (err) {
      console.error('Error fetching draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch draft');
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async () => {
    if (!user || !emailId) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/gmail/emails/${emailId}/draft/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve draft');
      }

      return await response.json();
    } catch (err) {
      console.error('Error approving draft:', err);
      throw err;
    }
  };

  const rejectDraft = async (feedback?: string) => {
    if (!user || !emailId) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/gmail/emails/${emailId}/draft/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject draft');
      }

      return await response.json();
    } catch (err) {
      console.error('Error rejecting draft:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchDraft();
  }, [user, emailId]);

  return {
    draft,
    loading,
    error,
    approveDraft,
    rejectDraft,
    refetch: fetchDraft,
  };
}

export function useCreateTestDraft() {
  const { user } = useAuth();
  const auth = getAuth();

  const createTestDraft = async (to?: string, subject?: string, content?: string) => {
    if (!user || !auth.currentUser) throw new Error('User not authenticated');

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/gmail/create-test-draft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to || 'test@example.com',
          subject: subject || 'Test Draft from AI Email Agent',
          content: content || 'This is a test draft created by the AI Email Agent.\n\nBest regards,\nYour AI Assistant'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create test draft');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating test draft:', error);
      throw error;
    }
  };

  return { createTestDraft };
}