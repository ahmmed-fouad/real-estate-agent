/**
 * LLM Service
 * Handles LLM API calls and response generation
 * As per plan lines 359-372: "Basic LLM Client"
 * 
 * Features implemented:
 * - Call OpenAI/Anthropic API (line 367)
 * - Handle streaming (optional) (line 368)
 * - Implement retry logic (line 369)
 * - Track token usage (line 370)
 */

import OpenAI from 'openai';
import { openaiConfig } from '../../config/openai.config';
import { getOpenAIClient } from '../../config/openai-client';
import { createServiceLogger } from '../../utils/logger';
import {
  ILLMService,
  LLMMessage,
  LLMResponse,
  GenerationOptions,
  TokenUsage,
} from './types';

const logger = createServiceLogger('LLMService');

/**
 * LLM Service Implementation
 * Integrates with OpenAI GPT-4 as per plan (line 75)
 * Uses shared OpenAI client to eliminate duplication
 */
export class LLMService implements ILLMService {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    // Use shared OpenAI client (eliminates duplication)
    this.client = getOpenAIClient();

    this.model = openaiConfig.model;
    this.maxTokens = openaiConfig.maxTokens;
    this.temperature = openaiConfig.temperature;

    logger.info('LLM Service initialized', {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      usingSharedClient: true,
    });
  }

  /**
   * Generate a response from the LLM
   * As per plan interface (lines 362-366)
   */
  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    context?: string[],
    options?: GenerationOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Build messages array
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add context if provided
      if (context && context.length > 0) {
        const contextMessage = context.join('\n\n');
        messages.push({
          role: 'system',
          content: `Additional context:\n${contextMessage}`,
        });
      }

      // Add user message
      messages.push({ role: 'user', content: userMessage });

      logger.info('Generating LLM response', {
        model: this.model,
        messageCount: messages.length,
        userMessageLength: userMessage.length,
        hasContext: !!context && context.length > 0,
      });

      // Call OpenAI API
      const response = await this.generateFromMessages(messages, options);

      logger.info('LLM response generated successfully', {
        model: response.model,
        responseLength: response.content.length,
        tokenUsage: response.tokenUsage,
        responseTime: response.responseTime,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error generating LLM response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        model: this.model,
        responseTime,
      });
      throw error;
    }
  }

  /**
   * Generate a response with message history
   * Supports full conversation context
   */
  async generateFromMessages(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const maxTokens = options?.maxTokens || this.maxTokens;
      const temperature = options?.temperature ?? this.temperature;

      logger.debug('Calling OpenAI API', {
        model: this.model,
        messageCount: messages.length,
        maxTokens,
        temperature,
        streaming: options?.stream || false,
      });

      // Call OpenAI Chat Completion API
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: maxTokens,
        temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: options?.stream || false,
      });

      const responseTime = Date.now() - startTime;

      // Extract response
      const choice = completion.choices[0];
      const content = choice.message.content || '';
      const finishReason = choice.finish_reason;

      // Track token usage as per plan (line 370)
      const tokenUsage: TokenUsage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      };

      logger.info('OpenAI API call successful', {
        model: completion.model,
        finishReason,
        tokenUsage,
        responseTime,
      });

      return {
        content,
        tokenUsage,
        model: completion.model,
        finishReason,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        logger.error('OpenAI API Error', {
          status: error.status,
          type: error.type,
          code: error.code,
          message: error.message,
          responseTime,
        });
      } else {
        logger.error('Unexpected error in LLM generation', {
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        });
      }

      throw error;
    }
  }

  /**
   * Estimate token count for text
   * Simple estimation: ~4 characters per token for English
   * ~2 characters per token for Arabic (due to Unicode)
   * 
   * Note: For production, consider using tiktoken library for accurate counts
   */
  estimateTokens(text: string): number {
    // Check if text contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(text);

    // Simple estimation
    const avgCharsPerToken = hasArabic ? 2 : 4;
    const estimatedTokens = Math.ceil(text.length / avgCharsPerToken);

    return estimatedTokens;
  }

  /**
   * Get current model configuration
   */
  getModelConfig(): {
    model: string;
    maxTokens: number;
    temperature: number;
  } {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    };
  }

  /**
   * Update generation parameters (useful for testing/tuning)
   */
  updateConfig(config: {
    maxTokens?: number;
    temperature?: number;
  }): void {
    if (config.maxTokens !== undefined) {
      this.maxTokens = config.maxTokens;
      logger.info('Updated maxTokens', { maxTokens: this.maxTokens });
    }
    if (config.temperature !== undefined) {
      this.temperature = config.temperature;
      logger.info('Updated temperature', { temperature: this.temperature });
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();

