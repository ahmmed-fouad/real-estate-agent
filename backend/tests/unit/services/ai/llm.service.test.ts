import { LLMService } from '../../../../src/services/ai/llm.service';
import { LLMMessage, GenerationOptions } from '../../../../src/services/ai/types';

// Mock dependencies
jest.mock('../../../../src/config/openai-client');
jest.mock('../../../../src/config/openai.config');
jest.mock('../../../../src/services/language');
jest.mock('../../../../src/utils/logger');

describe('LLMService', () => {
  let llmService: LLMService;
  let mockOpenAIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Mock getOpenAIClient
    const { getOpenAIClient } = require('../../../../src/config/openai-client');
    getOpenAIClient.mockReturnValue(mockOpenAIClient);

    // Mock OpenAI config
    const { openaiConfig } = require('../../../../src/config/openai.config');
    openaiConfig.model = 'gpt-4';
    openaiConfig.maxTokens = 1000;
    openaiConfig.temperature = 0.7;

    // Mock language detection service
    const { languageDetectionService } = require('../../../../src/services/language');
    languageDetectionService.detectLanguage = jest.fn().mockResolvedValue('en');

    llmService = new LLMService();
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const systemPrompt = 'You are a helpful assistant';
      const userMessage = 'Hello';

      const result = await llmService.generateResponse(systemPrompt, userMessage);

      expect(result).toHaveProperty('content', 'This is a test response');
      expect(result).toHaveProperty('tokenUsage');
      expect(result.tokenUsage.totalTokens).toBe(15);
    });

    it('should handle API errors gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const systemPrompt = 'You are a helpful assistant';
      const userMessage = 'Hello';

      await expect(llmService.generateResponse(systemPrompt, userMessage)).rejects.toThrow('API Error');
    });

    it('should use custom options when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const systemPrompt = 'You are a helpful assistant';
      const userMessage = 'Hello';
      const options: GenerationOptions = {
        temperature: 0.5,
        maxTokens: 500,
      };

      await llmService.generateResponse(systemPrompt, userMessage, [], options);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 500,
        })
      );
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const systemPrompt = 'You are a helpful assistant';
      const userMessage = 'Hello';

      const result = await llmService.generateResponse(systemPrompt, userMessage);

      expect(result.content).toBe('');
    });
  });

  describe('generateFromMessages', () => {
    it('should generate response from message array', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Follow-up response' } }],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Tell me about properties' },
        { role: 'assistant', content: 'Here are some properties...' },
      ];

      const result = await llmService.generateFromMessages(messages);

      expect(result.content).toBe('Follow-up response');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(messages),
        })
      );
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'This is a test message with some words';
      const tokenCount = llmService.estimateTokens(text);

      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const tokenCount = llmService.estimateTokens('');
      expect(tokenCount).toBe(0);
    });
  });
});