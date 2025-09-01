import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Verify required environment variables
const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('Current FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '***' : 'Not set');
  console.log('Current FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '***' : 'Not set');
  console.log('Current FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '***' : 'Not set');
  process.exit(1);
}

async function main() {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error('❌ Please provide a user email address as an argument.');
    console.log('Usage: npx tsx scripts/generateTestToken.ts <user-email>');
    process.exit(1);
  }
  try {
    console.log('Initializing Firebase Admin...');
    
    // Format private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    
    // Initialize Firebase Admin if not already initialized
    const app = getApps().length === 0 ? 
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      }) : getApp();
      
    const auth = getAuth(app);
    console.log('✅ Firebase Admin initialized successfully');

    // Get user by email
    let user;
    try {
      console.log(`Looking up user by email: ${userEmail}...`);
      user = await auth.getUserByEmail(userEmail);
      console.log(`Found user: ${user.uid}`);
    } catch (error: any) {
      console.error(`❌ Could not find user with email: ${userEmail}`);
      throw error;
    }

    // Generate a custom token
    console.log('Generating custom token...');
    const customToken = await auth.createCustomToken(user.uid);
    
    console.log('\n🔥 Test User Token Generated Successfully!');
    console.log('----------------------------------------');
    console.log('User ID:', user.uid);
    console.log('Email:', user.email);
    console.log('\n🔑 Use this token in your Authorization header:');
    console.log(`Authorization: Bearer ${customToken}`);
    console.log('\n🔗 Test the token with curl:');
    console.log(`curl -H "Authorization: Bearer ${customToken}" http://localhost:3000/api/gmail/accounts`);
    
    return customToken;
  } catch (error) {
    console.error('❌ Error generating test token:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
