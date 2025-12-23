import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

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

    const { id: documentId } = await params;
    const documentsCollection = await getCollection('documents');
    const documentChunksCollection = await getCollection('documentChunks');

    // Verify ownership
    const document = await documentsCollection.findOne({
      _id: new ObjectId(documentId),
      userId: user._id,
    });

    if (!document) {
      return new Response('Document not found', { status: 404 });
    }

    // Delete chunks
    await documentChunksCollection.deleteMany({
      documentId: new ObjectId(documentId),
    });

    // Delete document
    await documentsCollection.deleteOne({
      _id: new ObjectId(documentId),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
