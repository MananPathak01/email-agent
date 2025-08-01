import admin from 'firebase-admin';
import { GmailService } from './gmail.service';
import { decrypt } from '../utils/crypto';
import { EmailMessage } from '../types/gmail.types';

const db = admin.firestore();

interface SyncMetrics {
  sync_type: string;
  user_count: number;
  duration_ms: number;
  timestamp: FirebaseFirestore.Timestamp;
  success_count: number;
  error_count: number;
}

interface UserSyncData {
  last_active: FirebaseFirestore.Timestamp;
  last_synced: FirebaseFirestore.Timestamp;
  sync_status: 'success' | 'error' | 'pending';
  sync_error?: string;
  gmail_connected: boolean;
  activity_level: 'very_active' | 'active' | 'somewhat_active' | 'inactive';
}

export class SmartSyncService {
  private syncIntervals = {
    very_active: 2,      // 2 minutes
    active: 5,           // 5 minutes  
    somewhat_active: 15, // 15 minutes
    inactive: null       // Don't sync
  };

  constructor() {
    console.log('[SmartSyncService] Initialized with sync intervals:', this.syncIntervals);
  }

  /**
   * Determine user activity level based on last active time
   */
  getUserActivityLevel(lastActive: Date): 'very_active' | 'active' | 'somewhat_active' | 'inactive' {
    const now = new Date();
    const minutesSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    
    if (minutesSinceActive < 5) return 'very_active';
    if (minutesSinceActive < 30) return 'active';
    if (minutesSinceActive < 120) return 'somewhat_active';
    return 'inactive';
  }

  /**
   * Get users who have been active recently
   */
  async getActiveUsers(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes
    
    console.log('[SmartSyncService] Fetching active users since:', activeThreshold);
    
    const snapshot = await db.collection('users')
      .where('last_active', '>', admin.firestore.Timestamp.fromDate(activeThreshold))
      .where('gmail_connected', '==', true)
      .get();
    
    console.log(`[SmartSyncService] Found ${snapshot.docs.length} active users`);
    return snapshot.docs;
  }

  /**
   * Categorize users into sync batches based on activity and last sync time
   */
  async categorizeUsersForSync(): Promise<{
    very_active: FirebaseFirestore.QueryDocumentSnapshot[];
    active: FirebaseFirestore.QueryDocumentSnapshot[];
    somewhat_active: FirebaseFirestore.QueryDocumentSnapshot[];
  }> {
    const users = await this.getActiveUsers();
    const syncBatches = {
      very_active: [] as FirebaseFirestore.QueryDocumentSnapshot[],
      active: [] as FirebaseFirestore.QueryDocumentSnapshot[],
      somewhat_active: [] as FirebaseFirestore.QueryDocumentSnapshot[]
    };

    for (const doc of users) {
      const userData = doc.data() as UserSyncData;
      const activityLevel = this.getUserActivityLevel(userData.last_active.toDate());
      
      if (activityLevel === 'inactive') continue;
      
      const requiredInterval = this.syncIntervals[activityLevel];
      if (!requiredInterval) continue;
      
      const timeSinceLastSync = userData.last_synced 
        ? (new Date().getTime() - userData.last_synced.toDate().getTime()) / (1000 * 60)
        : Infinity;
      
      if (timeSinceLastSync >= requiredInterval) {
        syncBatches[activityLevel].push(doc);
      }
    }

    console.log('[SmartSyncService] Sync batches:', {
      very_active: syncBatches.very_active.length,
      active: syncBatches.active.length,
      somewhat_active: syncBatches.somewhat_active.length
    });

    return syncBatches;
  }

  /**
   * Sync a batch of users with the same priority level
   */
  async syncUserBatch(users: FirebaseFirestore.QueryDocumentSnapshot[], priority: string): Promise<void> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    console.log(`[SmartSyncService] Starting ${priority} sync for ${users.length} users`);

    const syncPromises = users.map(async (userDoc) => {
      try {
        await this.syncSingleUser(userDoc.id, userDoc.data() as UserSyncData);
        await userDoc.ref.update({
          last_synced: admin.firestore.Timestamp.now(),
          sync_status: 'success',
          sync_error: admin.firestore.FieldValue.delete()
        });
        successCount++;
        console.log(`[SmartSyncService] Successfully synced user: ${userDoc.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SmartSyncService] Sync failed for user ${userDoc.id}:`, errorMessage);
        await userDoc.ref.update({
          sync_status: 'error',
          sync_error: errorMessage
        });
        errorCount++;
      }
    });

