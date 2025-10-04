/**
 * Text Chunker Service
 * Implements text chunking as per plan line 443: "Chunk text appropriately (e.g., 500 tokens per chunk)"
 * Uses LangChain for intelligent text splitting
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('TextChunker');

/**
 * Text Chunk Interface
 */
export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    chunkSize: number;
    totalChunks: number;
  };
}

/**
 * Text Chunker Service
 * As per plan line 443: "Chunk text appropriately (e.g., 500 tokens per chunk)"
 * 
 * Uses LangChain RecursiveCharacterTextSplitter for intelligent splitting
 * that respects sentence boundaries
 */
export class TextChunkerService {
  private splitter: RecursiveCharacterTextSplitter;
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor() {
    // Configure chunking as per plan (500 tokens ≈ 2000 characters)
    this.chunkSize = 2000; // ~500 tokens
    this.chunkOverlap = 200; // 10% overlap for context continuity

    // Initialize LangChain text splitter
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', ''], // Respect sentence boundaries
    });

    logger.info('Text Chunker Service initialized', {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      framework: 'LangChain',
    });
  }

  /**
   * Split text into chunks
   * As per plan line 443
   * 
   * @param text - Text to chunk
   * @param minChunkSize - Minimum chunk size (don't split if text is smaller)
   * @returns Array of text chunks
   */
  async chunkText(text: string, minChunkSize: number = 500): Promise<TextChunk[]> {
    try {
      // If text is smaller than minimum, return as single chunk
      if (text.length < minChunkSize) {
        logger.debug('Text is small, returning as single chunk', {
          textLength: text.length,
          minChunkSize,
        });

        return [
          {
            content: text,
            index: 0,
            metadata: {
              chunkSize: text.length,
              totalChunks: 1,
            },
          },
        ];
      }

      logger.debug('Chunking text', {
        textLength: text.length,
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
      });

      // Use LangChain splitter
      const chunks = await this.splitter.createDocuments([text]);

      logger.info('Text chunked successfully', {
        originalLength: text.length,
        chunks: chunks.length,
        avgChunkSize: Math.round(text.length / chunks.length),
      });

      // Convert LangChain documents to our TextChunk interface
      return chunks.map((chunk, index) => ({
        content: chunk.pageContent,
        index,
        metadata: {
          chunkSize: chunk.pageContent.length,
          totalChunks: chunks.length,
        },
      }));
    } catch (error) {
      logger.error('Error chunking text', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Get chunk configuration
   */
  getConfig(): { chunkSize: number; chunkOverlap: number } {
    return {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    };
  }
}

// Export singleton instance
export const textChunker = new TextChunkerService();


