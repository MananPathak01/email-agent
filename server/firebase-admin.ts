// server/firebase-admin.ts
import admin from 'firebase-admin';

// Helper function to safely get and format the private key
function getPrivateKey() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
  }
  // Replace escaped newlines with actual newlines
  return privateKey.replace(/\\n/g, '\n');
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: getPrivateKey(),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize Firebase Admin if it hasn't been initialized yet
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
