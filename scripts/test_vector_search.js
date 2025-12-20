/*
 CommonJS-friendly test script: connects with mongoose, inserts a test
 document chunk (with random embedding), attempts an Atlas Search KNN
 aggregate (may fail if Atlas Search not configured), then cleans up.
*/
const mongoose = require('mongoose');

async function run() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bidwinnerai';
    console.log('Connecting to MongoDB:', uri.includes('mongodb') ? '[configured URI]' : uri);
    await mongoose.connect(uri);

    const ObjectId = mongoose.Types.ObjectId;
    const coll = mongoose.connection.collection('documentchunks');

    const emb = new Array(1536).fill(0).map(() => Math.random());
    console.log('Using embedding length:', emb.length);

    const userId = new ObjectId();
    const documentId = new ObjectId();

    const doc = {
      documentId,
      userId,
      chunkIndex: 0,
      content: 'Test chunk for vector search at ' + new Date().toISOString(),
      embedding: emb,
      metadata: { source: 'test-script' },
    };

    console.log('Inserting test chunk into collection `documentchunks`...');
    const insertResult = await coll.insertOne(doc);
    console.log('Inserted id:', insertResult.insertedId.toString());

    const pipeline = [
      {
        $search: {
          index: 'vector_index',
          knnBeta: {
            vector: emb,
            path: 'embedding',
            k: 3,
            filter: { equals: { path: 'userId', value: userId } },
              },
        },
      },
      { $limit: 3 },
      { $project: { content: 1, documentId: 1, chunkIndex: 1, metadata: 1 } },
    ];

    try {
      const results = await coll.aggregate(pipeline).toArray();
      console.log('KNN results:', results);
    } catch (aggErr) {
      console.error('Aggregate/$search error (likely due to missing Atlas Search vector index or non-Atlas cluster):', aggErr.message || aggErr);
    }

    // cleanup
    try {
      await coll.deleteOne({ _id: insertResult.insertedId });
      console.log('Cleaned up test chunk.');
    } catch (e) {
      console.error('Cleanup failed:', e.message || e);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test script fatal error:', err);
    try { await mongoose.disconnect(); } catch {};
    process.exit(1);
  }
}

run();
