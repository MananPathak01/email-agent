# Quick Test Setup for Smart Sync

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install cron dependencies (optional, for local testing)
npm run install-cron
```

### 2. Environment Variables
Make sure your `.env` file has these variables:
```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Gmail API
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/auth/callback

# Smart Sync (optional)
CRON_SECRET=your-secret-key-here
```

### 3. Start the Application
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
npm run dev:client
```

### 4. Test the Smart Sync System

#### Step 1: Connect Gmail Account
1. Go to `http://localhost:5173`
2. Log in with your Firebase account
3. Connect your Gmail account via OAuth

#### Step 2: Test Activity Tracking
1. On the dashboard, you'll see the "Smart Sync Test Panel"
2. Click "Start Tracking" to begin activity monitoring
3. Interact with the page (click, scroll, etc.) to see activity updates

#### Step 3: Test Manual Sync
1. Click "Trigger Sync" to manually sync emails
2. Watch the sync status and metrics update
3. Check the "Firebase Emails" section for cached emails

#### Step 4: Monitor Real-time Updates
1. Keep the page open to see real-time email updates
2. Check sync metrics for performance data
3. Monitor activity tracking status

## 🔧 Testing Scenarios

### Test Case 1: Basic Sync
- [ ] Connect Gmail account
- [ ] Trigger manual sync
- [ ] Verify emails appear in Firebase cache
- [ ] Check sync metrics

### Test Case 2: Activity Tracking
- [ ] Start activity tracking
- [ ] Interact with the page
- [ ] Check activity updates in backend
- [ ] Verify user activity level changes

### Test Case 3: Real-time Updates
- [ ] Keep page open
- [ ] Send yourself a test email
- [ ] Wait for sync (2-5 minutes for active users)
- [ ] Verify email appears without refresh

### Test Case 4: Error Handling
- [ ] Disconnect Gmail account
- [ ] Try to trigger sync
- [ ] Verify proper error handling
- [ ] Check error messages in UI

## 📊 Monitoring

### Backend Logs
Watch the server console for:
- `[SmartSync]` messages
- `[ActivityTracker]` messages
- Sync metrics and performance data

### Frontend Console
Check browser console for:
- Activity tracking logs
- API request/response data
- Error messages

### Firebase Console
Monitor in Firebase Console:
- Firestore database for email data
- User activity fields
- Sync metrics collection

## 🚨 Troubleshooting

### Common Issues

1. **"No emails found in Firebase cache"**
   - Check if Gmail account is connected
   - Verify sync was triggered successfully
   - Check backend logs for sync errors

2. **Activity tracking not working**
   - Ensure user is authenticated
   - Check browser console for errors
   - Verify API endpoints are accessible

3. **Sync not triggering**
   - Check rate limiting (1 sync per minute)
   - Verify authentication
   - Check backend logs for errors

4. **Real-time updates not working**
   - Check Firebase connection
   - Verify Firestore rules
   - Check for JavaScript errors

### Debug Commands

```bash
# Check API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/smart-sync/status

# Check cron status (if using local cron)
curl http://localhost:3000/api/cron/status
```

## ✅ Success Criteria

- [ ] Gmail account connects successfully
- [ ] Manual sync works and emails appear
- [ ] Activity tracking updates in real-time
- [ ] Sync metrics show successful operations
- [ ] Real-time email updates work
- [ ] Error handling works properly

## 🎯 Next Steps

After successful testing:
1. Deploy to production environment
2. Set up production cron jobs
3. Monitor performance and costs
4. Optimize based on usage patterns 