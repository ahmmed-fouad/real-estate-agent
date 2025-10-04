/**
 * WhatsApp Service
 * Handles sending and receiving messages via 360dialog WhatsApp Business API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { whatsappConfig } from '../../config/whatsapp.config';
import { createServiceLogger } from '../../utils/logger';
import { whatsappRateLimiter } from '../rate-limiter';
import {
  WhatsAppMessage,
  SendMessageResponse,
  WhatsAppError,
  TemplateMessage,
  ParsedMessage,
  WebhookPayload,
} from './types';

const logger = createServiceLogger('WhatsAppService');

export class WhatsAppService {
  private client: AxiosInstance;
  private phoneNumberId: string;

  constructor() {
    this.phoneNumberId = whatsappConfig.phoneNumberId;

    // Initialize Axios client with 360dialog configuration
    this.client = axios.create({
      baseURL: whatsappConfig.apiUrl,
      headers: {
        'D360-API-KEY': whatsappConfig.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: AxiosError<WhatsAppError>) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );

    // Configure retry logic as per plan (line 265)
    axiosRetry(this.client, {
      retries: 3, // Retry up to 3 times
      retryDelay: (retryCount) => {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount - 1) * 1000;
        logger.info('Retrying request', { retryCount, delayMs: delay });
        return delay;
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        const shouldRetry =
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status ?? 0) >= 500;

        if (shouldRetry) {
          logger.warn('Request failed, will retry', {
            error: error.message,
            status: error.response?.status,
            retryable: true,
          });
        }

        return shouldRetry;
      },
      onRetry: (retryCount, error) => {
        logger.info('Executing retry', {
          retryCount,
          error: error.message,
          url: error.config?.url,
        });
      },
    });

    logger.info('WhatsApp Service initialized', {
      phoneNumberId: this.phoneNumberId,
      apiUrl: whatsappConfig.apiUrl,
      retryEnabled: true,
      maxRetries: 3,
    });
  }

  /**
   * Send a message to WhatsApp
   * Implements Redis-based distributed rate limiting and error handling
   * As per plan line 240: "Handle rate limiting"
   */
  async sendMessage(message: WhatsAppMessage): Promise<SendMessageResponse> {
    try {
      logger.info('Sending WhatsApp message', {
        to: message.to,
        type: message.type,
      });

      // Check rate limit before sending
      const rateLimitCheck = await whatsappRateLimiter.checkLimit();

      if (!rateLimitCheck.allowed) {
        const error = new Error('Rate limit exceeded');
        logger.error('Cannot send message - rate limit exceeded', {
          to: message.to,
          remaining: rateLimitCheck.remaining,
          resetIn: rateLimitCheck.resetIn,
          limit: rateLimitCheck.limit,
        });
        throw error;
      }

      logger.debug('Rate limit check passed', {
        remaining: rateLimitCheck.remaining,
        limit: rateLimitCheck.limit,
      });

      // Send message via 360dialog API
      const response = await this.client.post<SendMessageResponse>('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: message.type,
        ...this.formatMessageContent(message),
      });

      // Increment rate limit counter after successful send
      await whatsappRateLimiter.increment();

      logger.info('Message sent successfully', {
        to: message.to,
        messageId: response.data.messages[0].id,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send message', {
        to: message.to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send a text message (convenience method)
   */
  async sendTextMessage(to: string, text: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'text',
      text: {
        body: text,
      },
    });
  }

  /**
   * Send an image message
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    });
  }

  /**
   * Send a video message
   */
  async sendVideoMessage(
    to: string,
    videoUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'video',
      video: {
        link: videoUrl,
        caption,
      },
    });
  }

  /**
   * Send a document message
   */
  async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename?: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    });
  }

  /**
   * Send a location message
   */
  async sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address,
      },
    });
  }

  /**
   * Send an interactive button message
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText,
        },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    });
  }

  /**
   * Send an interactive list message
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: bodyText,
        },
        action: {
          button: buttonText,
          sections,
        },
      },
    });
  }

  /**
   * Send a template message (for out-of-24h-window messages)
   */
  async sendTemplateMessage(template: TemplateMessage): Promise<SendMessageResponse> {
    try {
      logger.info('Sending template message', {
        to: template.to,
        templateName: template.template.name,
      });

      const response = await this.client.post<SendMessageResponse>('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...template,
      });

      logger.info('Template message sent successfully', {
        to: template.to,
        messageId: response.data.messages[0].id,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send template message', {
        to: template.to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse incoming webhook payload
   * Extract message details from WhatsApp webhook
   */
  parseWebhookPayload(payload: WebhookPayload): ParsedMessage[] {
    const parsedMessages: ParsedMessage[] = [];

    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Skip if no messages
          if (!value.messages || value.messages.length === 0) {
            continue;
          }

          for (const message of value.messages) {
            const contactName = value.contacts?.[0]?.profile?.name;

            const parsed: ParsedMessage = {
              messageId: message.id,
              from: message.from,
              fromName: contactName,
              timestamp: message.timestamp,
              type: message.type,
              content: this.extractMessageContent(message),
            };

            // Handle media messages
            if (message.image || message.video || message.document || message.audio) {
              parsed.mediaId =
                message.image?.id ||
                message.video?.id ||
                message.document?.id ||
                message.audio?.id;
            }

            // Handle button/list responses
            if (message.button) {
              parsed.buttonPayload = message.button.payload;
            } else if (message.interactive?.button_reply) {
              parsed.buttonPayload = message.interactive.button_reply.id;
            } else if (message.interactive?.list_reply) {
              parsed.buttonPayload = message.interactive.list_reply.id;
            }

            parsedMessages.push(parsed);

            logger.info('Parsed incoming message', {
              messageId: parsed.messageId,
              from: parsed.from,
              type: parsed.type,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error parsing webhook payload', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return parsedMessages;
  }

  /**
   * Extract message content based on type
   */
  private extractMessageContent(message: any): string | any {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';

      case 'image':
        return {
          id: message.image?.id,
          caption: message.image?.caption,
          mime_type: message.image?.mime_type,
        };

      case 'video':
        return {
          id: message.video?.id,
          caption: message.video?.caption,
          mime_type: message.video?.mime_type,
        };

      case 'document':
        return {
          id: message.document?.id,
          filename: message.document?.filename,
          caption: message.document?.caption,
          mime_type: message.document?.mime_type,
        };

      case 'location':
        return message.location;

      case 'audio':
        return {
          id: message.audio?.id,
          mime_type: message.audio?.mime_type,
        };

      case 'interactive':
        if (message.interactive?.button_reply) {
          return message.interactive.button_reply.title;
        } else if (message.interactive?.list_reply) {
          return message.interactive.list_reply.title;
        }
        return '';

      default:
        return '';
    }
  }

  /**
   * Format message content for API request
   */
  private formatMessageContent(message: WhatsAppMessage): object {
    const content: any = {};

    switch (message.type) {
      case 'text':
        content.text = message.text;
        break;
      case 'image':
        content.image = message.image;
        break;
      case 'video':
        content.video = message.video;
        break;
      case 'document':
        content.document = message.document;
        break;
      case 'location':
        content.location = message.location;
        break;
      case 'audio':
        content.audio = message.audio;
        break;
      case 'interactive':
        content.interactive = message.interactive;
        break;
    }

    return content;
  }

  /**
   * Get current rate limit statistics
   */
  async getRateLimitStats(): Promise<{
    perSecond: number;
    perMinute: number;
    perHour: number;
  }> {
    return whatsappRateLimiter.getStats();
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError<WhatsAppError>): void {
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      logger.error('WhatsApp API Error', {
        code: whatsappError.code,
        type: whatsappError.type,
        message: whatsappError.message,
        details: whatsappError.error_data?.details,
        traceId: whatsappError.fbtrace_id,
      });
    } else {
      logger.error('Network or unknown error', {
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });

      logger.debug('Message marked as read', { messageId });
    } catch (error) {
      logger.error('Failed to mark message as read', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Download media from WhatsApp by media ID
   * Required for processing received images, videos, documents, audio
   * 
   * @param mediaId - The media ID received in webhook
   * @returns Object containing media URL and metadata
   */
  async getMediaUrl(mediaId: string): Promise<{ url: string; mimeType: string; size: number }> {
    try {
      logger.info('Retrieving media URL', { mediaId });

      // Get media metadata and URL from WhatsApp API
      const response = await this.client.get(`/${mediaId}`);

      logger.info('Media URL retrieved successfully', {
        mediaId,
        mimeType: response.data.mime_type,
        size: response.data.file_size,
      });

      return {
        url: response.data.url,
        mimeType: response.data.mime_type,
        size: response.data.file_size,
      };
    } catch (error) {
      logger.error('Failed to retrieve media URL', {
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Download media file from WhatsApp
   * Returns the actual file data as a Buffer
   * 
   * @param mediaId - The media ID received in webhook
   * @returns Buffer containing the media file data
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      logger.info('Downloading media', { mediaId });

      // First get the media URL
      const mediaInfo = await this.getMediaUrl(mediaId);

      // Download the actual file
      // Note: WhatsApp media URLs require authorization
      const response = await axios.get(mediaInfo.url, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
        timeout: 60000, // 60 seconds for large files
      });

      const buffer = Buffer.from(response.data);

      logger.info('Media downloaded successfully', {
        mediaId,
        size: buffer.length,
        mimeType: mediaInfo.mimeType,
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to download media', {
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

