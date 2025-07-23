# AI Email Agent

A modern, AI-powered email agent with Gmail integration, built with Node.js, Express, Firebase, and React.

## Features
- Connect Gmail accounts via OAuth
- Secure token storage (Firestore subcollections)
- Prevents duplicate Gmail account connections per user
- Minimal, elegant UI (shadcn)

## Setup
1. Clone the repo and install dependencies
2. Set up your `.env` file (see DEVELOPMENT_GUIDE.md)
3. Start the backend and frontend

## Data Model
- Gmail accounts are stored in `users/{userId}/email_accounts` subcollections
- Duplicate connections for the same email are prevented (upsert logic)

See DEVELOPMENT_GUIDE.md for full setup and deployment instructions.