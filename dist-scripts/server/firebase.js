"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionRef = exports.getDocRef = exports.COLLECTIONS = exports.db = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
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
let app;
try {
    app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApp)();
    console.log('Firebase app initialized successfully');
}
catch (error) {
    console.error('Error initializing Firebase app:', error);
    throw new Error('Failed to initialize Firebase app');
}
// Initialize Firestore
let db;
try {
    exports.db = db = (0, firestore_1.getFirestore)(app);
    console.log('Firestore initialized successfully');
}
catch (error) {
    console.error('Error initializing Firestore:', error);
    throw new Error('Failed to initialize Firestore');
}
// Collection names
exports.COLLECTIONS = {
    USERS: 'users',
    GMAIL_ACCOUNTS: 'gmail_accounts',
    EMAILS: 'emails',
    TASKS: 'tasks',
    EMAIL_RESPONSES: 'email_responses',
};
// Helper function to get document reference
const getDocRef = (collectionName, id) => {
    return (0, firestore_1.doc)(db, collectionName, id);
};
exports.getDocRef = getDocRef;
// Helper function to get collection reference
const getCollectionRef = (collectionName) => {
    return (0, firestore_1.collection)(db, collectionName);
};
exports.getCollectionRef = getCollectionRef;
