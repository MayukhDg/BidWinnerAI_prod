import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { parseDocument } from '@/lib/documentParser';
import { generateEmbeddingsForChunks } from '@/lib/embeddings';

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
      // Fetch file from UploadThing URL
      const fileResponse = await fetch(document.fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file');
      }
      const buffer = Buffer.from(await fileResponse.arrayBuffer());

      // Parse document
      const { chunks } = await parseDocument(buffer, document.fileType);

      // Generate embeddings
      const chunksWithEmbeddings = await generateEmbeddingsForChunks(chunks);

      // Store chunks in database
      const documentChunksCollection = await getCollection('documentChunks');
      const chunksToInsert = chunksWithEmbeddings.map((chunk) => ({
        documentId: new ObjectId(documentId),
        userId: document.userId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata || {},
      }));

      await documentChunksCollection.insertMany(chunksToInsert);

      // Update document status
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            status: 'completed',
            chunkCount: chunksToInsert.length,
          },
        }
      );

      return Response.json({
        success: true,
        chunkCount: chunksToInsert.length,
      });
    } catch (error) {
      console.error('Error processing document:', error);
      
      // Update status to failed
      await documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: { status: 'failed' } }
      );

      return new Response('Failed to process document', { status: 500 });
    }
  } catch (error) {
    console.error('Error in process route:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
