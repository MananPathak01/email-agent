import { collection, addDoc, Timestamp, query, where, getDocs, CollectionReference } from 'firebase/firestore';
import { db } from './firebase';
import { EmailAccount } from './types';
import { encrypt, decrypt } from './utils/crypto';

function col(userId: string): CollectionReference {
  return collection(db, 'users', userId, 'emailAccounts');
}

export async function addEmailAccount(
  userId: string,
  {
    email,
    provider,
    accessToken,
    refreshToken,
    tokenExpiry,
  }: Omit<EmailAccount, 'connectedAt' | 'lastSyncAt' | 'isActive'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(col(userId), {
    email,
    provider,
    accessToken: encrypt(accessToken),
    refreshToken: encrypt(refreshToken),
    tokenExpiry,
    isActive: true,
    connectedAt: now,
    lastSyncAt: now,
  } satisfies EmailAccount);
  return docRef.id;
}

export async function listEmailAccounts(userId: string) {
  const q = query(col(userId), where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as EmailAccount;
    return {
      id: d.id,
      ...data,
      accessToken: decrypt(data.accessToken),
      refreshToken: decrypt(data.refreshToken),
    };
  }) as (EmailAccount & { id: string })[];
}
