import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, doc, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { EmailMessage } from '../lib/api';
import { auth } from '../firebase';

interface UseFirebaseEmailsOptions {
  maxResults?: number;
  labelIds?: string[];
  q?: string;
  accountId?: string;
}

interface UseFirebaseEmailsReturn {
  emails: EmailMessage[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  syncStatus: 'success' | 'error' | 'pending' | 'unknown';
}

export function useFirebaseEmails(options: UseFirebaseEmailsOptions = {}): UseFirebaseEmailsReturn {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | 'pending' | 'unknown'>('unknown');

  const { maxResults = 50, accountId } = options;

  useEffect(() => {
    if (!user?.uid) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for emails
    const emailsRef = collection(db, 'users', user.uid, 'emails');
    let q = query(
      emailsRef,
      orderBy('internalDate', 'desc'),
      limit(maxResults)
    );

    // Add account filter if specified
    if (accountId) {
      q = query(q, where('accountId', '==', accountId));
    }

    // Add label filter if specified
    if (options.labelIds && options.labelIds.length > 0) {
      // Note: Firebase doesn't support array-contains-any for labelIds
      // We'll need to handle this differently or store labels differently
      console.warn('Label filtering not yet implemented for Firebase emails');
    }

    // Add search query if specified
    if (options.q) {
      // Note: Firebase doesn't support full-text search
      // We'll need to implement this differently or use a search service
      console.warn('Search query not yet implemented for Firebase emails');
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emailData: EmailMessage[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          emailData.push({
            id: doc.id,
            threadId: data.threadId,
            snippet: data.snippet,
            internalDate: data.internalDate,
            labelIds: data.labelIds || [],
            historyId: data.historyId,
            sizeEstimate: data.sizeEstimate,
            payload: data.payload,
            parsedPayload: data.parsedPayload
          });
        });

        setEmails(emailData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching emails from Firebase:', err);
        setError('Failed to fetch emails from cache');
        setLoading(false);
      }
    );

    // Also fetch user sync status
    const userDocRef = doc(db, 'users', user.uid);
    
    const userUnsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          setLastSync(userData?.last_synced?.toDate() || null);
          setSyncStatus(userData?.sync_status || 'unknown');
        }
      },
      (err: any) => {
        console.error('Error fetching user sync status:', err);
      }
    );

    return () => {
      unsubscribe();
      userUnsubscribe();
    };
  }, [user?.uid, maxResults, accountId, options.labelIds, options.q]);

  return {
    emails,
    loading,
    error,
    lastSync,
    syncStatus
  };
}

/**
 * Hook to request a manual sync
 */
export function useManualSync() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSync = async () => {
    if (!user) return;

    setSyncing(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No auth token available');
      const response = await fetch('/api/smart-sync/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Manual sync triggered:', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Manual sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return {
    triggerSync,
    syncing,
    error
  };
}

/**
 * Hook to get sync metrics
 */
export function useSyncMetrics(limit: number = 20) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No auth token available');
      const response = await fetch(`/api/smart-sync/metrics?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const result = await response.json();
      setMetrics(result.metrics || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch sync metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user?.uid, limit]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
} 