import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, CollectionReference, DocumentReference, Firestore } from 'firebase/firestore';

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
}

// Firebase configuration
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
let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  throw new Error('Failed to initialize Firebase app');
}

// Initialize Firestore
let db: Firestore;
try {
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  throw new Error('Failed to initialize Firestore');
}

export { db };

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
