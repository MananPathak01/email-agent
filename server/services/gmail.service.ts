
// server/services/gmail.service.ts
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { decrypt } from '../utils/crypto';
import fetch from 'node-fetch';

/**
 * GmailService is responsible for interacting with the Gmail API for an
 * already authenticated user. It uses stored, encrypted tokens.
 */
export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // This service always deals with stored tokens, so we decrypt them.
    this.oauth2Client.setCredentials({
      access_token: decrypt(accessToken),
      refresh_token: decrypt(refreshToken),
    });
  }

  private async getAccessToken(): Promise<string> {
    // getAccessToken will automatically handle token refreshing.
    const tokenResponse = await this.oauth2Client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error('Failed to retrieve access token.');
    }
    return tokenResponse.token;
  }

  /**
   * Get recent emails for the authenticated user.
   */
  async getRecentEmails(maxResults: number = 10): Promise<gmail_v1.Schema$Message[]> {
    const accessToken = await this.getAccessToken();
    // Manually set the Authorization header for this specific API call
    const gmail = google.gmail({
      version: 'v1',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { data } = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'is:inbox',
    });

    const messages = data.messages || [];
    if (messages.length === 0) {
      return [];
    }

    const messagePromises = messages.map(message =>
      gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      })
    );

    const messageResponses = await Promise.all(messagePromises);
    return messageResponses.map(response => response.data);
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

  console.log('[OAuth] Generating auth URL for user:', userId);
  console.log('[OAuth] Scopes:', scopes);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId,
  });
  console.log('[OAuth] Generated URL:', authUrl);
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
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!res.ok) {
    console.error('[getUserEmail] Failed to fetch user info:', res.status, await res.text());
    throw new Error('Failed to fetch user info');
  }

  const userInfo = await res.json();
  if (!userInfo.email) {
    throw new Error("Failed to retrieve user's email from Google.");
  }
  return userInfo.email;
}