/* Minimal worker to process documents off-serverless */
'use strict';

const express = require('express');

const app = express();
app.use(express.json({ limit: '25mb' }));

const REQUIRED_ENVS = ['MONGODB_URI', 'OPENAI_API_KEY', 'WORKER_API_KEY'];
for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.warn(`[worker] Warning: ${key} is not set`);
  }
}

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.post('/process-document', async (req, res) => {
  const auth = req.get('x-worker-key');
  if (!auth || auth !== process.env.WORKER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { documentId } = req.body || {};
  if (!documentId) {
    return res.status(400).json({ error: 'documentId is required' });
  }

  try {
    const [{ getCollection }, mongooseMod, { parseDocument }, { generateEmbeddingsStream }] = await Promise.all([
      import('../lib/mongodb.js'),
      import('mongoose'),
      import('../lib/documentParser.js'),
      import('../lib/embeddings.js'),
    ]);

    const mongoose = mongooseMod.default || mongooseMod;
    const { ObjectId } = mongoose.Types;

    const documentsCollection = await getCollection('documents');
    const documentChunksCollection = await getCollection('documentChunks');

    const doc = await documentsCollection.findOne({ _id: new ObjectId(documentId) });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await documentsCollection.updateOne(
      { _id: new ObjectId(documentId) },
      { $set: { status: 'processing', processingStartedAt: new Date() } }
    );

    console.log(`[worker] Fetching document: ${doc.fileUrl}`);
    let contentLength = 0;
    try {
      const headResponse = await fetch(doc.fileUrl, { method: 'HEAD' });
      contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);
      console.log(`[worker] File size: ${(contentLength / 1024 / 1024).toFixed(2)}MB`);
    } catch (e) {
      console.log('[worker] HEAD failed, continue with GET:', e.message);
    }

    const response = await fetch(doc.fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[worker] Downloaded ${buffer.length} bytes`);

    const { chunks } = await parseDocument(buffer, doc.fileType);
    console.log(`[worker] Parsed ${chunks.length} chunks`);

    // Process embeddings in small batches (streamed)
    let processed = 0;
    for await (const batchEmbeddings of generateEmbeddingsStream(chunks)) {
      const insertDocs = batchEmbeddings.map((c) => ({
        documentId: new ObjectId(documentId),
        userId: new ObjectId(doc.userId),
        chunkIndex: c.chunkIndex,
        content: c.content,
        embedding: c.embedding,
        metadata: c.metadata || {},
      }));
      await documentChunksCollection.insertMany(insertDocs);
      processed += insertDocs.length;

      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            chunksProcessed: processed,
            totalChunks: chunks.length,
            processingProgress: Math.round((processed / chunks.length) * 100),
          },
        }
      );
    }

    await documentsCollection.updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          status: 'completed',
          chunkCount: chunks.length,
          processingCompletedAt: new Date(),
          processingProgress: 100,
        },
      }
    );

    res.json({ ok: true, documentId, chunkCount: chunks.length });
  } catch (err) {
    console.error('[worker] Error:', err);
    try {
      const { getCollection } = await import('../lib/mongodb.js');
      const mongooseMod = await import('mongoose');
      const mongoose = mongooseMod.default || mongooseMod;
      const { ObjectId } = mongoose.Types;
      const documentsCollection = await getCollection('documents');
      await documentsCollection.updateOne(
        { _id: new ObjectId(req.body.documentId) },
        { $set: { status: 'failed', error: err.message, processingFailedAt: new Date() } }
      );
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.WORKER_PORT || process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[worker] Listening on port ${PORT}`);
});
