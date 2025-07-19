import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  GMAIL_ACCOUNTS: 'gmail_accounts',
  EMAILS: 'emails',
  TASKS: 'tasks',
  EMAIL_RESPONSES: 'email_responses',
} as const;

// Helper function to get document reference
export const getDocRef = (collectionName: string, id: string): DocumentReference => {
  return doc(db, collectionName, id);
};

// Helper function to get collection reference
export const getCollectionRef = (collectionName: string): CollectionReference => {
  return collection(db, collectionName);
};
