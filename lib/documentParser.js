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
  // Use external PDF.co API for reliable PDF parsing
  // This avoids memory issues on serverless platforms
  const apiKey = process.env.PDFCO_API_KEY;
  
  if (!apiKey) {
    // Fallback: basic text extraction attempt using fetch to a free service
    console.log('No PDFCO_API_KEY found, using fallback extraction...');
    return extractPDFTextFallback(buffer);
  }
  
  try {
    // Upload to PDF.co and extract text
    const base64 = buffer.toString('base64');
    
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: `data:application/pdf;base64,${base64}`,
        inline: true,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`PDF.co API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(`PDF.co error: ${result.message}`);
    }
    
    // Fetch the text content
    const textResponse = await fetch(result.url);
    const text = await textResponse.text();
    
    const chunks = chunkText(text.trim());
    
    return {
      text: text.trim(),
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        metadata: {
          pageNumber: Math.floor(chunk.startIndex / 500) + 1,
        },
      })),
    };
  } catch (error) {
    console.error('PDF.co parsing error:', error);
    // Try fallback
    return extractPDFTextFallback(buffer);
  }
}

// Simple fallback that extracts visible text strings from PDF
async function extractPDFTextFallback(buffer) {
  try {
    // Convert buffer to string and extract text between parentheses (PDF text objects)
    const pdfString = buffer.toString('latin1');
    
    // Extract text from PDF streams - basic pattern matching
    const textMatches = [];
    
    // Pattern 1: Text in parentheses (common in PDFs)
    const parenRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenRegex.exec(pdfString)) !== null) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\\/g, '\\')
        .replace(/\\([()])/g, '$1');
      if (text.length > 2 && /[a-zA-Z]{2,}/.test(text)) {
        textMatches.push(text);
      }
    }
    
    // Pattern 2: Hexadecimal text strings
    const hexRegex = /<([0-9A-Fa-f]+)>/g;
    while ((match = hexRegex.exec(pdfString)) !== null) {
      try {
        const hex = match[1];
        let text = '';
        for (let i = 0; i < hex.length; i += 2) {
          const charCode = parseInt(hex.substr(i, 2), 16);
          if (charCode >= 32 && charCode < 127) {
            text += String.fromCharCode(charCode);
          }
        }
        if (text.length > 2 && /[a-zA-Z]{2,}/.test(text)) {
          textMatches.push(text);
        }
      } catch (e) {
        // Skip invalid hex
      }
    }
    
    const text = textMatches.join(' ').replace(/\s+/g, ' ').trim();
    
    if (!text || text.length < 10) {
      throw new Error('Could not extract meaningful text from PDF. The PDF may be image-based or encrypted.');
    }
    
    const chunks = chunkText(text);
    
    return {
      text,
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        metadata: {
          pageNumber: 1, // Can't determine pages with fallback
        },
      })),
    };
  } catch (error) {
    console.error('Fallback PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}. Consider using a text-based PDF or DOCX file.`);
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
