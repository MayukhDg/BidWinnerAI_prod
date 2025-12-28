import { getCollection } from '@/lib/mongodb';
import { searchSimilarChunks } from '@/lib/vectorSearch';
import { openai } from '@/lib/openai';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { messages, currentAnswer } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // 1. Get the question details
    const questionsCollection = await getCollection('rfpQuestions');
    const questionDoc = await questionsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!questionDoc) {
      return new Response('Question not found', { status: 404 });
    }

    // 2. Determine search query
    // If it's the first message, use the RFP question. Otherwise use the user's last message.
    const lastUserMessage = messages[messages.length - 1];
    const searchQuery = messages.length === 1 ? questionDoc.question : lastUserMessage.content;

    // 3. Search for context
    const contextChunks = await searchSimilarChunks(searchQuery, questionDoc.userId);
    const context = contextChunks.map(c => c.content).join('\n\n');

    // 4. Construct System Prompt
    const systemPrompt = `You are an expert proposal writer assisting a user in answering a specific RFP question.
    
    Original RFP Question: "${questionDoc.question}"
    
    Current Draft Answer: "${currentAnswer || '(No draft yet)'}"
    
    Relevant Knowledge Base Context:
    ${context}
    
    Instructions:
    - Help the user refine the answer, find specific details, or rewrite sections.
    - Always base your facts on the provided Context.
    - If the Context doesn't contain the answer, admit it.
    - Be concise and professional.
    `;

    // 5. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });
    
    const reply = completion.choices[0].message.content;

    return Response.json({ reply, contextUsed: contextChunks });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
