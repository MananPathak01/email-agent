# Services Documentation

## Gmail Service (`services/gmail.service.ts`)

### Overview
Handles all Gmail API interactions including OAuth flow and email operations.

### Key Methods

#### `getAuthUrl(): string`
Generates Google OAuth URL for user authentication.

#### `getTokensFromCode(code: string): Promise<Tokens>`
Exchanges authorization code for access and refresh tokens.

#### `getRecentEmails(maxResults: number)`
Fetches recent emails from the authenticated user's Gmail account.

#### `getEmailDetails(messageId: string)`
Retrieves detailed information about a specific email.

## Email Accounts Service (`services/emailAccounts.service.ts`)

### Overview
Manages user email accounts in Firestore.

### Key Methods

#### `addEmailAccount(userId: string, data: EmailAccountData)`
Adds a new email account for a user.

#### `listEmailAccounts(userId: string)`
Lists all email accounts for a user.

## OpenAI Service (`services/openai.ts`)

### Overview
Handles AI-powered email processing using OpenAI's GPT models.

### Key Methods

#### `analyzeEmail(email: EmailData)`
Analyzes email content and extracts key information.

#### `generateResponse(email: EmailData, context: ResponseContext)`
Generates an AI response to an email.

## Vector Search Service (`services/vectorSearch.ts`)

### Overview
Provides semantic search capabilities for emails.

### Key Methods

#### `createEmbedding(text: string)`
Generates a vector embedding for the given text.

#### `findSimilarEmails(embedding: number[], threshold: number)`
Finds emails similar to the provided embedding.

## Crypto Utilities (`utils/crypto.ts`)

### Overview
Provides encryption and decryption utilities for sensitive data.

### Key Methods

#### `encrypt(text: string): string`
Encrypts sensitive data before storage.

#### `decrypt(encryptedText: string): string`
Decrypts previously encrypted data.
