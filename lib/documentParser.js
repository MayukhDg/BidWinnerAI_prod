import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

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

export async function parseDocx(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('word/document.xml not found in DOCX');
    }

    const xmlContent = await docXmlFile.async('string');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const json = parser.parse(xmlContent);

    // DOCX main content is under w:document > w:body, with text in w:t nodes
    const texts = [];

    function collectText(node) {
      if (!node || typeof node !== 'object') return;
      // w:t can be string or object containing text
      if (node['w:t'] !== undefined) {
        const t = node['w:t'];
        if (typeof t === 'string') {
          texts.push(t);
        } else if (t && t['#text']) {
          texts.push(t['#text']);
        }
      }
      // Recurse into children
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(collectText);
        } else if (typeof child === 'object') {
          collectText(child);
        }
      }
    }

    collectText(json['w:document']);

    const text = texts.join(' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 10) {
      throw new Error('No text content found in DOCX');
    }

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
    console.error('Error parsing DOCX (zip/xml):', error);
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
