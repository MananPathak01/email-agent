import { google, gmail_v1, oauth2_v2 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Export the OAuth2Client type
export type GoogleAuthClient = OAuth2Client;

// Create a function to create an OAuth2 client with the required methods
export function createOAuth2Client(
  clientId?: string | null, 
  clientSecret?: string | null, 
  redirectUri?: string
): GoogleAuthClient {
  return new OAuth2Client(
    clientId || undefined,
    clientSecret || undefined,
    redirectUri || undefined
  );
}

// Create a Gmail API client
export function createGmailClient(auth: GoogleAuthClient): gmail_v1.Gmail {
  // Create a new Gmail client with the auth client
  const gmail = google.gmail('v1');
  // @ts-ignore - The auth property is not in the type definition but is required
  gmail.context._options.auth = auth;
  return gmail;
}

// Create an OAuth2 API client
export function createOAuth2ApiClient(auth: GoogleAuthClient): oauth2_v2.Oauth2 {
  // Create a new OAuth2 client with the auth client
  const oauth2 = google.oauth2('v2');
  // @ts-ignore - The auth property is not in the type definition but is required
  oauth2.context._options.auth = auth;
  return oauth2;
}
