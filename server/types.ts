import { Timestamp } from 'firebase/firestore';

// Shared Firestore typings
export interface EmailAccount {
  email: string;
  provider: 'gmail';
  accessToken: string;   // encrypted value
  refreshToken: string;  // encrypted value
  tokenExpiry: Timestamp;
  isActive: boolean;
  connectedAt: Timestamp;
  lastSyncAt?: Timestamp;
}
