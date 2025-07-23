// Simple script to get a Firebase ID token for testing
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test user credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

console.log('🔍 Attempting to sign in with test user...');
console.log('Using project ID:', firebaseConfig.projectId);

// Sign in and get ID token
signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
  .then((userCredential) => {
    console.log('✅ Successfully signed in!');
    return userCredential.user.getIdToken();
  })
  .then((idToken) => {
    console.log('\n🔥 Your Test Token:');
    console.log('----------------------------');
    console.log(idToken);
    console.log('\n🔑 Use this token in your requests:');
    console.log(`Authorization: Bearer ${idToken}`);
    
    // Try to copy to clipboard
    try {
      const { exec } = require('child_process');
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Windows
        exec(`echo ${idToken} | clip`);
        console.log('✅ Token copied to clipboard!');
      } else if (platform === 'darwin') {
        // macOS
        exec(`echo '${idToken}' | pbcopy`);
        console.log('✅ Token copied to clipboard!');
      } else if (platform === 'linux') {
        // Linux
        exec(`echo '${idToken}' | xclip -selection clipboard`);
        console.log('✅ Token copied to clipboard!');
      }
    } catch (e) {
      console.log('ℹ️ Could not copy to clipboard, please copy it manually');
    }
  })
  .catch((error) => {
    console.error('❌ Error getting token:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\nℹ️ The test user does not exist. Please create a user with:');
      console.log('Email:', TEST_EMAIL);
      console.log('Password:', TEST_PASSWORD);
      console.log('\nYou can create this user in the Firebase Console under Authentication.');
    }
  });
