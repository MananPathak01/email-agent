import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { gmailApi, type EmailListOptions, type GmailAccount, type EmailMessage, type GmailLabel, type EmailListResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useGmail() {
  const { user, loading: isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  // Auth state tracking removed from logs

  // Fetch connected accounts
  const { 
    data: accounts = [], 
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useQuery<GmailAccount[], Error>({
    queryKey: ['gmail-accounts'],
    queryFn: () => {
      // Fetching accounts
      if (!user) {
        throw new Error('User not authenticated');
      }
      return gmailApi.getAccounts();
    },
    enabled: !isLoadingAuth, // Enable as soon as we know auth state
    retry: 1, // Only retry once
  });

  // Log any errors
  if (accountsError) {
    console.error('Accounts query error:', accountsError);
    toast.error(`Failed to fetch email accounts: ${accountsError.message}`);
  }

  // Fetch emails with options
  const useEmails = (options: EmailListOptions = {}) => {
    return useQuery<EmailListResponse>({
      queryKey: ['gmail-emails', options],
      queryFn: async () => {
        try {
          return await gmailApi.getEmails(options);
        } catch (error) {
          if (error instanceof Error &&
              !error.message.includes('Email service is not properly configured') &&
              !error.message.includes('Failed to initialize Gmail service')) {
            toast.error(`Failed to load emails: ${error.message}`);
          }
          return {
            emails: [],
            resultSizeEstimate: 0,
            error: true,
            message: error instanceof Error ? error.message : 'Failed to fetch emails'
          };
        }
      },
      enabled: !!user && !isLoadingAuth,
      retry: 1,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 30 * 1000, // 30 seconds background refresh
      refetchIntervalInBackground: true, // Continue refreshing even when tab is not active
    });
  };

  // Remove the prefetch useEffect since it's now in AuthContext

  // Fetch labels
  const useLabels = (accountId?: string) => {
    return useQuery<GmailLabel[]>({
      queryKey: ['gmail-labels', accountId],
      queryFn: async () => {
        try {
          return await gmailApi.getLabels(accountId);
        } catch (error) {
          if (error instanceof Error &&
              !error.message.includes('Failed to initialize Gmail service') &&
              !error.message.includes('Invalid response format')) {
            toast.error(`Failed to load labels: ${error.message}`);
          }
          return [];
        }
      },
      enabled: !!user && !isLoadingAuth,
      retry: 1,
      retryDelay: 1000,
      initialData: [],
    });
  };

  // Fetch single email for preview
  const useEmail = (messageId: string, accountId?: string) => {
    return useQuery({
      queryKey: ['gmail-email', messageId, accountId],
      queryFn: async () => {
        if (!messageId) return null;
        return gmailApi.getEmail(messageId, accountId);
      },
      enabled: !!messageId && !!user && !isLoadingAuth,
      retry: 1,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Remove useEmail and related code
  // Remove markAsRead, markAsUnread, moveToTrash and related code
  return {
    accounts,
    isLoadingAccounts,
    accountsError,
    useEmails,
    useLabels,
    useEmail,
  };
} 