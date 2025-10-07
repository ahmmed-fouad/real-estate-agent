/**
 * Embedding Service
 * Handles embedding generation using OpenAI
 * As per plan lines 425-439: "Embedding Generation"
 * 
 * Uses OpenAI text-embedding-3-large as specified in plan line 77
 */

import OpenAI from 'openai';
import { openaiConfig } from '../../config/openai.config';
import { getOpenAIClient } from '../../config/openai-client';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('EmbeddingService');

/**
 * Embedding Service Implementation
 * Generates embeddings for text using OpenAI
 * Uses shared OpenAI client to eliminate duplication
 */
export class EmbeddingService {
  private client: OpenAI;
  private model: string;

  constructor() {
    // Use shared OpenAI client (eliminates duplication)
    this.client = getOpenAIClient();

    // Use embedding model from config (text-embedding-3-large)
    this.model = openaiConfig.embeddingModel;

    logger.info('Embedding Service initialized', {
      model: this.model,
      usingSharedClient: true,
    });
  }

  /**
   * Generate embedding for a single text
   * As per plan lines 430-433
   * 
   * @param text - Text to generate embedding for
   * @returns Vector embedding (1536 dimensions for text-embedding-3-large)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();

    try {
      logger.debug('Generating embedding', {
        model: this.model,
        textLength: text.length,
      });

      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
        dimensions: 1536, // Reduce to 1536 for pgvector index compatibility
      });

      const embedding = response.data[0].embedding;
      const responseTime = Date.now() - startTime;

      logger.info('Embedding generated successfully', {
        model: response.model,
        dimensions: embedding.length,
        responseTime,
        usage: response.usage,
      });

      return embedding;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error generating embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        model: this.model,
        responseTime,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * As per plan lines 435-438
   * 
   * More efficient than calling generateEmbedding multiple times
   * 
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of vector embeddings
   */
  async batchEmbeddings(texts: string[]): Promise<number[][]> {
    const startTime = Date.now();

    try {
      if (texts.length === 0) {
        logger.warn('Batch embeddings called with empty array');
        return [];
      }

      logger.info('Generating batch embeddings', {
        model: this.model,
        count: texts.length,
        totalLength: texts.reduce((sum, t) => sum + t.length, 0),
      });

      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float',
        dimensions: 1536, // Reduce to 1536 for pgvector index compatibility
      });

      const embeddings = response.data.map((item) => item.embedding);
      const responseTime = Date.now() - startTime;

      logger.info('Batch embeddings generated successfully', {
        model: response.model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        responseTime,
        usage: response.usage,
      });

      return embeddings;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error generating batch embeddings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        model: this.model,
        count: texts.length,
        responseTime,
      });
      throw error;
    }
  }

  /**
   * Get embedding model information
   */
  getModelInfo(): { model: string; dimensions: number } {
    return {
      model: this.model,
      dimensions: 1536, // text-embedding-3-large dimension
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();

