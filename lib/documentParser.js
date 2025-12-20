import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const CHUNK_SIZE = 1000; // tokens (approx 750 words)
const CHUNK_OVERLAP = 200; // tokens (approx 150 words)

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor(chunkSize * 0.75); // Approximate words per chunk
  const wordsOverlap = Math.floor(overlap * 0.75);

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunkWords = words.slice(start, end);
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.trim().length > 0) {
      chunks.push({
        content: chunkText,
        startIndex: start,
        endIndex: end,
      });
    }
    
    start = end - wordsOverlap;
  }

  return chunks;
}

export async function parsePDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    const chunks = chunkText(text);
    
    return {
      text,
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        metadata: {
          pageNumber: Math.floor(chunk.startIndex / 500) + 1, // Approximate page
        },
      })),
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

export async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const chunks = chunkText(text);
    
    return {
      text,
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        metadata: {},
      })),
    };
  } catch (error) {
    console.error('Error parsing Docx:', error);
    throw new Error('Failed to parse Docx file');
  }
}

export async function parseDocument(buffer, fileType) {
  if (fileType === 'pdf') {
    return await parsePDF(buffer);
  } else if (fileType === 'docx') {
    return await parseDocx(buffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}
