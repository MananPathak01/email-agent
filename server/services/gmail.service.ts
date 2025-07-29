// server/services/gmail.service.ts
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Credentials } from 'google-auth-library';
import { decrypt } from '../utils/crypto';
import { 
  EmailMessage, 
  EmailListOptions, 
  EmailListResponse,
  GmailServiceError as IGmailServiceError 
} from '../types/gmail.types';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const MESSAGE_CACHE_TTL = 600; // 10 minutes
const LABELS_CACHE_TTL = 3600; // 1 hour
const INBOX_CACHE_TTL = 180; // 3 minutes for inbox (more frequent updates)
const PREFETCH_CACHE_TTL = 900; // 15 minutes for prefetched data

interface UserInfo {
  email: string;
  id: string;
  name?: string;
  picture?: string;
}

class GmailServiceError extends Error implements IGmailServiceError {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GmailServiceError';
  }
}

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail;
  private static cache = new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: 120,
    useClones: false,
  });

  // Enhanced caching helper methods
  private async getCachedOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl: number = CACHE_TTL
  ): Promise<T> {
    const cached = GmailService.cache.get<T>(key);
    if (cached) {
      console.log(`[GmailService] Cache hit for key: ${key}`);
      return cached;
    }
    
    console.log(`[GmailService] Cache miss for key: ${key}, fetching...`);
    const data = await fetchFn();
    GmailService.cache.set(key, data, ttl);
    return data;
  }

  private generateEmailCacheKey(options: EmailListOptions): string {
    const {
      maxResults = 20,
      pageToken,
      labelIds = [],
      q = '',
    } = options;
    return `emails:${labelIds.join(',')}:${q}:${pageToken || ''}:${maxResults}`;
  }

  private isInboxQuery(options: EmailListOptions): boolean {
    const { labelIds = [] } = options;
    return labelIds.includes('INBOX') || labelIds.length === 0;
  }

  constructor(accessToken: string, refreshToken: string, expiryDate?: number) {
    try {
      console.log('[GmailService] Initializing with provided tokens');
      
      // Validate required tokens
      if (!accessToken || !refreshToken) {
        throw new Error('Access token and refresh token are required');
      }
      
      // Validate required environment variables
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        console.error('Missing Google API credentials in environment variables.');
        throw new Error('Missing required Google OAuth environment variables');
      }

      // Create OAuth2Client exactly like test script
      this.oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials exactly like test script (no expiry_date)
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Create Gmail client exactly like test script
      this.gmail = google.gmail({ 
        version: 'v1', 
        auth: this.oauth2Client as any
      });
      
      console.log('[GmailService] Initialization complete - using simplified logic');
      
    } catch (error: unknown) {
      console.error('[GmailService] Constructor failed with error:', error);
      console.error('[GmailService] Error stack:', (error as Error)?.stack);
      throw new GmailServiceError(
        'Failed to initialize Gmail service',
        'INITIALIZATION_ERROR',
        500,
        error
      );
    }
  }

  private async verifyTokenInfo(): Promise<void> {
    try {
      // Get token info to verify scopes
      const tokenInfo = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.oauth2Client.credentials.access_token}`);
      
      if (!tokenInfo.ok) {
        throw new Error(`Token info request failed: ${tokenInfo.status} ${tokenInfo.statusText}`);
      }
      
      const tokenData = await tokenInfo.json() as any;
      console.log('[GmailService] Token info:', {
        scope: tokenData.scope,
        expires_in: tokenData.expires_in,
        audience: tokenData.audience
      });
      
      // Check if Gmail scopes are present
      const scopes = tokenData.scope?.split(' ') || [];
      const requiredGmailScopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ];
      
      const hasGmailScopes = requiredGmailScopes.some(scope => scopes.includes(scope));
      if (!hasGmailScopes) {
        console.error('[GmailService] Missing required Gmail scopes. Available scopes:', scopes);
        throw new Error('Token does not have required Gmail scopes');
      }
      
      console.log('[GmailService] Token has required Gmail scopes');
    } catch (error: unknown) {
      console.error('[GmailService] Token verification failed:', error);
      throw error;
    }
  }

  private async ensureValidToken(): Promise<void> {
    try {
      if (!this.oauth2Client.credentials.access_token) {
        throw new Error('No access token available');
      }
      
      // Check if token is expired or about to expire (within 5 minutes)
      const expiryDate = this.oauth2Client.credentials.expiry_date;
      if (expiryDate && Date.now() >= (expiryDate - 5 * 60 * 1000)) {
        console.log('[GmailService] Access token expired or about to expire, refreshing...');
        await this.refreshToken();
      }
    } catch (error) {
      console.error('[GmailService] Token validation failed:', error);
      throw new GmailServiceError(
        'Invalid or expired token',
        'INVALID_TOKEN',
        401,
        error
      );
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      console.log('[GmailService] Refreshing access token...');
      const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(newCredentials);
      console.log('[GmailService] Token refreshed successfully. New expiry:', 
        newCredentials.expiry_date ? new Date(newCredentials.expiry_date).toISOString() : 'not set');
    } catch (error: unknown) {
      console.error('[GmailService] Token refresh failed:', error);
      throw new GmailServiceError(
        'Failed to refresh access token',
        'TOKEN_REFRESH_ERROR',
        401,
        error
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      await this.ensureValidToken();
      const tokenResponse = await this.oauth2Client.getAccessToken();
      if (!tokenResponse.token) {
        throw new GmailServiceError('No token received', 'TOKEN_ERROR');
      }
      return tokenResponse.token;
    } catch (error: unknown) {
      if (error instanceof GmailServiceError) {
        throw error;
      }
      throw new GmailServiceError(
        'Failed to get access token',
        'TOKEN_ERROR',
        401,
        error
      );
    }
  }

  private parseEmailPayload(message: gmail_v1.Schema$Message): EmailMessage {
    try {
      const headers = message.payload?.headers || [];
      
      const getParsedBody = (payload: gmail_v1.Schema$MessagePart): string => {
        if (payload.body?.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf8');
        }
        if (payload.parts) {
          const textPart = payload.parts.find(
            part => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart?.body?.data) {
            return Buffer.from(textPart.body.data, 'base64').toString('utf8');
          }
        }
        return '';
      };

      const attachments = (message.payload?.parts || [])
        .filter(part => part.filename && part.body?.attachmentId)
        .map(part => ({
          filename: part.filename || '',
          mimeType: part.mimeType || '',
          size: part.body?.size || 0,
          attachmentId: part.body?.attachmentId || '',
        }));

      const emailMessage: EmailMessage = {
        ...message,
        parsedPayload: {
          subject: headers.find(h => h.name === 'Subject')?.value || '',
          from: headers.find(h => h.name === 'From')?.value || '',
          to: headers.find(h => h.name === 'To')?.value || '',
          date: headers.find(h => h.name === 'Date')?.value || '',
          body: getParsedBody(message.payload!),
          attachments,
        },
      };

      return emailMessage;
    } catch (error: unknown) {
      console.error('Error parsing email payload:', error);
      return message as EmailMessage;
    }
  }

  async getLabels(): Promise<gmail_v1.Schema$Label[]> {
    const cacheKey = 'labels';
    const cachedLabels = GmailService.cache.get<gmail_v1.Schema$Label[]>(cacheKey);
    
    if (cachedLabels) {
      return cachedLabels;
    }

    try {
      await this.ensureValidToken();
      
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      
      const labels = response.data.labels || [];
      GmailService.cache.set(cacheKey, labels, LABELS_CACHE_TTL);
      
      return labels;
    } catch (error: unknown) {
      const gmailError = error as { code?: number; message?: string };
      throw new GmailServiceError(
        'Failed to fetch labels',
        'LABELS_ERROR',
        gmailError.code,
        error
      );
    }
  }

  async getEmails(options: EmailListOptions = {}): Promise<EmailListResponse> {
    const {
      maxResults = 20,
      pageToken,
      labelIds = [],
      q = '',
    } = options;

    // Generate cache key and determine appropriate TTL
    const cacheKey = this.generateEmailCacheKey(options);
    const isInbox = this.isInboxQuery(options);
    const cacheTTL = isInbox ? INBOX_CACHE_TTL : CACHE_TTL;

    return this.getCachedOrFetch(cacheKey, async () => {
      return this.fetchEmailsFromGmail(options);
    }, cacheTTL);
  }

  private async fetchEmailsFromGmail(options: EmailListOptions): Promise<EmailListResponse> {
    const {
      maxResults = 20,
      pageToken,
      labelIds = [],
      q = '',
    } = options;

    try {
      await this.ensureValidToken();
      
      const creds = this.oauth2Client.credentials;
      console.log('[GmailService] Current credentials:', {
        hasAccessToken: !!creds.access_token,
        hasRefreshToken: !!creds.refresh_token,
        expiryDate: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : 'not set',
        isExpired: creds.expiry_date ? creds.expiry_date < Date.now() : 'unknown'
      });

      // Check Gmail connection health
      try {
        const profile = await this.gmail.users.getProfile({ userId: 'me' });
        console.log('[GmailService] Successfully connected to Gmail. Profile:', profile.data.emailAddress);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[GmailService] Failed to connect to Gmail:', errorMessage);
        throw error; // Re-throw to be caught by outer try-catch
      }

      // List messages with the specified criteria
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
        q,
      });

      const messages = listResponse.data.messages || [];
      const nextPageToken = listResponse.data.nextPageToken || undefined;
      const resultSizeEstimate = listResponse.data.resultSizeEstimate || 0;

      if (messages.length === 0) {
        const emptyResponse: EmailListResponse = { 
          emails: [], 
          resultSizeEstimate,
          nextPageToken: undefined 
        };
        return emptyResponse;
      }

      // Get full message details in parallel
      const emailPromises = messages.map(async (message) => {
        if (!message.id) {
          throw new Error('Message ID is missing');
        }

        const messageCacheKey = `message:${message.id}`;
        const cachedMessage = GmailService.cache.get<EmailMessage>(messageCacheKey);

        if (cachedMessage) {
          return cachedMessage;
        }

        const response = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const parsedMessage = this.parseEmailPayload(response.data);
        GmailService.cache.set(messageCacheKey, parsedMessage, MESSAGE_CACHE_TTL);
        
        return parsedMessage;
      });

      const emails = await Promise.all(emailPromises);
      const response: EmailListResponse = {
        emails,
        nextPageToken,
        resultSizeEstimate,
      };

      return response;
    } catch (error: unknown) {
      const gmailError = error as { code?: number; message?: string };
      throw new GmailServiceError(
        'Failed to fetch emails',
        'FETCH_ERROR',
        gmailError.code,
        error
      );
    }
  }

  async getEmail(messageId: string): Promise<EmailMessage> {
    const cacheKey = `message:${messageId}`;
    const cachedMessage = GmailService.cache.get<EmailMessage>(cacheKey);

    if (cachedMessage) {
      return cachedMessage;
    }

    try {
      await this.ensureValidToken();
      
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const parsedMessage = this.parseEmailPayload(response.data);
      GmailService.cache.set(cacheKey, parsedMessage, MESSAGE_CACHE_TTL);
      
      return parsedMessage;
    } catch (error: unknown) {
      const gmailError = error as { code?: number; message?: string };
      throw new GmailServiceError(
        'Failed to fetch email',
        'FETCH_ERROR',
        gmailError.code,
        error
      );
    }
  }

  async modifyLabels(messageId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<gmail_v1.Schema$Message> {
    try {
      await this.ensureValidToken();
      
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds,
        },
      });

      // Invalidate message cache
      GmailService.cache.del(`message:${messageId}`);
      
      return response.data;
    } catch (error: unknown) {
      const gmailError = error as { code?: number; message?: string };
      throw new GmailServiceError(
        'Failed to modify labels',
        'MODIFY_ERROR',
        gmailError.code,
        error
      );
    }
  }

  async trashEmail(messageId: string): Promise<gmail_v1.Schema$Message> {
    try {
      await this.ensureValidToken();
      
      const response = await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });

      // Invalidate message cache
      GmailService.cache.del(`message:${messageId}`);
      
      return response.data;
    } catch (error: unknown) {
      const gmailError = error as { code?: number; message?: string };
      throw new GmailServiceError(
        'Failed to trash email',
        'TRASH_ERROR',
        gmailError.code,
        error
      );
    }
  }

  async markAsRead(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyLabels(messageId, [], ['UNREAD']);
  }

  async markAsUnread(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyLabels(messageId, ['UNREAD'], []);
  }
}

/**
 * Generates the Google OAuth URL.
 */
export function getAuthUrl(userId: string): string {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId,
  });
  return authUrl;
}

/**
 * Exchanges an authorization code for tokens.
 */
export async function getTokensFromCode(code: string): Promise<Credentials> {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }
  return tokens;
}

/**
 * Gets the user's email address from Google using a new token.
 */
export async function getUserEmail(tokens: Credentials): Promise<string> {
  // Use node-fetch to call the userinfo endpoint directly
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[getUserEmail] Failed to fetch user info:', response.status, errorText);
    throw new Error('Failed to fetch user info');
  }

  const userInfo = await response.json() as UserInfo;
  if (!userInfo.email) {
    throw new Error("Failed to retrieve user's email from Google.");
  }
  return userInfo.email;
}