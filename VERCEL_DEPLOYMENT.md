# Vercel Deployment Guide

## Quick Setup

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Connect Repository**
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the framework

3. **Environment Variables**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Copy variables from `.env.vercel.example`
   - Add each variable with your actual values

4. **Deploy**
   - Click "Deploy"
   - Your app will be available at `https://your-app.vercel.app`

## Important Notes

### API Routes
- Your Express routes are now serverless functions
- Available at `/api/*` paths
- WebSockets won't work on Vercel (use polling instead)

### Redis Setup
- Use [Upstash Redis](https://upstash.com) for free Redis
- Copy the Redis URL to `REDIS_URL` environment variable

### Gmail OAuth
- Update your Gmail OAuth redirect URI to:
  `https://your-app.vercel.app/api/auth/gmail/callback`

### Environment Variables Needed
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
FIREBASE_ADMIN_PRIVATE_KEY
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PROJECT_ID
GROQ_API_KEY
OPENAI_API_KEY
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REDIRECT_URI
REDIS_URL
NODE_ENV=production
POLLING_ENABLED=false
```

## Limitations on Vercel
- No WebSockets (use polling or Server-Sent Events)
- 10-second function timeout on free plan
- Serverless functions are stateless

## Alternative: Railway
If you need WebSockets and background services, consider Railway instead:
- Full Node.js server support
- WebSocket support
- Background job processing
- Redis included