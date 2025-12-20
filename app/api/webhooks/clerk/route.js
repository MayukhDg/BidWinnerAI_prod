import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name } = evt.data;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const usersCollection = await getCollection('users');
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email_addresses[0]?.email_address || 'User';

    await usersCollection.updateOne(
      { clerkId: id },
      {
        $set: {
          clerkId: id,
          email: email_addresses[0]?.email_address || '',
          name: name,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          subscriptionTier: 'free',
        },
      },
      { upsert: true }
    );
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
