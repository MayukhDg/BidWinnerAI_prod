import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Please add your OpenAI API key to .env.local');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export function createSystemPrompt(retrievedChunks, toneAnalysis, rfpRequirement, chatHistory) {
  const chunksText = retrievedChunks
    .map((chunk, idx) => `[Excerpt ${idx + 1}]\n${chunk.content}`)
    .join('\n\n');

  const historyText = chatHistory
    .slice(-10)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  return `You are Bidwinner AI, an expert RFP and grant proposal writer. Your goal is to help users write winning proposals by leveraging their past successful proposals.

Key principles:
1. Always reference and adapt content from the user's past winning proposals (provided in context)
2. Match the tone and style of the user's previous successful proposals
3. Rewrite past answers to precisely match new RFP requirements
4. Be concise, professional, and persuasive
5. Use specific examples and metrics from past wins when relevant

Context provided:
- Relevant excerpts from past winning proposals:
${chunksText}

- User's writing style from past chats: ${toneAnalysis || 'Professional and clear'}

- Current RFP requirement: ${rfpRequirement}

- Recent conversation history:
${historyText || 'No previous conversation'}

Based on the above context, provide a well-written response that adapts the user's past winning content to match the new RFP requirement.`;
}

export async function streamChatCompletion(messages, systemPrompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
    });

    return response;
  } catch (error) {
    console.error('Error creating chat completion:', error);
    throw error;
  }
}
