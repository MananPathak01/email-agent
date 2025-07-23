# API Reference

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
Most endpoints require authentication via Firebase ID token.

### Headers
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

## Gmail API

### Authentication Flow

#### 1. Get OAuth URL
```
GET /api/gmail/auth
```

**Response**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/..."
}
```

#### 2. Handle OAuth Callback
```
POST /api/gmail/auth/callback
```

**Request Body**
```json
{
  "code": "authorization_code_from_google",
  "userId": "firebase_user_id"
}
```

**Response**
```json
{
  "success": true,
  "email": "user@example.com",
  "accountId": "unique_account_id"
}
```

### Account Management

#### Get Connected Accounts
```
GET /api/gmail/accounts
```

**Headers**
```
Authorization: Bearer <firebase_id_token>
```

**Response**
```json
[
  {
    "id": "account_id",
    "email": "user@example.com",
    "provider": "gmail",
    "createdAt": "2023-06-15T10:00:00Z"
  }
]
```

#### Remove Connected Account
```
DELETE /api/gmail/accounts/:accountId
```

**Response**
```json
{
  "success": true
}
```

### Emails

#### Get Recent Emails
```
GET /api/gmail/emails?limit=10
```

**Query Parameters**
- `limit`: Number of emails to return (default: 10, max: 50)
- `labelIds`: Comma-separated list of label IDs to filter by

**Response**
```json
{
  "emails": [
    {
      "id": "message_id",
      "threadId": "thread_id",
      "snippet": "Email snippet...",
      "from": "sender@example.com",
      "to": ["recipient@example.com"],
      "subject": "Email subject",
      "date": "2023-06-15T10:00:00Z",
      "labels": ["INBOX", "UNREAD"]
    }
  ]
}
```

#### Get Email Details
```
GET /api/gmail/emails/:messageId
```

**Response**
```json
{
  "id": "message_id",
  "threadId": "thread_id",
  "snippet": "Email snippet...",
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "Email subject",
  "date": "2023-06-15T10:00:00Z",
  "body": "<p>Full email content in HTML</p>",
  "textBody": "Full email content in plain text",
  "labels": ["INBOX", "UNREAD"],
  "attachments": [
    {
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 1024,
      "id": "attachment_id"
    }
  ]
}
```

#### Send Email
```
POST /api/gmail/send
```

**Request Body**
```json
{
  "to": ["recipient@example.com"],
  "subject": "Email subject",
  "body": "<p>Email content in HTML</p>",
  "textBody": "Email content in plain text",
  "cc": [],
  "bcc": [],
  "threadId": "optional_thread_id_for_replies"
}
```

**Response**
```json
{
  "success": true,
  "messageId": "unique_message_id",
  "threadId": "thread_id"
}
```

### Labels

#### Get Labels
```
GET /api/gmail/labels
```

**Response**
```json
{
  "labels": [
    {
      "id": "label_id",
      "name": "INBOX",
      "type": "system"
    },
    {
      "id": "label_id_2",
      "name": "Custom Label",
      "type": "user"
    }
  ]
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "code": "MISSING_FIELDS"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized - Invalid or missing token",
  "code": "UNAUTHORIZED"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to process request",
  "code": "INTERNAL_ERROR"
}
```
Authorization: Bearer <firebase_id_token>
```

**Response**
```json
[
  {
    "id": "account_id",
    "email": "user@example.com",
    "isActive": true,
    "connectionStatus": "connected",
    "lastConnectedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get Emails
```
GET /api/gmail/emails
```

**Headers**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters**
- `limit` (optional): Number of emails to return (default: 10)
- `query` (optional): Search query string

**Response**
```json
{
  "emails": [
    {
      "id": "message_id",
      "threadId": "thread_id",
      "snippet": "Email snippet...",
      "subject": "Email Subject",
      "from": "sender@example.com",
      "to": ["recipient@example.com"],
      "date": "2023-01-01T00:00:00.000Z",
      "labels": ["INBOX", "UNREAD"]
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "code": "MISSING_FIELDS"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized - Invalid or missing token",
  "code": "UNAUTHORIZED"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request",
  "code": "INTERNAL_ERROR"
}
```
