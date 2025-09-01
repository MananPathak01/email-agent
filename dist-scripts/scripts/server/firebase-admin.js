"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = exports.adminAuth = void 0;
// server/firebase-admin.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
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
if (firebase_admin_1.default.apps.length === 0) {
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
        });
        console.log('Firebase Admin initialized successfully');
    }
    catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        throw error;
    }
}
exports.adminAuth = firebase_admin_1.default.auth();
exports.adminDb = (0, firestore_1.getFirestore)();
