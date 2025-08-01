# Smart Email Sync Implementation Guide

## Overview

The Smart Email Sync system replaces direct Gmail API calls with a Firebase-based caching system that prioritizes active users while optimizing resource usage and costs.

## Key Benefits

- **Instant Email Loading**: Emails load from Firebase cache instead of Gmail API
- **Smart Prioritization**: Active users get fresh emails every 2-5 minutes, inactive users save API quota
- **Real-time Updates**: Firebase real-time listeners provide live email updates
- **Cost Optimization**: Dramatically reduces Gmail API quota usage
- **Scalable**: Handles growth without overwhelming rate limits

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Gmail API     │
│                 │    │                 │    │                 │
│ Activity Tracker│───▶│ Smart Sync      │───▶│ Gmail Service   │
│ Firebase Hook   │    │ Service         │    │                 │
│ Real-time UI    │    │ Cron Jobs       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   Sync Metrics  │
│                 │    │                 │
│ User Activity   │    │ Performance     │
│ Email Cache     │    │ Monitoring      │
│ Real-time DB    │    │                 │
└─────────────────┘    └─────────────────┘
```

## Implementation Steps

### 1. Database Schema Updates

The system automatically creates the required fields in the users collection:

```javascript
// Users collection fields (auto-created)
{
  last_active: timestamp,        // Last user activity
  last_synced: timestamp,        // Last email sync
  sync_status: string,           // 'success', 'error', 'pending'
  sync_error: string,            // Error message if sync failed
  gmail_connected: boolean,      // Whether user has Gmail connected
  activity_level: string         // 'very_active', 'active', 'inactive'
}

// Sync metrics collection (auto-created)
{
  sync_type: string,             // 'very_active', 'active', 'somewhat_active'
  user_count: number,            // Number of users synced
  duration_ms: number,           // Sync duration
  timestamp: timestamp,          // When sync occurred
  success_count: number,         // Successful syncs
  error_count: number            // Failed syncs
}
```

### 2. Backend Setup

#### Smart Sync Service
The core service is already implemented in `server/services/smartSync.ts`:

```typescript
import SmartSyncService from '../services/smartSync';

const smartSyncService = new SmartSyncService();

// Execute smart sync
await smartSyncService.executeSmartSync();

// Update user activity
await smartSyncService.updateUserActivity(userId);

// Get sync metrics
const metrics = await smartSyncService.getSyncMetrics(20);
```

#### API Routes
Routes are available at `/api/smart-sync/`:

- `POST /api/smart-sync/trigger` - Manual sync trigger
- `POST /api/smart-sync/activity` - Update user activity
- `GET /api/smart-sync/metrics` - Get sync metrics
- `GET /api/smart-sync/status` - Get user sync status

### 3. Frontend Integration

#### Activity Tracker
Initialize the activity tracker in your main app:

```typescript
import activityTracker from './services/activityTracker';

// In your main App component or AuthContext
useEffect(() => {
  if (user) {
    activityTracker.startTracking();
    
    return () => {
      activityTracker.stopTracking();
    };
  }
}, [user]);
```

#### Firebase Email Hook
Replace Gmail API calls with Firebase hook:

```typescript
import { useFirebaseEmails, useManualSync } from './hooks/use-firebase-emails';

function EmailList() {
  const { emails, loading, error, lastSync, syncStatus } = useFirebaseEmails({
    maxResults: 50,
    accountId: 'optional-account-id'
  });
  
  const { triggerSync, syncing } = useManualSync();

  return (
    <div>
      <button onClick={triggerSync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Refresh Emails'}
      </button>
      
      {lastSync && (
        <p>Last synced: {lastSync.toLocaleString()}</p>
      )}
      
      {emails.map(email => (
        <EmailCard key={email.id} email={email} />
      ))}
    </div>
  );
}
```

### 4. Deployment Options

#### Option A: Firebase Cloud Functions (Recommended)

Create `functions/src/smartSync.ts`:

```typescript
import * as functions from 'firebase-functions';
import { executeSmartSyncCron } from '../../server/cron/smartSyncCron';

// Scheduled sync every 2 minutes
export const smartEmailSync = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    try {
      await executeSmartSyncCron();
      return null;
    } catch (error) {
      console.error('Cloud Function sync error:', error);
      throw error;
    }
  });

