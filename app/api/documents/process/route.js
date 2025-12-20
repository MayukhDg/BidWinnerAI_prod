import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { parseDocument } from '@/lib/documentParser';
import { generateEmbeddingsStream } from '@/lib/embeddings';

// Maximum file size: 10MB
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Vercel function config - increase timeout for Pro/Enterprise plans
export const maxDuration = 60; // seconds (default is 10s on Hobby, 60s on Pro)

export async function POST(req) {
  try {
    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      return new Response('Missing documentId', { status: 400 });
    }

    const documentsCollection = await getCollection('documents');
    const document = await documentsCollection.findOne({
      _id: new ObjectId(documentId),
    });

    if (!document) {
      return new Response('Document not found', { status: 404 });
    }

    if (document.status === 'completed') {
      return Response.json({ message: 'Document already processed' });
    }

    // Update status to processing
    await documentsCollection.updateOne(
      { _id: new ObjectId(documentId) },
      { $set: { status: 'processing' } }
    );

    try {
      // Fetch file from UploadThing URL with size check via HEAD request
      const headResponse = await fetch(document.fileUrl, { method: 'HEAD' });
      const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
      
      if (contentLength > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large: ${(contentLength / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      }

      // Fetch file from UploadThing URL
      const fileResponse = await fetch(document.fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file');
      }
      const buffer = Buffer.from(await fileResponse.arrayBuffer());

      // Parse document
      const { chunks } = await parseDocument(buffer, document.fileType);
      console.log(`Parsed ${chunks.length} chunks from document ${documentId}`);

      // Limit total chunks to prevent very long processing
      const MAX_CHUNKS = 500;
      const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
      if (chunks.length > MAX_CHUNKS) {
        console.warn(`Document ${documentId} has ${chunks.length} chunks, processing first ${MAX_CHUNKS} only`);
      }

      // Process embeddings in batches and insert incrementally
      const documentChunksCollection = await getCollection('documentChunks');
      let totalChunks = 0;

      for await (const batchEmbeddings of generateEmbeddingsStream(chunksToProcess)) {
        const chunksToInsert = batchEmbeddings.map((chunk) => ({
          documentId: new ObjectId(documentId),
          userId: document.userId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: chunk.metadata || {},
        }));

        await documentChunksCollection.insertMany(chunksToInsert);
        totalChunks += chunksToInsert.length;
        console.log(`Inserted batch: ${totalChunks}/${chunksToProcess.length} chunks`);
      }

      // Update document status
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            status: 'completed',
            chunkCount: totalChunks,
          },
        }
      );

      return Response.json({
        success: true,
        chunkCount: totalChunks,
      });
    } catch (error) {
      console.error('Error processing document:', error);
      
      // Update status to failed with error message
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        { 
          $set: { 
            status: 'failed',
            error: error.message 
          } 
        }
      );

      return new Response(`Failed to process document: ${error.message}`, { status: 500 });
    }
  } catch (error) {
    console.error('Error in process route:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
