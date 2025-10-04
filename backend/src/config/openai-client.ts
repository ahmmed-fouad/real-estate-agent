/**
 * Shared OpenAI Client
 * Singleton OpenAI client to avoid duplicate initialization
 * Used by both LLM Service and Embedding Service
 */

import OpenAI from 'openai';
import { openaiConfig } from './openai.config';
import { createServiceLogger } from '../utils/logger';

const logger = createServiceLogger('OpenAIClient');

/**
 * Singleton OpenAI client instance
 * Shared across LLM and Embedding services to eliminate duplication
 */
class OpenAIClientManager {
  private static instance: OpenAI | null = null;

  /**
   * Get shared OpenAI client instance
   * Creates client on first call, returns same instance on subsequent calls
   */
  static getClient(): OpenAI {
    if (!OpenAIClientManager.instance) {
      logger.info('Initializing shared OpenAI client', {
        apiKeySet: !!openaiConfig.apiKey,
        organization: openaiConfig.organization,
        maxRetries: 3,
        timeout: 60000,
      });

      OpenAIClientManager.instance = new OpenAI({
        apiKey: openaiConfig.apiKey,
        organization: openaiConfig.organization,
        maxRetries: 3, // Retry logic for reliability
        timeout: 60000, // 60 second timeout
      });

      logger.info('Shared OpenAI client initialized successfully');
    }

    return OpenAIClientManager.instance;
  }

  /**
   * Reset client instance (useful for testing or reconfiguration)
   */
  static resetClient(): void {
    OpenAIClientManager.instance = null;
    logger.info('OpenAI client instance reset');
  }
}

/**
 * Export getter function for the shared client
 */
export const getOpenAIClient = (): OpenAI => {
  return OpenAIClientManager.getClient();
};

/**
 * Export reset function (for testing)
 */
export const resetOpenAIClient = (): void => {
  return OpenAIClientManager.resetClient();
};

