import { inngest } from './client';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { parseDocument } from '@/lib/documentParser';
import { generateEmbeddingsStream } from '@/lib/embeddings';

const { ObjectId } = mongoose.Types;

// Maximum file size: 5MB for Vercel serverless (conservative for memory)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Process document function - runs as a background job
 * Handles: fetching file, parsing, generating embeddings, storing chunks
 */
export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    name: 'Process Document',
    // Retry configuration for resilience
    retries: 3,
    // Cancel if a new version of the same document is queued
    cancelOn: [
      {
        event: 'document/process.requested',
        if: 'async.data.documentId == event.data.documentId',
      },
    ],
  },
  { event: 'document/process.requested' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Get document from database
    const document = await step.run('get-document', async () => {
      const documentsCollection = await getCollection('documents');
      const doc = await documentsCollection.findOne({
        _id: new ObjectId(documentId),
      });
      
      if (!doc) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Return plain object (Inngest serializes between steps)
      return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileName: doc.fileName,
        status: doc.status,
      };
    });

    // Skip if already processed
    if (document.status === 'completed') {
      return { message: 'Document already processed', documentId };
    }

    // Step 2: Update status to processing
    await step.run('update-status-processing', async () => {
      const documentsCollection = await getCollection('documents');
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: { status: 'processing', processingStartedAt: new Date() } }
      );
    });

    // Step 3: Fetch, validate, and parse in ONE step to avoid serializing large buffers
    const chunks = await step.run('fetch-and-parse', async () => {
      console.log(`Fetching document from: ${document.fileUrl}`);
      
      // Check file size first
      let contentLength = 0;
      try {
        const headResponse = await fetch(document.fileUrl, { method: 'HEAD' });
        contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
        console.log(`File size: ${(contentLength / 1024 / 1024).toFixed(2)}MB`);
      } catch (headError) {
        console.log('HEAD request failed, proceeding with GET:', headError.message);
      }
      
      if (contentLength > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large: ${(contentLength / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      }

      // Fetch the file
      console.log('Fetching file content...');
      const response = await fetch(document.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Downloaded ${buffer.length} bytes`);
      
      // Parse immediately - don't hold buffer longer than needed
      console.log(`Parsing ${document.fileType} document...`);
      const { chunks } = await parseDocument(buffer, document.fileType);
      console.log(`Parsed ${chunks.length} chunks from document ${documentId}`);
      
      // Only return the text content, not any large data
      return chunks.map(c => ({
        chunkIndex: c.chunkIndex,
        content: c.content,
        metadata: c.metadata || {},
      }));
    });

    // Step 5: Process embeddings in batches
    // Using step.run for each batch ensures progress is saved
    const BATCH_SIZE = 20; // Process 20 chunks at a time
    let totalProcessed = 0;
    const numBatches = Math.ceil(chunks.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);

      await step.run(`process-batch-${batchIndex}`, async () => {
        const documentChunksCollection = await getCollection('documentChunks');
        
        // Generate embeddings for this batch
        for await (const batchEmbeddings of generateEmbeddingsStream(batchChunks)) {
          const chunksToInsert = batchEmbeddings.map((chunk) => ({
            documentId: new ObjectId(documentId),
            userId: new ObjectId(document.userId),
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: chunk.embedding,
            metadata: chunk.metadata || {},
          }));

          await documentChunksCollection.insertMany(chunksToInsert);
        }
        
        console.log(`Processed batch ${batchIndex + 1}/${numBatches} for document ${documentId}`);
      });

      totalProcessed += batchChunks.length;
      
      // Update progress
      await step.run(`update-progress-${batchIndex}`, async () => {
        const documentsCollection = await getCollection('documents');
        await documentsCollection.updateOne(
          { _id: new ObjectId(documentId) },
          { 
            $set: { 
              processingProgress: Math.round((totalProcessed / chunks.length) * 100),
              chunksProcessed: totalProcessed,
              totalChunks: chunks.length,
            } 
          }
        );
      });
    }

    // Step 6: Mark as completed
    await step.run('mark-completed', async () => {
      const documentsCollection = await getCollection('documents');
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            status: 'completed',
            chunkCount: chunks.length,
            processingProgress: 100,
            processingCompletedAt: new Date(),
          },
        }
      );
    });

    return {
      success: true,
      documentId,
      chunkCount: chunks.length,
    };
  }
);

/**
 * Handle processing failure - update document status
 */
export const handleProcessingFailure = inngest.createFunction(
  {
    id: 'handle-processing-failure',
    name: 'Handle Processing Failure',
  },
  { event: 'inngest/function.failed' },
  async ({ event, step }) => {
    // Only handle our process-document function failures
    if (event.data.function_id !== 'process-document') {
      return;
    }

    const originalEvent = event.data.event;
    const documentId = originalEvent?.data?.documentId;

    if (!documentId) {
      console.error('No documentId in failed event');
      return;
    }

    await step.run('mark-failed', async () => {
      const documentsCollection = await getCollection('documents');
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            status: 'failed',
            error: event.data.error?.message || 'Unknown error',
            processingFailedAt: new Date(),
          },
        }
      );
    });

    return { marked: 'failed', documentId };
  }
);

// Export all functions
export const functions = [processDocument, handleProcessingFailure];
