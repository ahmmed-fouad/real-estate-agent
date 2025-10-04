/**
 * OpenAI Configuration
 * Configuration for OpenAI API integration
 * As per plan line 75: "LLM Provider: OpenAI GPT-4"
 */

import { config } from 'dotenv';

config();

/**
 * OpenAI Configuration Interface
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  embeddingModel: string;
  maxTokens: number;
  temperature: number;
  organization?: string;
}

/**
 * Get OpenAI configuration from environment variables
 * Validates required settings as per plan requirements
 */
export const getOpenAIConfig = (): OpenAIConfig => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required. Please set it in your .env file.'
    );
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4';
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
  const maxTokens = parseInt(process.env.MAX_TOKENS || '500', 10);
  const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.7');
  const organization = process.env.OPENAI_ORGANIZATION;

  return {
    apiKey,
    model,
    embeddingModel,
    maxTokens,
    temperature,
    organization,
  };
};

/**
 * Export singleton config
 */
export const openaiConfig = getOpenAIConfig();

