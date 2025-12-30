import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { inngest } from '@/lib/inngest/client';

export const dynamic = 'force-dynamic';

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
    const rfpsCollection = await getCollection('rfps');

    // Find all documents that are linked to RFPs
    const rfps = await rfpsCollection
      .find({ userId: user._id }, { projection: { documentId: 1 } })
      .toArray();
    
    const rfpDocumentIds = rfps.map(r => r.documentId);

    const documents = await documentsCollection
      .find({ 
        userId: user._id,
        purpose: { $ne: 'rfp_source' }, // Filter out new RFP docs
        _id: { $nin: rfpDocumentIds }   // Filter out legacy RFP docs
      })
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
    const { fileName, fileUrl, fileKey, fileType, purpose = 'knowledge_base' } = body;

    if (!fileName || !fileUrl || !fileKey || !fileType) {
      return new Response('Missing required fields', { status: 400 });
    }

    const documentsCollection = await getCollection('documents');
    
    const document = {
      userId: user._id,
      fileName,
      fileUrl,
      fileKey,
      fileType,
      purpose,
      uploadedAt: new Date(),
      status: 'processing', // Initial status
    };

    const result = await documentsCollection.insertOne(document);
    const documentId = result.insertedId;

    // Trigger Inngest event
    await inngest.send({
      name: 'document/process.requested',
      data: {
        documentId: documentId.toString(),
        userId: user._id.toString(),
        fileUrl,
        fileKey,
        fileType,
      },
    });

    return Response.json({ ...document, _id: documentId });
  } catch (error) {
    console.error('Error uploading document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
