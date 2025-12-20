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

    // Step 3: Delegate heavy work to external worker if configured
    const delegated = await step.run('delegate-to-worker', async () => {
      const workerUrl = process.env.WORKER_URL;
      const workerKey = process.env.WORKER_API_KEY;
      if (!workerUrl || !workerKey) {
        return { delegated: false };
      }
      const resp = await fetch(`${workerUrl.replace(/\/$/, '')}/process-document`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-worker-key': workerKey,
        },
        body: JSON.stringify({ documentId }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Worker responded ${resp.status}: ${txt}`);
      }
      return { delegated: true };
    });

    if (delegated.delegated) {
      return { success: true, documentId, delegated: true };
    }

    // Fallback: inline processing (not recommended for large files)
    const chunks = await step.run('fallback-fetch-and-parse', async () => {
      console.log(`Fallback processing for: ${document.fileUrl}`);
      const response = await fetch(document.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { chunks } = await parseDocument(buffer, document.fileType);
      return chunks.map(c => ({ chunkIndex: c.chunkIndex, content: c.content, metadata: c.metadata || {} }));
    });

    // Minimal inline embeddings to keep behavior when no worker
    let totalProcessed = 0;
    const BATCH_SIZE_INLINE = 10;
    const numBatches = Math.ceil(chunks.length / BATCH_SIZE_INLINE);
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE_INLINE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE_INLINE, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);
      await step.run(`fallback-process-batch-${batchIndex}`, async () => {
        const documentChunksCollection = await getCollection('documentChunks');
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
      });
      totalProcessed += batchChunks.length;
      await step.run(`fallback-progress-${batchIndex}`, async () => {
        const documentsCollection = await getCollection('documents');
        await documentsCollection.updateOne(
          { _id: new ObjectId(documentId) },
          { $set: { processingProgress: Math.round((totalProcessed / chunks.length) * 100) } }
        );
      });
    }

    await step.run('fallback-completed', async () => {
      const documentsCollection = await getCollection('documents');
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: { status: 'completed', chunkCount: chunks.length, processingProgress: 100, processingCompletedAt: new Date() } }
      );
    });

    return { success: true, documentId, delegated: false };
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
