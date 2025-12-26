import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { inngest } from '@/lib/inngest/client';

const { ObjectId } = mongoose.Types;

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

    const documentsCollection = await getCollection('documents');
    const documents = await documentsCollection
      .find({ userId: user._id })
      .sort({ uploadedAt: -1 })
      .toArray();

    return Response.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

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
    const { fileName, fileUrl, fileKey, fileType } = body;

    if (!fileName || !fileUrl || !fileKey || !fileType) {
      return new Response('Missing required fields', { status: 400 });
    }

    const documentsCollection = await getCollection('documents');
    
    // Pro users have unlimited documents, free users limited to 10
    const isPro = user.subscriptionTier === 'pro';
    
    if (!isPro) {
      const MAX_DOCUMENTS_FREE = 10;
      const existingDocumentCount = await documentsCollection.countDocuments({ userId: user._id });

      if (existingDocumentCount >= MAX_DOCUMENTS_FREE) {
        return Response.json(
          {
            error: 'Document upload limit reached. Upgrade to Pro for unlimited uploads.',
            limit: MAX_DOCUMENTS_FREE,
            requiresUpgrade: true,
          },
          { status: 400 }
        );
      }
    }

    const document = {
      userId: user._id,
      fileName,
      fileUrl,
      fileKey,
      fileType,
      uploadedAt: new Date(),
      status: 'pending',
      chunkCount: 0,
      processingProgress: 0,
    };

    const result = await documentsCollection.insertOne(document);
    const documentId = result.insertedId.toString();

    // Send event to Inngest for background processing
    await inngest.send({
      name: 'document/process.requested',
      data: {
        documentId,
        userId: user._id.toString(),
      },
    });

    return Response.json({ 
      ...document, 
      _id: result.insertedId,
      status: 'processing', // Return as processing since job is queued
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
