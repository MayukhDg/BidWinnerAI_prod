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

    const chatsCollection = await getCollection('chats');
    
    // Pro users have unlimited chats, free users limited to 1
    const isPro = user.subscriptionTier === 'pro';
    
    if (!isPro) {
      const MAX_CHATS_FREE = 1;
      const existingChatCount = await chatsCollection.countDocuments({ userId: user._id });

      if (existingChatCount >= MAX_CHATS_FREE) {
        return Response.json(
          {
            error: 'You have reached the chat limit. Upgrade to Pro for unlimited chats.',
            limit: MAX_CHATS_FREE,
            requiresUpgrade: true,
          },
          { status: 400 }
        );
      }
    }

    const { title } = await req.json();

    const chat = {
      userId: user._id,
      title: title || 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };

    const result = await chatsCollection.insertOne(chat);

    return Response.json({
      ...chat,
      _id: result.insertedId?.toString(),
      userId: chat.userId?.toString(),
      createdAt: chat.createdAt?.toISOString?.() ?? chat.createdAt,
      updatedAt: chat.updatedAt?.toISOString?.() ?? chat.updatedAt,
    });
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

    const serialized = chats.map((chat) => ({
      ...chat,
      _id: chat._id?.toString(),
      userId: chat.userId?.toString(),
      createdAt: chat.createdAt?.toISOString?.() ?? chat.createdAt,
      updatedAt: chat.updatedAt?.toISOString?.() ?? chat.updatedAt,
    }));

    return Response.json(serialized);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
