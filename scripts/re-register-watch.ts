console.log('[Script Start] Loading dependencies...');
import * as dotenv from 'dotenv';

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
import './../server/firebase-admin'; // Initialize Firebase Admin
console.log('✅ Firebase Admin imported.');
import { getAuth } from 'firebase-admin/auth';
import { GmailWatchService } from '../server/services/gmail-watch.service';

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
    const user = await getAuth().getUserByEmail(userEmail);
    console.log(`✅ Found user: ${user.uid}`);

    console.log(`
Registering Gmail watch for ${userEmail}...`);
    const result = await GmailWatchService.registerWatchForAccount(user.uid, userEmail);

    if (!result) {
      throw new Error('Failed to register watch. Account or tokens might not be found.');
    }

    console.log('\n🔥 Gmail Watch Registered Successfully!');
    console.log('----------------------------------------');
    console.log('History ID:', result.historyId);
    console.log('Expires At:', result.expiration ? new Date(Number(result.expiration)).toISOString() : 'N/A');
    console.log('\nYour server will now receive notifications for new emails.');

  } catch (error) {
    console.error('❌ Error during re-registration:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
    } else {
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

