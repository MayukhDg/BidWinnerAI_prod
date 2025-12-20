import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

async function processDocumentAsync(documentId) {
  // Call the process endpoint internally
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/documents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to process document: ${response.statusText}`);
  }
  return response.json();
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
    const document = {
      userId: user._id,
      fileName,
      fileUrl,
      fileKey,
      fileType,
      uploadedAt: new Date(),
      status: 'processing',
      chunkCount: 0,
    };

    const result = await documentsCollection.insertOne(document);

    // Trigger processing (async) - use internal API call
    // Note: In production, you might want to use a queue system
    processDocumentAsync(result.insertedId.toString()).catch(console.error);

    return Response.json({ ...document, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
