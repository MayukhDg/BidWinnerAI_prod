import { headers } from 'next/headers';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local');
  }

  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook using svix (installed as an optional dependency).
  let evt;
  try {
    const { Webhook } = await import('svix');
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('svix verification failed:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  const rawData = evt.data || {};

  // Normalize possible shapes from Clerk/Svix
  const id = rawData.id || rawData.user?.id || rawData.user_id || rawData.subject || rawData.user?.subject;
  const email_addresses = rawData.email_addresses || rawData.emails || rawData.user?.email_addresses || rawData.user?.emails || [];
  const first_name = rawData.first_name || rawData.user?.first_name || rawData.user?.firstName || '';
  const last_name = rawData.last_name || rawData.user?.last_name || rawData.user?.lastName || '';

  console.log('Clerk webhook event:', { eventType, id, emails: email_addresses?.length });

  if (eventType === 'user.created' || eventType === 'user.updated') {
    if (!id) {
      console.error('Webhook missing user id, skipping upsert', { eventType, rawData });
    } else {
      try {
        const usersCollection = await getCollection('users');
        const name = `${first_name || ''} ${last_name || ''}`.trim() || email_addresses[0]?.email_address || 'User';

        await usersCollection.updateOne(
          { clerkId: id },
          {
            $set: {
              clerkId: id,
              email: email_addresses[0]?.email_address || email_addresses[0]?.email || rawData.email || '',
              name: name,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
              subscriptionTier: 'free',
              credits: 1,
            },
          },
          { upsert: true }
        );
      } catch (dbErr) {
        console.error('Error upserting Clerk user to DB:', dbErr);
        return new Response('DB error', { status: 500 });
      }
    }
  }

  if (eventType === 'user.deleted') {
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ clerkId: id });
    
    if (user) {
      const userId = user._id;
      
      // Delete user's documents and chunks
      const documentsCollection = await getCollection('documents');
      const documentChunksCollection = await getCollection('documentChunks');
      const chatsCollection = await getCollection('chats');
      const messagesCollection = await getCollection('messages');
      
      // Delete document chunks
      await documentChunksCollection.deleteMany({ userId });
      
      // Delete documents
      await documentsCollection.deleteMany({ userId });
      
      // Delete messages
      await messagesCollection.deleteMany({ userId });
      
      // Delete chats
      await chatsCollection.deleteMany({ userId });
      
      // Delete user
      await usersCollection.deleteOne({ clerkId: id });
    }
  }

  return new Response('', { status: 200 });
}
