import { Timestamp, DocumentData } from 'firebase-admin/firestore';
// No need to import FirebaseError, we'll use type checking
import { adminDb } from '../firebase-admin';
import { COLLECTIONS } from '../firebase';
import { encrypt } from '../utils/crypto';

class EmailAccountError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'EmailAccountError';
  }
}

interface EmailAccount extends DocumentData {
  userId: string;
  email: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastConnectedAt: Timestamp;
}

const db = adminDb;

/**
 * Add a new email account for a user
 */
export const addEmailAccount = async (userId: string, accountData: Omit<EmailAccount, 'userId' | 'createdAt' | 'updatedAt'>) => {
  try {
    const accountRef = await db.collection(COLLECTIONS.GMAIL_ACCOUNTS).add({
      ...accountData,
      accessToken: encrypt(accountData.accessToken),
      refreshToken: encrypt(accountData.refreshToken),
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastConnectedAt: Timestamp.now(),
      isActive: true
    });
    
    return { id: accountRef.id, ...accountData };
  } catch (error) {
    console.error('Error adding email account:', error);
    throw new Error('Failed to add email account');
  }
};

/**
 * List all email accounts for a user
 */
export const listEmailAccounts = async (userId: string): Promise<Array<EmailAccount & { id: string }>> => {
  if (!userId) {
    throw new EmailAccountError('User ID is required', 'auth/user-id-required');
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.GMAIL_ACCOUNTS)
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EmailAccount & { id: string }));
  } catch (error: any) {
    console.error('Error listing email accounts:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      userId
    });
    
    if (error && typeof error === 'object' && 'code' in error) {
      throw new EmailAccountError(
        `Database error: ${error.message}`, 
        `firestore/${error.code}`
      );
    }
    
    throw new EmailAccountError(
      error.message || 'Failed to list email accounts',
      'unknown-error'
    );
  }
};

/**
 * Update an email account
 */
export const updateEmailAccount = async (
  accountId: string, 
  userId: string, 
  updates: Partial<Omit<EmailAccount, 'id' | 'userId' | 'createdAt'>>
) => {
  try {
    const accountRef = db.collection(COLLECTIONS.GMAIL_ACCOUNTS).doc(accountId);
    const doc = await accountRef.get();
    
    if (!doc.exists) {
      throw new Error('Email account not found');
    }
    
    const accountData = doc.data() as EmailAccount;
    
    // Ensure the user owns this account
    if (accountData.userId !== userId) {
      throw new Error('Unauthorized to update this account');
    }
    
    await accountRef.update({
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    return { id: doc.id, ...accountData, ...updates };
  } catch (error) {
    console.error('Error updating email account:', error);
    throw new Error('Failed to update email account');
  }
};

/**
 * Delete an email account
 */
export const deleteEmailAccount = async (accountId: string, userId: string) => {
  try {
    const accountRef = db.collection(COLLECTIONS.GMAIL_ACCOUNTS).doc(accountId);
    const doc = await accountRef.get();
    
    if (!doc.exists) {
      throw new Error('Email account not found');
    }
    
    const accountData = doc.data() as EmailAccount;
    
    // Ensure the user owns this account
    if (accountData.userId !== userId) {
      throw new Error('Unauthorized to delete this account');
    }
    
    await accountRef.delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting email account:', error);
    throw new Error('Failed to delete email account');
  }
};

/**
 * Upsert (add or update) an email account for a user by email
 */
export const upsertEmailAccount = async (userId: string, accountData: Omit<EmailAccount, 'userId' | 'createdAt' | 'updatedAt'>) => {
  try {
    const accountsRef = db.collection(COLLECTIONS.GMAIL_ACCOUNTS);
    const existingQuery = await accountsRef
      .where('userId', '==', userId)
      .where('email', '==', accountData.email)
      .get();

    const encryptedAccessToken = encrypt(accountData.accessToken);
    const encryptedRefreshToken = encrypt(accountData.refreshToken);
    const now = Timestamp.now();

    if (!existingQuery.empty) {
      // Update the first matching document
      const docRef = existingQuery.docs[0].ref;
      await docRef.update({
        ...accountData,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        updatedAt: now,
        lastConnectedAt: now,
        isActive: true
      });
      return { id: docRef.id, ...accountData };
    } else {
      // Create new document
      const docRef = await accountsRef.add({
        ...accountData,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        userId,
        createdAt: now,
        updatedAt: now,
        lastConnectedAt: now,
        isActive: true
      });
      return { id: docRef.id, ...accountData };
    }
  } catch (error) {
    console.error('Error upserting email account:', error);
    throw new Error('Failed to upsert email account');
  }
};
