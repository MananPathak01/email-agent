# Gmail API Setup Guide

To enable Gmail integration for the AI Email Agent, you need to set up Google OAuth credentials.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

## Step 2: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if prompted:
   - Choose "External" user type
   - Fill in app name, user support email, and developer contact
   - Add your domain to authorized domains
4. Create OAuth client ID:
   - Application type: "Web application"
   - Name: "AI Email Agent"
   - Authorized redirect URIs: Add your Replit URL + `/api/auth/gmail/callback`
     - Example: `https://your-repl-name.replit.app/api/auth/gmail/callback`

## Step 3: Add Environment Variables

Add these to your Replit environment:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here  
GOOGLE_REDIRECT_URI=https://your-repl-name.replit.app/api/auth/gmail/callback
```

## Step 4: Test Integration

1. Click "Add Account" in the sidebar
2. Complete OAuth flow
3. Grant Gmail permissions
4. Use "Sync Emails" to fetch recent emails

## Required Scopes

The application requests these Gmail API scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.send` - Send responses
- `https://www.googleapis.com/auth/gmail.modify` - Mark emails as read

## Troubleshooting

- Ensure redirect URI exactly matches what's configured in Google Cloud Console
- Check that Gmail API is enabled in your project
- Verify environment variables are set correctly
- For local development, use `http://localhost:5000/api/auth/gmail/callback`