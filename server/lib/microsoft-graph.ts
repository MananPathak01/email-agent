import { Client } from '@microsoft/microsoft-graph-client';

if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
  throw new Error('Microsoft Graph credentials are required');
}

export interface MicrosoftGraphConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export const microsoftConfig: MicrosoftGraphConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
};

export class MicrosoftGraphService {
  private client: Client;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  async getUserProfile() {
    try {
      const user = await this.client.api('/me').get();
      return {
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        givenName: user.givenName,
        surname: user.surname
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async getEmails(maxResults: number = 10, query?: string) {
    try {
      let request = this.client
        .api('/me/messages')
        .top(maxResults)
        .orderby('receivedDateTime desc')
        .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,hasAttachments,isRead');

      if (query) {
        request = request.search(query);
      }

      const response = await request.get();
      
      return response.value.map((email: any) => ({
        id: email.id,
        subject: email.subject,
        from: email.from?.emailAddress?.address,
        fromName: email.from?.emailAddress?.name,
        to: email.toRecipients?.map((r: any) => r.emailAddress.address) || [],
        receivedAt: new Date(email.receivedDateTime),
        snippet: email.bodyPreview,
        content: email.body?.content || '',
        contentType: email.body?.contentType || 'text',
        hasAttachments: email.hasAttachments,
        isRead: email.isRead,
        provider: 'outlook'
      }));
    } catch (error) {
      console.error('Error getting emails:', error);
      throw error;
    }
  }

  async getEmailById(messageId: string) {
    try {
      const email = await this.client
        .api(`/me/messages/${messageId}`)
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,body,hasAttachments,isRead,attachments')
        .get();

      let attachments = [];
      if (email.hasAttachments) {
        const attachmentResponse = await this.client
          .api(`/me/messages/${messageId}/attachments`)
          .get();
        
        attachments = attachmentResponse.value.map((att: any) => ({
          id: att.id,
          filename: att.name,
          contentType: att.contentType,
          size: att.size
        }));
      }

      return {
        id: email.id,
        subject: email.subject,
        from: email.from?.emailAddress?.address,
        fromName: email.from?.emailAddress?.name,
        to: email.toRecipients?.map((r: any) => r.emailAddress.address) || [],
        cc: email.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
        bcc: email.bccRecipients?.map((r: any) => r.emailAddress.address) || [],
        receivedAt: new Date(email.receivedDateTime),
        content: email.body?.content || '',
        contentType: email.body?.contentType || 'text',
        attachments,
        isRead: email.isRead,
        provider: 'outlook'
      };
    } catch (error) {
      console.error('Error getting email by ID:', error);
      throw error;
    }
  }

  async createDraft(draftData: {
    to: string[];
    subject: string;
    content: string;
    cc?: string[];
    bcc?: string[];
  }) {
    try {
      const message = {
        subject: draftData.subject,
        body: {
          contentType: 'html',
          content: draftData.content
        },
        toRecipients: draftData.to.map(email => ({
          emailAddress: { address: email }
        })),
        ccRecipients: draftData.cc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
        bccRecipients: draftData.bcc?.map(email => ({
          emailAddress: { address: email }
        })) || []
      };

      const draft = await this.client
        .api('/me/messages')
        .post(message);

      return {
        id: draft.id,
        subject: draft.subject,
        createdAt: new Date(draft.createdDateTime)
      };
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  }

  async sendEmail(emailData: {
    to: string[];
    subject: string;
    content: string;
    cc?: string[];
    bcc?: string[];
  }) {
    try {
      const message = {
        subject: emailData.subject,
        body: {
          contentType: 'html',
          content: emailData.content
        },
        toRecipients: emailData.to.map(email => ({
          emailAddress: { address: email }
        })),
        ccRecipients: emailData.cc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
        bccRecipients: emailData.bcc?.map(email => ({
          emailAddress: { address: email }
        })) || []
      };

      await this.client
        .api('/me/sendMail')
        .post({ message });

      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

// OAuth helper functions
export function getMicrosoftAuthUrl(state?: string) {
  const scopes = [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.Send',
    'https://graph.microsoft.com/Mail.ReadWrite',
    'https://graph.microsoft.com/User.Read'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: microsoftConfig.clientId,
    response_type: 'code',
    redirect_uri: microsoftConfig.redirectUri,
    scope: scopes,
    response_mode: 'query',
    ...(state && { state })
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCodeForTokens(code: string) {
  try {
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const params = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      code,
      redirect_uri: microsoftConfig.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

export async function refreshMicrosoftToken(refreshToken: string) {
  try {
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const params = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken, // Some responses don't include new refresh token
      expiresIn: tokens.expires_in
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}