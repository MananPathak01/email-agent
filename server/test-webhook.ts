import { Webhook } from 'svix';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('CLERK_WEBHOOK_SECRET is not set in .env');
}

// Sample Clerk user data
const userData = {
  id: `user_${uuidv4()}`,
  email_addresses: [
    {
      email_address: 'test@example.com',
      id: 'em_123',
      linked_to: [],
      verification: { status: 'verified', strategy: 'from_oauth_google' },
    },
  ],
  first_name: 'Test',
  last_name: 'User',
  image_url: 'https://example.com/avatar.jpg',
};

// Create a test webhook event
const payload = {
  type: 'user.created',
  data: userData,
  object: 'event',
  id: `evt_${uuidv4()}`,
};

// Sign the webhook
const wh = new Webhook(WEBHOOK_SECRET);
const headers = {
  'svix-id': uuidv4(),
  'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
};

// @ts-ignore - The types are incorrect for the sign method
const signature = wh.sign(JSON.stringify(payload), headers);
headers['svix-signature'] = signature;

// Log the test request
console.log('Test Webhook Request:');
console.log('URL: POST /api/webhooks/clerk');
console.log('Headers:', JSON.stringify(headers, null, 2));
console.log('Body:', JSON.stringify(payload, null, 2));

console.log('\nTo test, you can use curl:');
console.log(`curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: ${headers['svix-id']}" \
  -H "svix-timestamp: ${headers['svix-timestamp']}" \
  -H "svix-signature: ${signature}" \
  -d '${JSON.stringify(payload)}'`);
