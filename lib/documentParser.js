import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

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
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser(null, true); // true = don't combine text items
      
      pdfParser.on('pdfParser_dataError', (errData) => {
        console.error('PDF parse error:', errData.parserError);
        reject(new Error(`Failed to parse PDF: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          // Extract text from all pages
          let text = '';
          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const textItem of page.Texts) {
                  if (textItem.R) {
                    for (const r of textItem.R) {
                      if (r.T) {
                        // Decode URI-encoded text
                        text += decodeURIComponent(r.T) + ' ';
                      }
                    }
                  }
                }
              }
              text += '\n'; // Page break
            }
          }
          
          text = text.trim();
          
          if (!text) {
            reject(new Error('No text content found in PDF'));
            return;
          }
          
          // Limit text size to prevent memory issues
          const maxChars = 500000;
          const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;
          
          const chunks = chunkText(truncatedText);
          
          resolve({
            text: truncatedText,
            chunks: chunks.map((chunk, index) => ({
              chunkIndex: index,
              content: chunk.content,
              metadata: {
                pageNumber: Math.floor(chunk.startIndex / 500) + 1,
              },
            })),
          });
        } catch (error) {
          reject(new Error(`Failed to process PDF data: ${error.message}`));
        }
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      reject(new Error(`Failed to initialize PDF parser: ${error.message}`));
    }
  });
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