    await Promise.allSettled(syncPromises);

    // Log metrics
    const metrics: SyncMetrics = {
      sync_type: priority,
      user_count: users.length,
      duration_ms: Date.now() - startTime,
      success_count: successCount,
      error_count: errorCount,
      timestamp: admin.firestore.Timestamp.now()
    };

    await db.collection('sync_metrics').add(metrics);

    console.log(`[SmartSyncService] ${priority} sync completed: ${successCount} success, ${errorCount} errors, ${metrics.duration_ms}ms`);
  }

  /**
   * Sync emails for a single user
   */
  async syncSingleUser(userId: string, userData: UserSyncData): Promise<void> {
    console.log(`[SmartSyncService] Syncing emails for user: ${userId}`);
    
    try {
      // Get user's Gmail accounts
      const accountsSnapshot = await db.collection('users')
        .doc(userId)
        .collection('email_accounts')
        .where('isActive', '==', true)
        .get();

      if (accountsSnapshot.empty) {
        console.log(`[SmartSyncService] No active Gmail accounts found for user: ${userId}`);
        return;
      }

      // Sync each active account
      for (const accountDoc of accountsSnapshot.docs) {
        const accountData = accountDoc.data();
        
        // Create Gmail service with decrypted tokens
        const accessToken = decrypt(accountData.accessToken);
        const refreshToken = decrypt(accountData.refreshToken);
        
        const gmailService = new GmailService(
          accessToken,
          refreshToken,
          accountData.tokenExpiry?.toMillis() || undefined
        );

        // Fetch recent emails (last 50 unread or from last 7 days)
        const emails = await gmailService.getEmails({
          maxResults: 50,
          q: 'is:unread OR newer_than:7d'
        });

        // Store emails in Firestore
        const batch = db.batch();
        const emailsCollection = db.collection('users')
          .doc(userId)
          .collection('emails');

        for (const email of emails.emails) {
          const emailDoc = emailsCollection.doc(email.id);
          batch.set(emailDoc, {
            ...email,
            accountId: accountDoc.id,
            cached_at: admin.firestore.Timestamp.now(),
            synced: true
          }, { merge: true });
        }

        await batch.commit();
        console.log(`[SmartSyncService] Stored ${emails.emails.length} emails for user ${userId}, account ${accountDoc.id}`);

    } catch (error) {
      console.error(`[SmartSyncService] Error syncing user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute the complete smart sync process
   */
  async executeSmartSync(): Promise<void> {
    console.log('[SmartSyncService] Starting smart sync execution');
    
    try {
      const batches = await this.categorizeUsersForSync();
      
      console.log('[SmartSyncService] Sync batches prepared:', {
        very_active: batches.very_active.length,
        active: batches.active.length,
        somewhat_active: batches.somewhat_active.length
      });

      // Process batches in priority order
      if (batches.very_active.length > 0) {
        await this.syncUserBatch(batches.very_active, 'very_active');
      }
      
      if (batches.active.length > 0) {
        await this.syncUserBatch(batches.active, 'active');
      }
      
      if (batches.somewhat_active.length > 0) {
        await this.syncUserBatch(batches.somewhat_active, 'somewhat_active');
      }

      console.log('[SmartSyncService] Smart sync execution completed');
    } catch (error) {
      console.error('[SmartSyncService] Smart sync execution failed:', error);
      throw error;
    }
  }

  /**
   * Update user activity level
   */
  async updateUserActivity(userId: string): Promise<void> {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.warn(`[SmartSyncService] User document not found: ${userId}`);
        return;
      }

      const userData = userDoc.data() as UserSyncData;
      const now = admin.firestore.Timestamp.now();
      const activityLevel = this.getUserActivityLevel(userData.last_active.toDate());

      await userRef.update({
        last_active: now,
        activity_level: activityLevel
      });

      console.log(`[SmartSyncService] Updated activity for user ${userId}: ${activityLevel}`);
    } catch (error) {
      console.error(`[SmartSyncService] Error updating user activity for ${userId}:`, error);
    }
  }

  /**
   * Get sync metrics for monitoring
   */
  async getSyncMetrics(limit: number = 20): Promise<SyncMetrics[]> {
    const snapshot = await db.collection('sync_metrics')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SyncMetrics);
  }
}

export default SmartSyncService; 