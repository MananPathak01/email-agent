import { adminDb } from '../firebase-admin';
import { GmailService } from '../services/gmail.service';
import { decrypt } from '../utils/crypto';

const db = adminDb;

/**
 * Simple test script to manually sync emails for a user
 */
async function testSmartSync(userId: string) {
  console.log(`[TestSmartSync] Starting manual sync for user: ${userId}`);
  
  try {
    // 1. Get user's Gmail accounts
    const accountsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('email_accounts')
      .where('isActive', '==', true)
      .get();

    if (accountsSnapshot.empty) {
      console.log(`[TestSmartSync] No active Gmail accounts found for user: ${userId}`);
      return;
    }

    console.log(`[TestSmartSync] Found ${accountsSnapshot.docs.length} active accounts`);

    // 2. Sync each account
    for (const accountDoc of accountsSnapshot.docs) {
      const accountData = accountDoc.data();
      console.log(`[TestSmartSync] Syncing account: ${accountData.email}`);
      
      try {
        // 3. Create Gmail service
        const accessToken = decrypt(accountData.accessToken);
        const refreshToken = decrypt(accountData.refreshToken);
        
        const gmailService = new GmailService(
          accessToken,
          refreshToken,
          accountData.tokenExpiry?.toMillis() || undefined
        );

        // 4. Fetch emails from Gmail
        console.log(`[TestSmartSync] Fetching emails from Gmail...`);
        const emails = await gmailService.getEmails({
          maxResults: 50,
          q: 'is:unread OR newer_than:7d'
        });

        console.log(`[TestSmartSync] Fetched ${emails.emails.length} emails`);

        // 5. Store in Firebase
        const batch = db.batch();
        const emailsCollection = db.collection('users')
          .doc(userId)
          .collection('emails');

        for (const email of emails.emails) {
          const emailDoc = emailsCollection.doc(email.id);
          batch.set(emailDoc, {
            ...email,
            accountId: accountDoc.id,
            cached_at: new Date(),
            synced: true
          }, { merge: true });
        }

        await batch.commit();
        console.log(`[TestSmartSync] Successfully stored ${emails.emails.length} emails in Firebase`);

        // 6. Update user sync status
        await db.collection('users').doc(userId).update({
          last_synced: new Date(),
          sync_status: 'success',
          gmail_connected: true,
          activity_level: 'active'
        });

        console.log(`[TestSmartSync] Updated user sync status`);

      } catch (error) {
        console.error(`[TestSmartSync] Error syncing account ${accountData.email}:`, error);
        
        // Update user sync status with error
        await db.collection('users').doc(userId).update({
          sync_status: 'error',
          sync_error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[TestSmartSync] Manual sync completed for user: ${userId}`);

  } catch (error) {
    console.error(`[TestSmartSync] Error in manual sync:`, error);
  }
}

/**
 * Test function to update user activity
 */
async function testActivityUpdate(userId: string) {
  console.log(`[TestActivity] Updating activity for user: ${userId}`);
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`[TestActivity] User document not found: ${userId}`);
      return;
    }

    const now = new Date();
    
    await userRef.update({
      last_active: now,
      activity_level: 'active'
    });

    console.log(`[TestActivity] Activity updated for user: ${userId}`);

  } catch (error) {
    console.error(`[TestActivity] Error updating activity:`, error);
  }
}

/**
 * Test function to get emails from Firebase
 */
async function testGetEmails(userId: string) {
  console.log(`[TestGetEmails] Getting emails from Firebase for user: ${userId}`);
  
  try {
    const emailsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('emails')
      .orderBy('internalDate', 'desc')
      .limit(10)
      .get();

    console.log(`[TestGetEmails] Found ${emailsSnapshot.docs.length} emails in Firebase`);
    
    emailsSnapshot.docs.forEach((doc, index) => {
      const email = doc.data();
      console.log(`[TestGetEmails] Email ${index + 1}:`, {
        id: doc.id,
        subject: email.parsedPayload?.subject || 'No Subject',
        from: email.parsedPayload?.from || 'Unknown',
        date: email.internalDate ? new Date(parseInt(email.internalDate)).toLocaleString() : 'Unknown'
      });
    });

  } catch (error) {
    console.error(`[TestGetEmails] Error getting emails:`, error);
  }
}

// Export functions for use
export { testSmartSync, testActivityUpdate, testGetEmails };

// If running directly
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: tsx test-smart-sync.ts <userId>');
    process.exit(1);
  }

  console.log('Testing Smart Sync functionality...');
  
  // Test activity update
  testActivityUpdate(userId).then(() => {
    // Test email sync
    return testSmartSync(userId);
  }).then(() => {
    // Test getting emails
    return testGetEmails(userId);
  }).then(() => {
    console.log('All tests completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
} 