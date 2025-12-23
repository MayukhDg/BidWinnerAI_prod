import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

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

    const { chatId } = await params;
    const messagesCollection = await getCollection('messages');
    
    // Only filter by chatId - userId check is done via chat ownership
    const rawMessages = await messagesCollection
      .find({ chatId: new ObjectId(chatId) })
      .sort({ createdAt: 1 })
      .toArray();

    // Serialize for JSON response
    const messages = rawMessages.map(msg => ({
      _id: msg._id?.toString(),
      chatId: msg.chatId?.toString(),
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt?.toISOString?.() ?? msg.createdAt,
    }));

    return Response.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(req, { params }) {
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

    const { chatId } = await params;
    const { title } = await req.json();

    if (!title || typeof title !== 'string') {
      return new Response('Invalid title', { status: 400 });
    }

    const chatsCollection = await getCollection('chats');
    
    // Verify ownership and update
    const result = await chatsCollection.findOneAndUpdate(
      { _id: new ObjectId(chatId), userId: user._id },
      { $set: { title: title.trim(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return new Response('Chat not found', { status: 404 });
    }

    return Response.json({
      _id: result._id?.toString() || chatId,
      title: result.title,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
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

    const { chatId } = await params;
    const chatsCollection = await getCollection('chats');
    const messagesCollection = await getCollection('messages');

    // Verify ownership before deleting
    const chat = await chatsCollection.findOne({ 
      _id: new ObjectId(chatId), 
      userId: user._id 
    });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    // Delete all messages in the chat
    await messagesCollection.deleteMany({ chatId: new ObjectId(chatId) });
    
    // Delete the chat
    await chatsCollection.deleteOne({ _id: new ObjectId(chatId) });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
