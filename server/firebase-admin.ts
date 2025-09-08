// server/firebase-admin.ts
import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';

// Helper function to safely get and format the private key
function getPrivateKey() {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (! privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
    }

    // Handle different formats of private key
    let formattedKey = privateKey;

    // If the key doesn't start with -----BEGIN, it might be base64 encoded
    if (! formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
        try { // Try to decode if it's base64
            formattedKey = Buffer.from(formattedKey, 'base64').toString('utf8');
        } catch (e) { // If base64 decode fails, continue with original
        }
    }

    // Replace escaped newlines with actual newlines
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    // Remove any extra quotes that might have been added
    formattedKey = formattedKey.replace(/^["']|["']$/g, '');

    return formattedKey;
}

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: getPrivateKey(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

// Initialize Firebase Admin if it hasn't been initialized yet
if (admin.apps.length === 0) {
    try { // Validate required environment variables
        const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required Firebase Admin environment variables: ${
                missingVars.join(', ')
            }`);
        }

        console.log('Initializing Firebase Admin with project:', process.env.FIREBASE_PROJECT_ID);
        console.log('Client email:', process.env.FIREBASE_CLIENT_EMAIL);
        console.log('Private key length:', process.env.FIREBASE_PRIVATE_KEY ?. length || 0);

        admin.initializeApp({
                credential: admin.credential.cert(serviceAccount), databaseURL: `https://${
                process.env.FIREBASE_PROJECT_ID
            }.firebaseio.com`
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        console.error('Service account config:', {
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKeyLength: serviceAccount.privateKey ?. length || 0,
            privateKeyStart: serviceAccount.privateKey ?. substring(0, 50) || 'N/A'
        });
        throw error;
    }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();
