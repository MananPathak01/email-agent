import { Request, Response } from 'express';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/backend';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('CLERK_WEBHOOK_SECRET is not set');
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string;
  last_name: string;
  image_url: string;
}

interface UserDocument {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  lastSignedIn: string;
  createdAt: string;
  updatedAt: string;
}

async function handleUserSync(userData: ClerkUser) {
  const userId = userData.id;
  const userRef = doc(db, 'users', userId);
  
  const userSnapshot = await getDoc(userRef);
  const userExists = userSnapshot.exists();

  const user: UserDocument = {
    id: userId,
    email: userData.email_addresses?.[0]?.email_address,
    firstName: userData.first_name,
    lastName: userData.last_name,
    imageUrl: userData.image_url,
    lastSignedIn: new Date().toISOString(),
    createdAt: userExists ? userSnapshot.data()?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userRef, user, { merge: true });
  console.log(`User ${userExists ? 'updated' : 'created'} in Firestore:`, userId);
}

export async function handleWebhook(req: Request, res: Response) {
  try {
    // Verify the webhook signature
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Error occurred -- no svix headers' });
    }

    const payload = JSON.stringify(req.body);
    const wh = new Webhook(WEBHOOK_SECRET);
    
    try {
      const evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;

      const { type, data } = evt;

      // Handle the webhook event
      switch (type) {
        case 'user.created':
        case 'user.updated':
          await handleUserSync(data as ClerkUser);
          break;
        case 'user.deleted':
          // Optionally handle user deletion in Firebase
          break;
        default:
          console.log(`Unhandled event type: ${type}`);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return res.status(400).json({ error: 'Error verifying webhook' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
