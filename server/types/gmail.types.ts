import { gmail_v1 } from 'googleapis';

export interface EmailMessage extends gmail_v1.Schema$Message {
  // Additional fields we might want to add
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

export interface EmailListOptions {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  q?: string;
}

export interface EmailListResponse {
  emails: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailServiceError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

export interface EmailModifyAction {
  action: 'markAsRead' | 'markAsUnread' | 'moveToTrash' | 'addLabels' | 'removeLabels';
  labelIds?: string[]; // For addLabels/removeLabels actions
}

export interface EmailQueryOptions extends EmailListOptions {
  userId: string;
  accountId?: string;
} 