// Manual trigger endpoint
export const triggerSmartSync = functions.https.onRequest(async (req, res) => {
  try {
    await executeSmartSyncCron();
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### Option B: Vercel/Netlify Cron

Create `api/cron/smart-sync.ts`:

```typescript
import { executeSmartSyncCron } from '../../../server/cron/smartSyncCron';

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    await executeSmartSyncCron();
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Cron sync error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

#### Option C: Local Development

Install node-cron:

```bash
npm install node-cron @types/node-cron
```

Add to your server startup:

```typescript
import cron from 'node-cron';
import { executeSmartSyncCron } from './cron/smartSyncCron';

// Run every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  console.log('[SmartSyncCron] Running scheduled sync...');
  try {
    await executeSmartSyncCron();
  } catch (error) {
    console.error('[SmartSyncCron] Scheduled sync failed:', error);
  }
});
```

### 5. Environment Variables

Add these to your `.env` file:

```env
# For external cron services
CRON_SECRET=your-secret-key-here

# Existing variables (should already be set)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Usage Patterns

### User Activity Levels

- **Very Active** (< 5 min since last activity): Sync every 2 minutes
- **Active** (5-30 min since last activity): Sync every 5 minutes  
- **Somewhat Active** (30-120 min since last activity): Sync every 15 minutes
- **Inactive** (> 120 min since last activity): No sync

### Email Caching Strategy

- **Cache Duration**: Emails are cached indefinitely until replaced
- **Sync Scope**: Last 50 unread emails or emails from last 7 days
- **Real-time Updates**: Firebase listeners provide instant updates
- **Fallback**: If Firebase fails, falls back to direct Gmail API

### Performance Monitoring

Monitor sync performance with metrics:

```typescript
import { useSyncMetrics } from './hooks/use-firebase-emails';

function SyncDashboard() {
  const { metrics, loading } = useSyncMetrics(20);
  
  return (
    <div>
      <h3>Sync Performance</h3>
      {metrics.map(metric => (
        <div key={metric.timestamp}>
          <p>{metric.sync_type}: {metric.user_count} users</p>
          <p>Duration: {metric.duration_ms}ms</p>
          <p>Success: {metric.success_count}, Errors: {metric.error_count}</p>
        </div>
      ))}
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Gradual Rollout
1. Deploy smart sync backend
2. Enable activity tracking for a subset of users
3. Monitor performance and sync metrics
4. Gradually increase user base

### Phase 2: Full Migration
1. Replace all Gmail API calls with Firebase hooks
2. Enable activity tracking for all users
3. Monitor Gmail API quota usage reduction
4. Optimize sync intervals based on usage patterns

### Phase 3: Optimization
1. Implement advanced filtering (labels, search)
2. Add email analytics and insights
3. Optimize cache strategies
4. Scale based on user growth

## Troubleshooting

### Common Issues

1. **Sync Not Running**
   - Check cron job configuration
   - Verify environment variables
   - Check Firebase permissions

2. **Emails Not Updating**
   - Verify user activity tracking
   - Check sync status in Firebase
   - Review sync error logs

3. **Performance Issues**
   - Monitor sync metrics
   - Adjust sync intervals
   - Check Firebase usage limits

### Debug Commands

```typescript
// Check user sync status
const status = await fetch('/api/smart-sync/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Trigger manual sync
await fetch('/api/smart-sync/trigger', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get sync metrics
const metrics = await fetch('/api/smart-sync/metrics?limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Success Metrics

- **Performance**: Email load time < 100ms
- **Freshness**: Active users get emails within 2-5 minutes
- **Cost**: 80%+ reduction in Gmail API quota usage
- **Reliability**: 99%+ sync success rate
- **User Experience**: Real-time email updates

## Next Steps

1. Deploy the smart sync system
2. Monitor performance and metrics
3. Optimize based on usage patterns
4. Implement advanced features (search, filtering)
5. Scale for growth 