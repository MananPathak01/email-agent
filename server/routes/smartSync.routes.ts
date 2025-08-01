import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiters } from '../middleware/rateLimit.middleware';
import SmartSyncService from '../services/smartSync';
import * as admin from 'firebase-admin';

const smartSyncRouter = Router();
const smartSyncService = new SmartSyncService();

// Manual trigger for smart sync (for testing and admin use)
smartSyncRouter.post('/trigger', authenticate, rateLimiters.strict.middleware, async (req, res) => {
  try {
    console.log('[SmartSync] Manual sync triggered by user:', req.user?.uid);
    
    await smartSyncService.executeSmartSync();
    
    res.json({ 
      success: true, 
      message: 'Smart sync executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SmartSync] Manual sync failed:', error);
    res.status(500).json({ 
      error: 'Smart sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user activity (called by frontend)
smartSyncRouter.post('/activity', authenticate, rateLimiters.moderate.middleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await smartSyncService.updateUserActivity(userId);
    
    res.json({ 
      success: true, 
      message: 'Activity updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SmartSync] Activity update failed:', error);
    res.status(500).json({ 
      error: 'Activity update failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sync metrics (for monitoring dashboard)
smartSyncRouter.get('/metrics', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const metrics = await smartSyncService.getSyncMetrics(limit);
    
    res.json({ 
      success: true, 
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SmartSync] Failed to get metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get sync metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user sync status
smartSyncRouter.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const syncStatus = {
      last_active: userData?.last_active?.toDate(),
      last_synced: userData?.last_synced?.toDate(),
      sync_status: userData?.sync_status || 'unknown',
      sync_error: userData?.sync_error,
      activity_level: userData?.activity_level || 'inactive',
      gmail_connected: userData?.gmail_connected || false
    };

    res.json({ 
      success: true, 
      syncStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SmartSync] Failed to get user status:', error);
    res.status(500).json({ 
      error: 'Failed to get user sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default smartSyncRouter; 