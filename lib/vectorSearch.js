import mongoose from 'mongoose';
import { generateEmbedding } from './openai';
import { getCollection } from './mongodb';

const { ObjectId } = mongoose.Types;

export async function searchSimilarChunks(query, userId, limit = 10) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Perform vector search in MongoDB
    const collection = await getCollection('documentChunks');
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const knnK = Math.max(limit * 5, limit);
    
    const results = await collection.aggregate([
      {
        $search: {
          index: 'vector_index',
          knnBeta: {
            vector: queryEmbedding,
            path: 'embedding',
            k: knnK,
          },
        },
      },
      {
        $match: {
          userId: userIdObj,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          content: 1,
          documentId: 1,
          chunkIndex: 1,
          metadata: 1,
        },
      },
    ]);

    console.log('Vector search results', {
      querySnippet: query.slice(0, 80),
      userId: userIdObj?.toString?.() ?? userIdObj,
      resultCount: Array.isArray(results) ? results.length : 'non-array',
    });

    return results;
  } catch (error) {
    console.error('Error performing vector search:', error);
    throw error;
  }
}

export async function getChatHistoryForToneAnalysis(userId, limit = 50) {
  try {
    const messagesCollection = await getCollection('messages');
    
    const messages = await messagesCollection
      .find({ userId, role: 'user' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return messages.map(msg => msg.content);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

export function analyzeTone(userMessages) {
  if (!userMessages || userMessages.length === 0) {
    return 'Professional and clear';
  }

  // Simple tone analysis based on common patterns
  const allText = userMessages.join(' ').toLowerCase();
  
  let tone = 'Professional';
  
  if (allText.includes('urgent') || allText.includes('asap')) {
    tone += ', urgent';
  }
  
  if (allText.includes('please') || allText.includes('thank')) {
    tone += ', polite';
  }
  
  if (allText.length > 1000) {
    tone += ', detailed';
  } else if (allText.length < 200) {
    tone += ', concise';
  }

  return tone;
}
