import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as https from 'https';

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as admin.ServiceAccount),
});

// Function to make authenticated request
async function testAuth(token: string) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/gmail/accounts',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: json
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Get token from command line arguments
const token = process.argv[2];

if (!token) {
  console.error('Please provide a token as an argument');
  process.exit(1);
}

console.log('Testing token:', token);
console.log('Making request to /api/gmail/accounts...\n');

testAuth(token)
  .then((response: any) => {
    console.log('Response Status:', response.statusCode);
    console.log('Response Headers:', response.headers);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
  })
  .catch((error) => {
    console.error('Error:', error);
  });
