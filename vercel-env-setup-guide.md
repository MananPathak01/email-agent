# Vercel Environment Variables Setup Guide

## Required Environment Variables

### Frontend Variables (VITE_ prefix - for React build)
Add these in Vercel Dashboard → Settings → Environment Variables:

```
VITE_FIREBASE_API_KEY=<copy from your .env file>
VITE_FIREBASE_AUTH_DOMAIN=<copy from your .env file>
VITE_FIREBASE_PROJECT_ID=<copy from your .env file>
VITE_FIREBASE_STORAGE_BUCKET=<copy from your .env file>
VITE_FIREBASE_MESSAGING_SENDER_ID=<copy from your .env file>
VITE_FIREBASE_APP_ID=<copy from your .env file>
VITE_FIREBASE_MEASUREMENT_ID=<copy from your .env file>
VITE_API_BASE_URL=https://wizzy.engineer
```

### Backend Variables (for API routes)
```
GOOGLE_CLIENT_ID=<copy from your .env file>
GOOGLE_CLIENT_SECRET=<copy from your .env file>
GOOGLE_REDIRECT_URI=https://wizzy.engineer/api/auth/gmail/callback

FIREBASE_PROJECT_ID=<copy from your .env file>
FIREBASE_CLIENT_EMAIL=<copy from your .env file>
FIREBASE_PRIVATE_KEY=<copy from your .env file - include quotes>

OPENAI_API_KEY=<copy from your .env file>
GROQ_API_KEY=<copy from your .env file>
GROQ_MODEL=llama3-8b-8192
AI_PROVIDER=groq

EMAIL_AGENT_TOKEN_KEY=<copy from your .env file>
NODE_ENV=production
```

## Steps:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above with values from your local `.env` file
3. Set each variable to apply to "Production, Preview, and Development"
4. Redeploy your application

## Important:
- Copy the actual values from your `.env` file
- Don't include the `<>` brackets
- Make sure FIREBASE_PRIVATE_KEY includes the quotes around the key
- Update GOOGLE_REDIRECT_URI to use your actual domain