// Simplified Gmail service using the exact working logic from test script
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class SimpleGmailService {
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail;

  constructor(accessToken: string, refreshToken: string) {
    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Missing required Google OAuth environment variables');
    }

    // Validate required tokens
    if (!accessToken || !refreshToken) {
      throw new Error('Access token and refresh token are required');
    }

    // Use exact same setup as working test script
    this.oauth2Client = new google.auth.OAuth2(
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
  }

  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return {
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
        historyId: response.data.historyId
      };
    } catch (error: any) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' });
      return response.data.labels || [];
    } catch (error: any) {
      throw new Error(`Failed to get labels: ${error.message}`);
    }
  }

  async getEmails(maxResults: number = 10, labelIds?: string[], q?: string) {
    try {
      const params: any = {
        userId: 'me',
        maxResults,
      };
      
      // Add label filtering if provided
      if (labelIds && labelIds.length > 0) {
        params.labelIds = labelIds;
      }
      
      // Add search query if provided
      if (q) {
        params.q = q;
      }
      
      const response = await this.gmail.users.messages.list(params);
      return response.data.messages || [];
    } catch (error: any) {
      throw new Error(`Failed to get emails: ${error.message}`);
    }
  }

  async getEmail(messageId: string) {
    try {
      const response = await this.gmail.users.messages.get({ 
        userId: 'me', 
        id: messageId 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get email: ${error.message}`);
    }
  }

  // Helper function to parse email headers
  private parseEmailHeaders(headers: any[]): { subject: string; from: string; to: string; date: string } {
    const parsed = {
      subject: '',
      from: '',
      to: '',
      date: ''
    };
    
    if (headers) {
      headers.forEach((header: any) => {
        const name = header.name?.toLowerCase();
        if (name === 'subject') parsed.subject = header.value || '';
        if (name === 'from') parsed.from = header.value || '';
        if (name === 'to') parsed.to = header.value || '';
        if (name === 'date') {
          // Parse Gmail date format properly
          const dateValue = header.value || '';
          try {
            // Gmail dates are typically in RFC 2822 format
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              parsed.date = parsedDate.toISOString();
            } else {
              parsed.date = dateValue; // Fallback to original
            }
          } catch (e) {
            parsed.date = dateValue; // Fallback to original
          }
        }
      });
    }
    
    return parsed;
  }

  // Helper function to extract email body
  private extractEmailBody(payload: any): string {
    if (!payload) return '';
    
    // Try to get body from main payload
    if (payload.body?.data) {
      try {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    // Try to get body from parts
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          try {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          } catch (e) {
            // Ignore decode errors
          }
        }
      }
    }
    
    return '';
  }

  async getEmailsWithDetails(maxResults: number = 5, labelIds?: string[], q?: string) {
    try {
      // Get message list with filtering
      const messages = await this.getEmails(maxResults, labelIds, q);
      
      // Get details for each message
      const emailsWithDetails = [];
      for (const message of messages) {
        if (message.id) {
          const emailDetails = await this.getEmail(message.id);
          
          // Parse email headers and body
          const headers = emailDetails.payload?.headers || [];
          const parsedHeaders = this.parseEmailHeaders(headers);
          const body = this.extractEmailBody(emailDetails.payload);
          
          emailsWithDetails.push({
            id: message.id,
            threadId: message.threadId,
            snippet: emailDetails.snippet,
            payload: emailDetails.payload,
            internalDate: emailDetails.internalDate,
            labelIds: emailDetails.labelIds,
            historyId: emailDetails.historyId,
            sizeEstimate: emailDetails.sizeEstimate,
            // Add parsed payload for frontend compatibility
            parsedPayload: {
              subject: parsedHeaders.subject,
              from: parsedHeaders.from,
              to: parsedHeaders.to,
              date: parsedHeaders.date,
              body: body,
              attachments: [] // TODO: Parse attachments if needed
            }
          });
        }
      }
      
      return emailsWithDetails;
    } catch (error: any) {
      throw new Error(`Failed to get emails with details: ${error.message}`);
    }
  }
}

// Helper function to create service with tokens
export function createSimpleGmailService(accessToken: string, refreshToken: string): SimpleGmailService {
  return new SimpleGmailService(accessToken, refreshToken);
}
