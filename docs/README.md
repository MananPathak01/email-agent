# AI-Powered Email Agent Documentation

## Overview

This application is an AI-powered email workflow automation platform. It allows users to connect their Gmail accounts, manage onboarding and workflow emails, and automate responses and task creation using AI. Authentication is handled by Clerk, and all user-specific data is associated with the Clerk user ID.

## Key Features

- **Clerk Authentication:** Secure sign-in and user management using Clerk. All user data is linked to the Clerk user ID.
- **Gmail Integration:** Users can connect their Gmail accounts via OAuth. The app fetches emails from Gmail and displays them in the dashboard.
- **Connected Accounts:** Connected Gmail accounts are stored in the database (Firebase) and associated with the Clerk user ID. When a user logs in, their connected accounts are shown in the sidebar.
- **AI Workflow Automation:** The app uses AI to analyze emails, suggest responses, and create onboarding tasks automatically.
- **Sidebar Navigation:** The sidebar shows navigation links, connected Gmail accounts, and user profile info. The "Connect Email" button starts the Gmail OAuth flow.
- **Settings Page:** Users can view their profile and log out from the settings page, accessible via the sidebar.

## How It Works

1. **User Authentication:**
   - Users sign in with Clerk. The Clerk user ID is used as the primary identifier for all user data.

2. **Connecting Gmail:**
   - Users click "Connect Email" in the sidebar.
   - The app starts the Gmail OAuth flow. After successful authentication, the backend saves the Gmail account (email and tokens) in the database, linked to the Clerk user ID.
   - The sidebar fetches and displays all connected Gmail accounts for the logged-in user.

3. **Email Management:**
   - The app fetches emails from connected Gmail accounts and displays them in the dashboard.
   - Users can manually add emails or sync emails from Gmail.

4. **AI Automation:**
   - The app uses AI to analyze emails, suggest responses, and create onboarding tasks.

## Database Structure

- **users:** Stores user info, with Clerk user ID as the primary key.
- **gmail_accounts:** Stores connected Gmail accounts, linked to users by Clerk user ID.
- **emails, tasks, email_responses, etc.:** Store email and workflow data, linked to users and Gmail accounts.

## Tech Stack

- **Frontend:** React, Vite, Clerk, TanStack Query
- **Backend:** Express, Firebase (Firestore), Google APIs
- **AI:** OpenAI GPT-4o for email analysis and workflow automation

## Development Notes

- All user-specific API calls use the Clerk user ID.
- The sidebar and dashboard always reflect the current user's connected accounts and data.
- To add a new Gmail account, users must go through the OAuth flow.

---

For more details, see the codebase and individual component documentation. 