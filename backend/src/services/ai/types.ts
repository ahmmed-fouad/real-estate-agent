/**
 * AI Service Types
 * Type definitions for LLM integration
 * As per plan lines 360-372
 */

/**
 * LLM Message Interface
 * Represents a message in the conversation
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Token Usage Tracking
 * As per plan line 370: "Track token usage"
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * LLM Response Interface
 * Contains the generated response and metadata
 */
export interface LLMResponse {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
  finishReason: string;
  responseTime: number; // milliseconds
}

/**
 * Generation Options
 * Parameters for LLM generation
 */
export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * Prompt Template Variables
 * Variables used in prompt templates
 */
export interface PromptVariables {
  agentName?: string;
  developerNames?: string;
  context?: string;
  conversationHistory?: string;
  extractedInfo?: string;
  customerName?: string;
  language?: 'ar' | 'en' | 'auto';
}

/**
 * LLM Service Interface
 * Defines the contract for LLM service implementations
 * As per plan lines 361-372
 */
export interface ILLMService {
  /**
   * Generate a response from the LLM
   * @param systemPrompt - System-level instructions
   * @param userMessage - User's message
   * @param context - Additional context (optional)
   * @param options - Generation options (optional)
   */
  generateResponse(
    systemPrompt: string,
    userMessage: string,
    context?: string[],
    options?: GenerationOptions
  ): Promise<LLMResponse>;

  /**
   * Generate a response with message history
   * @param messages - Array of conversation messages
   * @param options - Generation options (optional)
   */
  generateFromMessages(
    messages: LLMMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse>;

  /**
   * Get token count estimation for text
   * @param text - Text to count tokens for
   */
  estimateTokens(text: string): number;
}

