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

// Sign in and get ID token
signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
  .then((userCredential) => {
    return userCredential.user.getIdToken();
  })
  .then((idToken) => {
    console.log('🔥 Your Test Token:');
    console.log('----------------------------');
    console.log(idToken);
    console.log('\n🔑 Use this token in your requests:');
    console.log(`Authorization: Bearer ${idToken}`);
    
    // Copy to clipboard if possible
    try {
      const { exec } = require('child_process');
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Windows
        exec(`echo ${idToken} | clip`);
      } else if (platform === 'darwin') {
        // macOS
        exec(`echo '${idToken}' | pbcopy`);
      } else if (platform === 'linux') {
        // Linux
        exec(`echo '${idToken}' | xclip -selection clipboard`);
      }
      console.log('✅ Token copied to clipboard!');
    } catch (e) {
      console.log('Could not copy to clipboard:', e.message);
    }
  })
  .catch((error) => {
    console.error('❌ Error getting token:');
    if (error.code === 'auth/user-not-found') {
      console.log('Test user does not exist. Please create a test user first.');
    } else {
      console.error(error.message);
    }
  });
