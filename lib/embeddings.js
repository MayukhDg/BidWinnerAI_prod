import { generateEmbedding } from './openai';

export async function generateEmbeddingsForChunks(chunks) {
  const embeddings = [];
  
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);
      embeddings.push({
        ...chunk,
        embedding,
      });
    } catch (error) {
      console.error(`Error generating embedding for chunk ${chunk.chunkIndex}:`, error);
      throw error;
    }
  }
  
  return embeddings;
}
