import JSZip from 'jszip';

const CHUNK_SIZE = 1000; // tokens (approx 750 words)
const CHUNK_OVERLAP = 200; // tokens (approx 150 words)
const MAX_CHUNKS = 200; // hard cap to avoid memory spikes

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) {
    return [];
  }

  const wordsPerChunk = Math.max(1, Math.floor(chunkSize * 0.75));
  const wordsOverlap = Math.min(Math.floor(overlap * 0.75), Math.max(wordsPerChunk - 1, 0));
  const chunks = [];

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

    if (end === words.length) {
      break;
    }

    const nextStart = end - wordsOverlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

export async function parseDocx(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('word/document.xml not found in DOCX');
    }

    let xmlContent = await docXmlFile.async('string');
    // Normalize some special tags to whitespace
    xmlContent = xmlContent
      .replace(/<w:tab\s*\/?>/g, ' ')
      .replace(/<w:br\s*\/?>/g, '\n')
      .replace(/<w:cr\s*\/?>/g, '\n');

    // Extract text from <w:t>...</w:t> without building a large object graph
    const texts = [];
    const wtRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let match;
    while ((match = wtRegex.exec(xmlContent)) !== null) {
      const raw = match[1] || '';
      texts.push(decodeXmlEntities(raw));
      // Guard against pathological regex behavior
      if (texts.length > 200000) {
        throw new Error('DOCX appears malformed: excessive text nodes');
      }
    }

    const text = texts.join(' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 10) {
      throw new Error('No text content found in DOCX');
    }

    let chunks = chunkText(text);
    if (chunks.length > MAX_CHUNKS) {
      chunks = chunks.slice(0, MAX_CHUNKS);
    }

    return {
      text,
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        metadata: {},
      })),
    };
  } catch (error) {
    console.error('Error parsing DOCX (regex xml):', error);
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
}

export async function parseDocument(buffer, fileType) {
  if (fileType === 'docx') {
    return await parseDocx(buffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Only DOCX files are supported.`);
  }
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
