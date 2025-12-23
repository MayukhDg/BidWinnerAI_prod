import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { searchSimilarChunks, getChatHistoryForToneAnalysis, analyzeTone } from '@/lib/vectorSearch';
import { createSystemPrompt, streamChatCompletion } from '@/lib/openai';

export async function POST(req, { params }) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ clerkId: userId });
    
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const { chatId } = await params;
    const body = await req.json();
    const { content, rfpContext } = body;

    if (!content) {
      return new Response('Missing content', { status: 400 });
    }

    const messagesCollection = await getCollection('messages');
    const chatsCollection = await getCollection('chats');

    // Save user message
    const userMessage = {
      chatId: new ObjectId(chatId),
      userId: user._id,
      role: 'user',
      content,
      createdAt: new Date(),
      rfpContext: rfpContext || content,
    };

    await messagesCollection.insertOne(userMessage);

    // Get chat history for context
    const chatMessages = await messagesCollection
      .find({ chatId: new ObjectId(chatId) })
      .sort({ createdAt: 1 })
      .limit(20)
      .toArray();

    // Perform vector search to find relevant chunks
    const query = rfpContext || content;
    const relevantChunks = await searchSimilarChunks(query, user._id, 5);

    // Get user's past messages for tone analysis
    const pastMessages = await getChatHistoryForToneAnalysis(user._id, 50);
    const toneAnalysis = analyzeTone(pastMessages);

    // Create system prompt
    const systemPrompt = createSystemPrompt(
      relevantChunks,
      toneAnalysis,
      query,
      chatMessages.map(msg => ({ role: msg.role, content: msg.content }))
    );

    // Prepare messages for OpenAI
    const openAIMessages = chatMessages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    // Stream response
    const stream = await streamChatCompletion(openAIMessages, systemPrompt);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let assistantContent = '';
        const chunkIds = relevantChunks.map(chunk => chunk._id);

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              assistantContent += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          // Save assistant message
          const assistantMessage = {
            chatId: new ObjectId(chatId),
            userId: user._id,
            role: 'assistant',
            content: assistantContent,
            createdAt: new Date(),
            retrievedChunks: chunkIds,
            rfpContext: query,
          };

          await messagesCollection.insertOne(assistantMessage);

          // Update chat
          await chatsCollection.updateOne(
            { _id: new ObjectId(chatId) },
            {
              $set: { updatedAt: new Date() },
              $inc: { messageCount: 2 },
            }
          );

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Error streaming response:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat messages route:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
