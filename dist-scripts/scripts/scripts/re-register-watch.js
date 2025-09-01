"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
console.log('[Script Start] Loading dependencies...');
const dotenv = __importStar(require("dotenv"));
console.log('Attempting to load .env file...');
dotenv.config({ path: '.env' });
console.log('✅ .env file loaded.');
console.log(`[Debug] Checking FIREBASE_PRIVATE_KEY... Is set: ${!!process.env.FIREBASE_PRIVATE_KEY}`);
// Verify environment variables
const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'PUBSUB_TOPIC_GMAIL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}
console.log('✅ All required environment variables are present.');
console.log('Importing Firebase Admin...');
require("./../server/firebase-admin"); // Initialize Firebase Admin
console.log('✅ Firebase Admin imported.');
const auth_1 = require("firebase-admin/auth");
const gmail_watch_service_1 = require("../server/services/gmail-watch.service");
async function main() {
    console.log('[Main Start] Starting execution...');
    const userEmail = process.argv[2];
    if (!userEmail) {
        console.error('❌ Please provide a user email address as an argument.');
        console.log('Usage: npx tsx scripts/re-register-watch.ts <user-email>');
        process.exit(1);
    }
    try {
        console.log(`Looking up user by email: ${userEmail}...`);
        const user = await (0, auth_1.getAuth)().getUserByEmail(userEmail);
        console.log(`✅ Found user: ${user.uid}`);
        console.log(`
Registering Gmail watch for ${userEmail}...`);
        const result = await gmail_watch_service_1.GmailWatchService.registerWatchForAccount(user.uid, userEmail);
        if (!result) {
            throw new Error('Failed to register watch. Account or tokens might not be found.');
        }
        console.log('\n🔥 Gmail Watch Registered Successfully!');
        console.log('----------------------------------------');
        console.log('History ID:', result.historyId);
        console.log('Expires At:', result.expiration ? new Date(Number(result.expiration)).toISOString() : 'N/A');
        console.log('\nYour server will now receive notifications for new emails.');
    }
    catch (error) {
        console.error('❌ Error during re-registration:');
        if (error instanceof Error) {
            console.error('Message:', error.message);
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
}
main().then(() => {
    process.exit(0);
}).catch(() => {
    process.exit(1);
});
