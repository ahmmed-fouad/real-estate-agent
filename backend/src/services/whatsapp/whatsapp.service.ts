/**
 * WhatsApp Service
 * Handles sending and receiving messages via Twilio WhatsApp Business API
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
  TwilioWebhookPayload,
  TwilioSendResponse,
} from './types';

const logger = createServiceLogger('WhatsAppService');

export class WhatsAppService {
  private client: AxiosInstance;
  private accountSid: string;
  private whatsappNumber: string;

  constructor() {
    this.accountSid = whatsappConfig.accountSid;
    this.whatsappNumber = whatsappConfig.whatsappNumber;

    // Initialize Axios client with Twilio configuration
    this.client = axios.create({
      baseURL: whatsappConfig.apiUrl,
      auth: {
        username: whatsappConfig.accountSid,
        password: whatsappConfig.authToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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

    logger.info('WhatsApp Service initialized with Twilio', {
      accountSid: this.accountSid,
      whatsappNumber: this.whatsappNumber,
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

      // Format phone number for Twilio (must include whatsapp: prefix)
      const toNumber = message.to.startsWith('whatsapp:') 
        ? message.to 
        : `whatsapp:${message.to}`;

      // Send message via Twilio API
      const response = await this.client.post<TwilioSendResponse>(
        `/Accounts/${this.accountSid}/Messages.json`,
        new URLSearchParams(this.formatTwilioMessage(message, toNumber))
      );

      // Increment rate limit counter after successful send
      await whatsappRateLimiter.increment();

      logger.info('Message sent successfully via Twilio', {
        to: message.to,
        messageId: response.data.sid,
        status: response.data.status,
      });

      // Convert Twilio response to our standard format
      return this.convertTwilioResponse(response.data);
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
   * Parse incoming webhook payload from Twilio
   * Extract message details from Twilio WhatsApp webhook
   */
  parseWebhookPayload(payload: WebhookPayload | TwilioWebhookPayload): ParsedMessage[] {
    const parsedMessages: ParsedMessage[] = [];

    try {
      // Check if this is a Twilio webhook (has MessageSid)
      if ('MessageSid' in payload) {
        return this.parseTwilioWebhook(payload as TwilioWebhookPayload);
      }

      // Legacy: Handle Meta/360dialog format (keeping for compatibility)
      const metaPayload = payload as WebhookPayload;
      for (const entry of metaPayload.entry) {
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
   * Parse Twilio-specific webhook payload
   */
  private parseTwilioWebhook(payload: TwilioWebhookPayload): ParsedMessage[] {
    try {
      const numMedia = parseInt(payload.NumMedia || '0', 10);
      
      // Determine message type
      let messageType: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' = 'text';
      let content: string | any = payload.Body || '';
      let mediaId: string | undefined;

      if (numMedia > 0 && payload.MediaContentType0) {
        const contentType = payload.MediaContentType0;
        mediaId = payload.MediaUrl0;

        if (contentType.startsWith('image/')) {
          messageType = 'image';
          content = {
            link: payload.MediaUrl0,
            caption: payload.Body,
          };
        } else if (contentType.startsWith('video/')) {
          messageType = 'video';
          content = {
            link: payload.MediaUrl0,
            caption: payload.Body,
          };
        } else if (contentType.startsWith('audio/')) {
          messageType = 'audio';
          content = {
            link: payload.MediaUrl0,
          };
        } else {
          messageType = 'document';
          content = {
            link: payload.MediaUrl0,
            caption: payload.Body,
          };
        }
      } else if (payload.Latitude && payload.Longitude) {
        messageType = 'location';
        content = {
          latitude: parseFloat(payload.Latitude),
          longitude: parseFloat(payload.Longitude),
        };
      }

      const parsed: ParsedMessage = {
        messageId: payload.MessageSid,
        from: payload.From.replace('whatsapp:', ''),
        timestamp: new Date().toISOString(),
        type: messageType,
        content,
        mediaId,
      };

      logger.info('Parsed incoming Twilio message', {
        messageId: parsed.messageId,
        from: parsed.from,
        type: parsed.type,
      });

      return [parsed];
    } catch (error) {
      logger.error('Error parsing Twilio webhook payload', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
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
   * Format message for Twilio API (URL-encoded parameters)
   */
  private formatTwilioMessage(
    message: WhatsAppMessage,
    toNumber: string
  ): Record<string, string> {
    const params: Record<string, string> = {
      From: this.whatsappNumber,
      To: toNumber,
    };

    switch (message.type) {
      case 'text':
        params.Body = message.text?.body || '';
        break;

      case 'image':
        if (message.image?.link) {
          params.MediaUrl = message.image.link;
          params.Body = message.image.caption || '';
        }
        break;

      case 'video':
        if (message.video?.link) {
          params.MediaUrl = message.video.link;
          params.Body = message.video.caption || '';
        }
        break;

      case 'document':
        if (message.document?.link) {
          params.MediaUrl = message.document.link;
          params.Body = message.document.caption || message.document.filename || '';
        }
        break;

      case 'location':
        if (message.location) {
          // Twilio doesn't natively support location messages via API
          // Send as text with coordinates
          const locationText = `📍 Location: ${message.location.name || 'Shared location'}\n` +
            `Coordinates: ${message.location.latitude}, ${message.location.longitude}\n` +
            `${message.location.address || ''}`;
          params.Body = locationText;
        }
        break;

      case 'audio':
        if (message.audio?.link) {
          params.MediaUrl = message.audio.link;
        }
        break;

      case 'interactive':
        // Twilio doesn't support interactive messages in the same way
        // Convert to text with options
        if (message.interactive?.type === 'button') {
          params.Body = message.interactive.body.text;
        } else if (message.interactive?.type === 'list') {
          params.Body = message.interactive.body.text;
        }
        break;

      default:
        params.Body = '';
    }

    return params;
  }

  /**
   * Convert Twilio response to our standard SendMessageResponse format
   */
  private convertTwilioResponse(twilioResponse: TwilioSendResponse): SendMessageResponse {
    return {
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: twilioResponse.to,
          wa_id: twilioResponse.to.replace('whatsapp:', ''),
        },
      ],
      messages: [
        {
          id: twilioResponse.sid,
        },
      ],
    };
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
      // Note: Twilio media URLs require Basic Auth
      const response = await axios.get(mediaInfo.url, {
        responseType: 'arraybuffer',
        auth: {
          username: whatsappConfig.accountSid,
          password: whatsappConfig.authToken,
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

