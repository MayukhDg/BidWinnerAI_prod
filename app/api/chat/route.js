import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';

export async function POST(req) {
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

    const body = await req.json();
    const { title } = body;

    const chatsCollection = await getCollection('chats');
    const chat = {
      userId: user._id,
      title: title || 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };

    const result = await chatsCollection.insertOne(chat);

    return Response.json({ ...chat, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function GET(req) {
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

    const chatsCollection = await getCollection('chats');
    const chats = await chatsCollection
      .find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .toArray();

    return Response.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
