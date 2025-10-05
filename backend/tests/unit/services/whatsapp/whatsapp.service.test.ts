import { WhatsAppService } from '../../../../src/services/whatsapp/whatsapp.service';
import { WhatsAppMessage, TemplateMessage } from '../../../../src/services/whatsapp/types';

// Mock dependencies
jest.mock('../../../../src/config/whatsapp.config');
jest.mock('../../../../src/services/rate-limiter');
jest.mock('../../../../src/utils/logger');
jest.mock('axios');

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WhatsApp config
    const { whatsappConfig } = require('../../../../src/config/whatsapp.config');
    whatsappConfig.accountSid = 'test-account-sid';
    whatsappConfig.whatsappNumber = '+1234567890';
    whatsappConfig.apiUrl = 'https://api.twilio.com/2010-04-01';
    whatsappConfig.authToken = 'test-auth-token';

    // Mock rate limiter
    const { whatsappRateLimiter } = require('../../../../src/services/rate-limiter');
    whatsappRateLimiter.checkLimit = jest.fn().mockResolvedValue(true);

    // Mock axios
    const axios = require('axios');
    mockAxios = {
      post: jest.fn(),
      get: jest.fn(),
    };
    axios.create = jest.fn().mockReturnValue(mockAxios);

    whatsappService = new WhatsAppService();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const mockResponse = {
        data: {
          sid: 'message-sid-123',
          status: 'queued',
          to: '+1234567890',
          from: '+0987654321',
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const message: WhatsAppMessage = {
        to: '+1234567890',
        type: 'text',
        body: 'Hello, this is a test message',
      };

      const result = await whatsappService.sendMessage(message);

      expect(result).toHaveProperty('messageId', 'message-sid-123');
      expect(result).toHaveProperty('status', 'queued');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/Messages.json'),
        expect.stringContaining('To=%2B1234567890'),
        expect.any(Object)
      );
    });

    it('should send media message successfully', async () => {
      const mockResponse = {
        data: {
          sid: 'message-sid-456',
          status: 'queued',
          to: '+1234567890',
          from: '+0987654321',
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const message: WhatsAppMessage = {
        to: '+1234567890',
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
        caption: 'Check out this property',
      };

      const result = await whatsappService.sendMessage(message);

      expect(result).toHaveProperty('messageId', 'message-sid-456');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/Messages.json'),
        expect.stringContaining('MediaUrl=https%3A//example.com/image.jpg'),
        expect.any(Object)
      );
    });

    it('should handle rate limiting', async () => {
      const { whatsappRateLimiter } = require('../../../../src/services/rate-limiter');
      whatsappRateLimiter.checkLimit.mockResolvedValue(false);

      const message: WhatsAppMessage = {
        to: '+1234567890',
        type: 'text',
        body: 'Hello',
      };

      await expect(whatsappService.sendMessage(message)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle API errors', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            code: 21211,
            message: 'Invalid phone number',
          },
        },
      };

      mockAxios.post.mockRejectedValue(axiosError);

      const message: WhatsAppMessage = {
        to: 'invalid-number',
        type: 'text',
        body: 'Hello',
      };

      await expect(whatsappService.sendMessage(message)).rejects.toThrow('Invalid phone number');
    });

    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      const message: WhatsAppMessage = {
        to: '+1234567890',
        type: 'text',
        body: 'Hello',
      };

      await expect(whatsappService.sendMessage(message)).rejects.toThrow('Network error');
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message successfully', async () => {
      const mockResponse = {
        data: {
          sid: 'template-sid-123',
          status: 'queued',
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const templateMessage: TemplateMessage = {
        to: '+1234567890',
        template: 'property_inquiry',
        language: 'en',
        parameters: ['John', 'Villa in New Cairo'],
      };

      const result = await whatsappService.sendTemplateMessage(templateMessage);

      expect(result).toHaveProperty('messageId', 'template-sid-123');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/Messages.json'),
        expect.stringContaining('TemplateName=property_inquiry'),
        expect.any(Object)
      );
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse incoming message webhook', () => {
      const webhookPayload = {
        AccountSid: 'account-123',
        MessageSid: 'message-123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'Hello, I need help',
        MessageType: 'text',
        Timestamp: '2023-01-01T12:00:00Z',
      };

      const parsed = whatsappService.parseWebhookPayload(webhookPayload);

      expect(parsed).toHaveProperty('messageId', 'message-123');
      expect(parsed).toHaveProperty('from', '+1234567890');
      expect(parsed).toHaveProperty('to', '+0987654321');
      expect(parsed).toHaveProperty('content', 'Hello, I need help');
      expect(parsed).toHaveProperty('type', 'text');
    });

    it('should parse media message webhook', () => {
      const webhookPayload = {
        AccountSid: 'account-123',
        MessageSid: 'message-456',
        From: '+1234567890',
        To: '+0987654321',
        MediaUrl0: 'https://example.com/image.jpg',
        MediaContentType0: 'image/jpeg',
        Caption: 'Check this out',
        MessageType: 'image',
        Timestamp: '2023-01-01T12:00:00Z',
        Body: '',
      };

      const parsed = whatsappService.parseWebhookPayload(webhookPayload);

      expect(parsed).toHaveProperty('type', 'image');
      expect(parsed).toHaveProperty('mediaUrl', 'https://example.com/image.jpg');
      expect(parsed).toHaveProperty('caption', 'Check this out');
    });

    it('should handle location message webhook', () => {
      const webhookPayload = {
        AccountSid: 'account-123',
        MessageSid: 'message-789',
        From: '+1234567890',
        To: '+0987654321',
        Latitude: '30.0444',
        Longitude: '31.2357',
        MessageType: 'location',
        Timestamp: '2023-01-01T12:00:00Z',
        Body: '',
      };

      const parsed = whatsappService.parseWebhookPayload(webhookPayload);

      expect(parsed).toHaveProperty('type', 'location');
      expect(parsed).toHaveProperty('latitude', 30.0444);
      expect(parsed).toHaveProperty('longitude', 31.2357);
    });
  });
});