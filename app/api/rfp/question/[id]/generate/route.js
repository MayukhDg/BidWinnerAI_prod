import { getCollection } from '@/lib/mongodb';
import { searchSimilarChunks } from '@/lib/vectorSearch';
import { openai } from '@/lib/openai';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export async function POST(req, { params }) {
  try {
    const { id } = params;
    
    // 1. Get the question
    const questionsCollection = await getCollection('rfpQuestions');
    const question = await questionsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!question) {
      return new Response('Question not found', { status: 404 });
    }

    // 2. Search for context
    const contextChunks = await searchSimilarChunks(question.question, question.userId);
    const context = contextChunks.map(c => c.content).join('\n\n');

    // 3. Generate Answer
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert proposal writer. Answer the following RFP question based on the provided context.
          
          Context:
          ${context}
          
          Question: ${question.question}
          
          Answer:`
        }
      ]
    });
    
    const answer = completion.choices[0].message.content;

    return Response.json({ answer, contextUsed: contextChunks });

  } catch (error) {
    console.error('Generate error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
