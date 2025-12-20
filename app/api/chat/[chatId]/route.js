import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req, { params }) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ clerkId: userId });
    
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const chatId = params.chatId;
    const messagesCollection = await getCollection('messages');
    
    const messages = await messagesCollection
      .find({ chatId: new ObjectId(chatId), userId: user._id })
      .sort({ createdAt: 1 })
      .toArray();

    return Response.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
