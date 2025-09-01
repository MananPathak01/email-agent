# Server Architecture Documentation

## Overview
This document provides detailed documentation for the server-side components of the Email Agent application. The server is built with Node.js, Express, and Firebase, providing APIs for email management, authentication, and AI-powered email processing.

## Directory Structure

### Core Files
- `index.ts` - Main server entry point
- `firebase.ts` - Firebase initialization and configuration
- `types.ts` - Shared TypeScript type definitions
- `dev.ts` - Development server setup
- `vite.ts` - Vite development server integration

### Routes
- `routes/` - API route handlers
  - `index.ts` - Main router configuration
  - `gmail.routes.ts` - Gmail-specific API endpoints

### Services
- `services/` - Business logic and external service integrations
  - `gmail.service.ts` - Gmail API service for interacting with Gmail API
    - `GmailService` class for managing Gmail API interactions
    - OAuth 2.0 authentication flow
    - Methods for retrieving emails, sending emails, and managing labels
  - `emailAccounts.service.ts` - Email account management
    - CRUD operations for user email accounts
    - Token encryption and storage
  - `openai.ts` - OpenAI integration
    - Text generation and analysis
    - Response generation for emails
  - `vectorSearch.ts` - Vector search functionality
    - Semantic search for emails
    - Similarity matching and retrieval

### Middleware
- `middleware/` - Express middleware
  - `auth.middleware.ts` - Authentication middleware

### Utilities
- `utils/` - Helper functions
  - `crypto.ts` - Encryption utilities

## Gmail Service Documentation

### GmailService Class

#### Constructor
```typescript
constructor(accessToken: string, refreshToken: string)
```

#### Methods

##### `getUserEmail(): Promise<string>`
Retrieves the authenticated user's email address.

##### `getRecentEmails(maxResults?: number): Promise<Email[]>`
Fetches recent emails from the user's inbox.
- `maxResults`: Maximum number of emails to return (default: 10)

##### `getEmailDetails(messageId: string): Promise<Email>`
Retrieves detailed information about a specific email.
- `messageId`: The ID of the email to retrieve

##### `sendEmail(emailData: EmailData): Promise<string>`
Sends an email on behalf of the user.
- `emailData`: Object containing email details (to, subject, body, etc.)

### OAuth Flow
1. Client requests OAuth URL from `/api/gmail/auth`
2. User authenticates with Google and grants permissions
3. Google redirects to callback URL with authorization code
4. Server exchanges code for tokens and stores them securely
5. Server uses tokens to make API requests on user's behalf

## API Documentation

### Authentication
All protected routes require a valid Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase_id_token>
```

### Error Responses
Standard error response format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Development

### Environment Variables
Required environment variables are defined in `.env`:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
EMAIL_AGENT_TOKEN_KEY=
OPENAI_API_KEY=
```

### Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables in `.env`
3. Start the development server:
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:3000`
