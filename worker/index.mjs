/* Self-contained worker for document processing */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// ============ CONFIG ============
const REQUIRED_ENVS = ['MONGODB_URI', 'OPENAI_API_KEY', 'WORKER_API_KEY'];
for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.warn(`[worker] Warning: ${key} is not set`);
  }
}

// ============ OPENAI ============
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

// ============ MONGODB ============
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  fileName: String,
  fileUrl: String,
  fileKey: String,
  fileType: String,
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'processing' },
  chunkCount: { type: Number, default: 0 },
  processingProgress: Number,
  chunksProcessed: Number,
  totalChunks: Number,
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingFailedAt: Date,
  error: String,
});

const DocumentChunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  chunkIndex: Number,
  content: String,
  embedding: { type: [Number], index: false },
  metadata: Schema.Types.Mixed,
});

const RFPSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  title: String,
  status: { type: String, default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const RFPQuestionSchema = new Schema({
  rfpId: { type: Schema.Types.ObjectId, ref: 'RFP', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  question: String,
  answer: String,
  status: { type: String, default: 'pending' },
  assignedTo: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

let Document, DocumentChunk, RFP, RFPQuestion;
let dbConnected = false;

async function connectDB() {
  if (dbConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
  DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', DocumentChunkSchema);
  RFP = mongoose.models.RFP || mongoose.model('RFP', RFPSchema);
  RFPQuestion = mongoose.models.RFPQuestion || mongoose.model('RFPQuestion', RFPQuestionSchema);
  dbConnected = true;
  console.log('[worker] MongoDB connected');
}

// ============ DOCX PARSER ============
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS = 200;

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function chunkText(text) {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) {
    return [];
  }

  const wordsPerChunk = Math.max(1, Math.floor(CHUNK_SIZE * 0.75));
  const wordsOverlap = Math.min(Math.floor(CHUNK_OVERLAP * 0.75), Math.max(wordsPerChunk - 1, 0));
  const chunks = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunkWords = words.slice(start, end);
    const chunkContent = chunkWords.join(' ');
    if (chunkContent.trim().length > 0) {
      chunks.push({ content: chunkContent, startIndex: start, endIndex: end });
    }

    if (end === words.length) {
      break;
    }

    const nextStart = end - wordsOverlap;
    start = nextStart > start ? nextStart : end;
  }
  return chunks;
}

async function parseDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('word/document.xml not found in DOCX');

  let xmlContent = await docXmlFile.async('string');
  
  // Simple XML parsing to preserve structure
  const parts = [];
  // Match paragraphs, breaks, tabs, and text runs
  const regex = /<w:p[^>]*>|<\/w:p>|<w:br[^>]*\/>|<w:tab[^>]*\/>|<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  
  let match;
  while ((match = regex.exec(xmlContent)) !== null) {
    const tag = match[0];
    if (tag.startsWith('<w:p')) {
      // Start of paragraph - maybe add newline if not first?
    } else if (tag.startsWith('</w:p>')) {
      parts.push('\n');
    } else if (tag.startsWith('<w:br')) {
      parts.push('\n');
    } else if (tag.startsWith('<w:tab')) {
      parts.push('\t');
    } else if (tag.startsWith('<w:t')) {
      // Text content
      parts.push(decodeXmlEntities(match[1] || ''));
    }
  }

  const text = parts.join('').trim();
  if (!text || text.length < 10) throw new Error('No text content found in DOCX');

  let chunks = chunkText(text);
  if (chunks.length > MAX_CHUNKS) chunks = chunks.slice(0, MAX_CHUNKS);

  return {
    text,
    chunks: chunks.map((c, i) => ({ chunkIndex: i, content: c.content, metadata: {} })),
  };
}

async function parseDocument(buffer, fileType) {
  if (fileType === 'docx') return parseDocx(buffer);
  throw new Error(`Unsupported file type: ${fileType}. Only DOCX supported.`);
}

// ============ EXPRESS APP ============
const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), dbConnected });
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
    await connectDB();
    const { ObjectId } = mongoose.Types;

    const doc = await Document.findOne({ _id: new ObjectId(documentId) }).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await Document.updateOne(
      { _id: new ObjectId(documentId) },
      { $set: { status: 'processing', processingStartedAt: new Date() } }
    );

    console.log(`[worker] Fetching: ${doc.fileUrl}`);
    const response = await fetch(doc.fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[worker] Downloaded ${buffer.length} bytes`);

    const { chunks } = await parseDocument(buffer, doc.fileType);
    console.log(`[worker] Parsed ${chunks.length} chunks`);

    // Process embeddings in small batches
    const BATCH_SIZE = 5;
    let processed = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const insertDocs = [];

      for (const chunk of batch) {
        const embedding = await generateEmbedding(chunk.content);
        insertDocs.push({
          documentId: new ObjectId(documentId),
          userId: new ObjectId(doc.userId),
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding,
          metadata: chunk.metadata || {},
        });
      }

      await DocumentChunk.insertMany(insertDocs);
      processed += insertDocs.length;

      await Document.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            chunksProcessed: processed,
            totalChunks: chunks.length,
            processingProgress: Math.round((processed / chunks.length) * 100),
          },
        }
      );
      console.log(`[worker] Processed ${processed}/${chunks.length} chunks`);
    }

    await Document.updateOne(
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

    console.log(`[worker] Completed: ${documentId}`);
    res.json({ ok: true, documentId, chunkCount: chunks.length });
  } catch (err) {
    console.error('[worker] Error:', err);
    try {
      await connectDB();
      const { ObjectId } = mongoose.Types;
      await Document.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: { status: 'failed', error: err.message, processingFailedAt: new Date() } }
      );
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

app.post('/process-rfp', async (req, res) => {
  const auth = req.get('x-worker-key');
  if (!auth || auth !== process.env.WORKER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { documentId, rfpId } = req.body || {};
  if (!documentId || !rfpId) {
    return res.status(400).json({ error: 'documentId and rfpId are required' });
  }

  try {
    await connectDB();
    const { ObjectId } = mongoose.Types;

    const doc = await Document.findOne({ _id: new ObjectId(documentId) }).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await RFP.updateOne(
      { _id: new ObjectId(rfpId) },
      { $set: { status: 'processing' } }
    );

    console.log(`[worker] Fetching RFP doc: ${doc.fileUrl}`);
    const response = await fetch(doc.fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse to get full text
    const { text } = await parseDocument(buffer, doc.fileType);
    console.log(`[worker] Extracted ${text.length} chars from RFP`);
    console.log(`[worker] Preview: ${text.slice(0, 200)}...`);

    // Extract questions using OpenAI
    console.log('[worker] Sending to OpenAI for question extraction...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert RFP analyzer. Extract all questions, requirements, and compliance items from the provided RFP text. Return a JSON object with a key "questions" containing an array of strings. Each string should be a distinct question or requirement. If the text contains numbered lists or bullet points that look like requirements, include them.'
        },
        {
          role: 'user',
          content: text.slice(0, 100000) // Safety limit
        }
      ],
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0].message.content;
    console.log(`[worker] OpenAI Response: ${rawContent.slice(0, 500)}...`);

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      console.error('[worker] Failed to parse OpenAI JSON:', e);
      throw new Error('Failed to parse AI response');
    }

    const questions = result.questions || [];
    console.log(`[worker] Extracted ${questions.length} questions`);

    if (questions.length > 0) {
      const questionDocs = questions.map(q => ({
        rfpId: new ObjectId(rfpId),
        userId: new ObjectId(doc.userId),
        question: q,
        status: 'pending'
      }));
      await RFPQuestion.insertMany(questionDocs);
    }

    await RFP.updateOne(
      { _id: new ObjectId(rfpId) },
      { $set: { status: 'completed' } }
    );

    // Trigger Webhook
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      await fetch(`${appUrl}/api/rfp/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-key': process.env.WORKER_API_KEY,
        },
        body: JSON.stringify({ rfpId, status: 'completed' }),
      });
    } catch (e) {
      console.error('[worker] Failed to trigger webhook:', e);
    }

    res.json({ ok: true, questionCount: questions.length });

  } catch (err) {
    console.error('[worker] RFP Error:', err);
    try {
      await connectDB();
      const { ObjectId } = mongoose.Types;
      await RFP.updateOne(
        { _id: new ObjectId(rfpId) },
        { $set: { status: 'failed' } }
      );
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.WORKER_PORT || 4000;
app.listen(PORT, () => {
  console.log(`[worker] Listening on port ${PORT}`);
});
