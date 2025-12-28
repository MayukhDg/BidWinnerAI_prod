import { getCollection } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { rfpId, question } = await req.json();
    if (!rfpId || !question) return new Response('Missing fields', { status: 400 });

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ clerkId: userId });
    if (!user) return new Response('User not found', { status: 404 });

    const questionsCollection = await getCollection('rfpQuestions');
    
    const newQuestion = {
      rfpId: new ObjectId(rfpId),
      userId: user._id,
      question,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await questionsCollection.insertOne(newQuestion);
    
    return Response.json({ ...newQuestion, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating question:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
