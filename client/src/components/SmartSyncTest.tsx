import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseEmails, useManualSync, useSyncMetrics } from '../hooks/use-firebase-emails';
import activityTracker from '../services/activityTracker';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export function SmartSyncTest() {
  const { user } = useAuth();
  const [activityStatus, setActivityStatus] = useState(activityTracker.getStatus());
  
  const { emails, loading, error, lastSync, syncStatus } = useFirebaseEmails({
    maxResults: 10
  });
  
  const { triggerSync, syncing, error: syncError } = useManualSync();
  const { metrics, loading: metricsLoading } = useSyncMetrics(5);

  const handleStartActivityTracking = () => {
    activityTracker.startTracking();
    setActivityStatus(activityTracker.getStatus());
  };

  const handleStopActivityTracking = () => {
    activityTracker.stopTracking();
    setActivityStatus(activityTracker.getStatus());
  };

  const handleForceActivityUpdate = async () => {
    await activityTracker.forceUpdate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Sync Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to test smart sync functionality.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Smart Sync Test Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activity Tracking */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Activity Tracking</h3>
            <div className="flex items-center gap-2">
              <Badge variant={activityStatus.isTracking ? 'default' : 'secondary'}>
                {activityStatus.isTracking ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-sm text-gray-600">
                User ID: {activityStatus.userId || 'None'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleStartActivityTracking}
                disabled={activityStatus.isTracking}
                size="sm"
              >
                Start Tracking
              </Button>
              <Button 
                onClick={handleStopActivityTracking}
                disabled={!activityStatus.isTracking}
                variant="outline"
                size="sm"
              >
                Stop Tracking
              </Button>
              <Button 
                onClick={handleForceActivityUpdate}
                variant="outline"
                size="sm"
              >
                Force Update
              </Button>
            </div>
          </div>

          {/* Manual Sync */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Manual Sync</h3>
            <div className="flex items-center gap-2">
              <Button 
                onClick={triggerSync}
                disabled={syncing}
                size="sm"
              >
                {syncing ? 'Syncing...' : 'Trigger Sync'}
              </Button>
              {syncError && (
                <span className="text-sm text-red-600">{syncError}</span>
              )}
            </div>
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sync Status</h3>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(syncStatus)}>
                {syncStatus}
              </Badge>
              {lastSync && (
                <span className="text-sm text-gray-600">
                  Last sync: {lastSync.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Firebase Emails ({emails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading emails...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {emails.length === 0 && !loading && (
            <p className="text-gray-600">No emails found in Firebase cache.</p>
          )}
          <div className="space-y-2">
            {emails.slice(0, 5).map((email) => (
              <div key={email.id} className="p-3 border rounded">
                <div className="font-medium">
                  {email.parsedPayload?.subject || 'No Subject'}
                </div>
                <div className="text-sm text-gray-600">
                  From: {email.parsedPayload?.from || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600">
                  Date: {email.internalDate ? new Date(parseInt(email.internalDate)).toLocaleString() : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading && <p>Loading metrics...</p>}
          <div className="space-y-2">
            {metrics.slice(0, 3).map((metric, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{metric.sync_type}</span>
                  <Badge variant="outline">{metric.user_count} users</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Duration: {metric.duration_ms}ms | 
                  Success: {metric.success_count} | 
                  Errors: {metric.error_count}
                </div>
                <div className="text-xs text-gray-500">
                  {metric.timestamp?.toDate?.()?.toLocaleString() || 'Unknown time'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 