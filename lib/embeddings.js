import { generateEmbedding } from './openai';

const BATCH_SIZE = 5; // smaller batches for lower memory usage

export async function generateEmbeddingsForChunks(chunks, onBatchComplete = null) {
  const embeddings = [];
  
  // Process in batches to avoid memory issues
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = [];
    
    for (const chunk of batch) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        batchEmbeddings.push({
          ...chunk,
          embedding,
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.chunkIndex}:`, error);
        throw error;
      }
    }
    
    // If a callback is provided, call it with the batch (for incremental DB inserts)
    if (onBatchComplete) {
      await onBatchComplete(batchEmbeddings);
    } else {
      embeddings.push(...batchEmbeddings);
    }
    
    console.log(`Processed embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
  }
  
  return embeddings;
}

// Stream version that yields batches instead of collecting all in memory
export async function* generateEmbeddingsStream(chunks) {
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = [];
    
    for (const chunk of batch) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        batchEmbeddings.push({
          ...chunk,
          embedding,
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.chunkIndex}:`, error);
        throw error;
      }
    }
    
    yield batchEmbeddings;
  }
}
