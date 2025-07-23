// server/services/emailAccounts.service.ts
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { encrypt } from '../utils/crypto';

export interface EmailAccount {
  id?: string;
  email: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Timestamp;
  isActive: boolean;
  connectedAt: Timestamp;
  lastSyncAt: Timestamp;
}

export async function addEmailAccount(
  userId: string,
  {
    email,
    provider,
    accessToken,
    refreshToken,
    tokenExpiry,
  }: {
    email: string;
    provider: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Timestamp;
  }
): Promise<string> {
  const db = getFirestore();
  const now = Timestamp.now();
  
  const docRef = await db
    .collection('users')
    .doc(userId)
    .collection('emailAccounts')
    .add({
      email,
      provider,
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      tokenExpiry,
      isActive: true,
      connectedAt: now,
      lastSyncAt: now,
    });
    
  return docRef.id;
}

export async function listEmailAccounts(userId: string): Promise<(EmailAccount & { id: string })[]> {
  const db = getFirestore();
  
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('emailAccounts')
    .where('isActive', '==', true)
    .get();
    
  return snapshot.docs.map((doc) => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as (EmailAccount & { id: string })[];
}

export async function getEmailAccount(userId: string, accountId: string): Promise<(EmailAccount & { id: string }) | null> {
  const db = getFirestore();
  
  const doc = await db
    .collection('users')
    .doc(userId)
    .collection('emailAccounts')
    .doc(accountId)
    .get();
    
  if (!doc.exists) {
    return null;
  }
  
  return { id: doc.id, ...doc.data() } as (EmailAccount & { id: string });
}

export async function updateEmailAccount(userId: string, accountId: string, updates: Partial<EmailAccount>): Promise<void> {
  const db = getFirestore();
  
  await db
    .collection('users')
    .doc(userId)
    .collection('emailAccounts')
    .doc(accountId)
    .update({
      ...updates,
      lastSyncAt: Timestamp.now()
    });
}

export async function deactivateEmailAccount(userId: string, accountId: string): Promise<void> {
  const db = getFirestore();
  
  await db
    .collection('users')
    .doc(userId)
    .collection('emailAccounts')
    .doc(accountId)
    .update({
      isActive: false,
      lastSyncAt: Timestamp.now()
    });
}