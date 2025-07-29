import { google } from 'googleapis';
import 'dotenv/config';
import fetch from 'node-fetch';

// Since we can't directly import TypeScript modules, we'll recreate the necessary functions
const crypto = await import('crypto');

// Recreate the decrypt function logic
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY = (process.env.EMAIL_AGENT_TOKEN_KEY || '').slice(0, 32);

function getKey() {
  return Buffer.from(KEY.padEnd(32, '0'));
}

function decrypt(cipherText) {
  if (!KEY) return cipherText;
  try {
    const data = Buffer.from(cipherText, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
    const text = data.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.log('Decryption failed:', error.message);
    return cipherText;
  }
}

// Firebase admin setup
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const adminDb = admin.firestore();

// Debug script to check what tokens are stored and if they work
async function debugTokens() {
  console.log('=== Gmail Token Debug Script ===\n');
  
  // Check environment variables
  console.log('1. Environment Variables:');
  console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  console.log('   GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI ? 'SET' : 'MISSING');
  console.log('   EMAIL_AGENT_TOKEN_KEY:', process.env.EMAIL_AGENT_TOKEN_KEY ? 'SET' : 'MISSING');
  console.log('');

  try {
    console.log('2. Finding users with email accounts...');
    const usersRef = adminDb.collection('users');
    const usersSnapshot = await usersRef.get();
    
    if (usersSnapshot.empty) {
      console.log('   No users found in database');
      return;
    }
    
    console.log(`   Found ${usersSnapshot.docs.length} user(s), checking for email accounts...`);
    
    let foundAccounts = false;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const accountsRef = adminDb.collection('users').doc(userId).collection('email_accounts');
      const snapshot = await accountsRef.get();
      
      if (!snapshot.empty) {
        console.log(`\n   User ID: ${userId}`);
        foundAccounts = true;
        console.log(`   Found ${snapshot.docs.length} email account(s)`);
    
        for (const doc of snapshot.docs) {
          const account = doc.data();
          console.log(`\n     Account ID: ${doc.id}`);
          console.log(`     Email: ${account.email}`);
          console.log(`     Provider: ${account.provider}`);
          console.log(`     Access Token (first 20 chars): ${account.accessToken?.substring(0, 20)}...`);
          console.log(`     Refresh Token (first 20 chars): ${account.refreshToken?.substring(0, 20)}...`);
          
          // Try to decrypt tokens
          console.log('\n3. Testing token decryption...');
          let decryptedAccessToken, decryptedRefreshToken;
          
          try {
            decryptedAccessToken = decrypt(account.accessToken);
            decryptedRefreshToken = decrypt(account.refreshToken);
            console.log('     ✅ Token decryption successful');
            console.log(`     Decrypted Access Token (first 20 chars): ${decryptedAccessToken?.substring(0, 20)}...`);
          } catch (error) {
            console.log('     ❌ Token decryption failed:', error.message);
            console.log('     Using tokens as plaintext...');
            decryptedAccessToken = account.accessToken;
            decryptedRefreshToken = account.refreshToken;
          }
          
          // Test OAuth2 client setup
          console.log('\n4. Testing OAuth2 client setup...');
          try {
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              process.env.GOOGLE_REDIRECT_URI
            );
            
            oauth2Client.setCredentials({
              access_token: decryptedAccessToken,
              refresh_token: decryptedRefreshToken,
              expiry_date: account.tokenExpiry
            });
            
            console.log('     ✅ OAuth2 client setup successful');
            
            // Test token validation
            console.log('\n5. Testing token validation...');
            const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${decryptedAccessToken}`);
            
            if (tokenInfoResponse.ok) {
              const tokenData = await tokenInfoResponse.json();
              console.log('     ✅ Token is valid');
              console.log('     Scopes:', tokenData.scope);
              console.log('     Expires in:', tokenData.expires_in, 'seconds');
              
              // Check for required Gmail scopes
              const scopes = tokenData.scope?.split(' ') || [];
              const requiredScopes = [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify'
              ];
              
              const hasRequiredScopes = requiredScopes.some(scope => scopes.includes(scope));
              if (hasRequiredScopes) {
                console.log('     ✅ Has required Gmail scopes');
              } else {
                console.log('     ❌ Missing required Gmail scopes');
                console.log('     Required:', requiredScopes);
                console.log('     Available:', scopes);
              }
              
            } else {
              console.log('     ❌ Token validation failed:', tokenInfoResponse.status, tokenInfoResponse.statusText);
              const errorText = await tokenInfoResponse.text();
              console.log('     Error details:', errorText);
            }
            
            // Test Gmail API call
            console.log('\n6. Testing Gmail API call...');
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            try {
              const profile = await gmail.users.getProfile({ userId: 'me' });
              console.log('     ✅ Gmail API call successful');
              console.log('     Email:', profile.data.emailAddress);
              console.log('     Messages total:', profile.data.messagesTotal);
            } catch (gmailError) {
              console.log('     ❌ Gmail API call failed:', gmailError.message);
              if (gmailError.code) {
                console.log('     Error code:', gmailError.code);
              }
            }
            
          } catch (error) {
            console.log('     ❌ OAuth2 client setup failed:', error.message);
          }
        }
      }
    }
    
    if (!foundAccounts) {
      console.log('   No email accounts found in any user profiles');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

debugTokens().catch(console.error);
