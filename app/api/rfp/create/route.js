import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

export async function POST(req) {
  try {
    const { documentId, title } = await req.json();

    if (!documentId || !title) {
      return new Response('Missing documentId or title', { status: 400 });
    }

    const rfpsCollection = await getCollection('rfps');
    const documentsCollection = await getCollection('documents');

    const document = await documentsCollection.findOne({
      _id: new ObjectId(documentId),
    });

    if (!document) {
      return new Response('Document not found', { status: 404 });
    }

    // Create RFP record
    const rfp = {
      userId: document.userId,
      documentId: new ObjectId(documentId),
      title,
      status: 'draft',
      createdAt: new Date(),
    };

    const result = await rfpsCollection.insertOne(rfp);
    const rfpId = result.insertedId;

    // Trigger Worker
    // Ensure no trailing slash in URL
    const workerUrl = (process.env.WORKER_URL || 'http://localhost:4000').replace(/\/$/, '');
    const workerKey = process.env.WORKER_API_KEY;

    // Fire and forget (or await if we want to block until worker accepts)
    try {
      const response = await fetch(`${workerUrl}/process-rfp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-key': workerKey,
        },
        body: JSON.stringify({
          documentId,
          rfpId: rfpId.toString(),
        }),
      });

      if (!response.ok) {
        console.error('Worker failed to accept RFP task:', await response.text());
        throw new Error('Worker failed to accept task');
      }
    } catch (error) {
      console.error('Failed to contact worker:', error);
      // Mark RFP as failed so user knows
      await rfpsCollection.updateOne(
        { _id: rfpId },
        { $set: { status: 'failed' } }
      );
      return new Response('Failed to start processing worker. Is it running?', { status: 503 });
    }

    return Response.json({ rfpId });
  } catch (error) {
    console.error('Error creating RFP:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
