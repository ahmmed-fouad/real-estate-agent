/**
 * Webhook Controller
 * Handles WhatsApp webhook verification and incoming messages
 */

import { Request, Response } from 'express';
import { whatsappConfig } from '../../config/whatsapp.config';
import { messageQueue } from '../../services/queue';
import { createServiceLogger } from '../../utils/logger';
import { verifyWebhookSignature } from '../../utils/crypto';
import { ErrorResponse } from '../../utils';
import { WebhookPayload } from '../../services/whatsapp/types';

const logger = createServiceLogger('WebhookController');

export class WebhookController {
  /**
   * GET /webhook/whatsapp - Webhook Verification
   * WhatsApp/Meta requires this endpoint to verify the webhook URL
   */
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Extract query parameters
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      logger.info('Webhook verification request received', {
        mode,
        hasToken: !!token,
        hasChallenge: !!challenge,
      });

      // Verify the mode and token
      if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
        logger.info('Webhook verified successfully');

        // Respond with the challenge to verify the webhook
        res.status(200).send(challenge);
      } else {
        logger.warn('Webhook verification failed - invalid token or mode', {
          mode,
          expectedToken: whatsappConfig.verifyToken.substring(0, 5) + '...',
        });

        res.status(403).json({
          error: 'Verification failed',
          message: 'Invalid verify token or mode',
        });
      }
    } catch (error) {
      return ErrorResponse.send(res, error, 'Failed to process webhook verification', 500);
    }
  }

  /**
   * POST /webhook/whatsapp - Receive Incoming Messages
   * Handles incoming messages from WhatsApp
   * Must respond within 5 seconds or WhatsApp will retry
   */
  async receiveMessage(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = req.rawBody;
      const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || whatsappConfig.verifyToken;

      // Validate webhook signature for security
      if (!rawBody) {
        logger.error('Missing raw body for signature verification');
        return ErrorResponse.unauthorized(res, 'Invalid request format');
      }

      if (signature) {
        const isValid = verifyWebhookSignature(
          rawBody,
          signature,
          webhookSecret
        );

        if (!isValid) {
          logger.warn('Invalid webhook signature received');
          return ErrorResponse.unauthorized(res, 'Invalid signature');
        }
      }

      const payload: WebhookPayload = req.body;

      logger.info('Webhook message received', {
        entries: payload.entry?.length || 0,
      });

      // Respond immediately to WhatsApp (must be within 5 seconds)
      res.status(200).json({ success: true });

      // Process the webhook asynchronously
      // This ensures we respond to WhatsApp quickly
      this.processWebhookAsync(payload).catch((err) => {
        logger.error('Async webhook processing failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    } catch (error) {
      return ErrorResponse.send(res, error, 'Failed to process webhook message', 500);
    }
  }

  /**
   * Process webhook payload asynchronously
   * Extracts messages and queues them for processing
   */
  private async processWebhookAsync(payload: WebhookPayload | any): Promise<void> {
    try {
      // Extract messages from the payload
      const messages = [];

      if (payload.entry) {
        for (const entry of payload.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.value?.messages) {
                for (const message of change.value.messages) {
                  messages.push({
                    from: message.from,
                    messageId: message.id,
                    timestamp: message.timestamp,
                    type: message.type,
                    text: message.text?.body,
                    image: message.image,
                    video: message.video,
                    document: message.document,
                    audio: message.audio,
                    location: message.location,
                    interactive: message.interactive,
                  });
                }
              }

              // Handle status updates (delivered, read, etc.)
              if (change.value?.statuses) {
                for (const status of change.value.statuses) {
                  logger.info('Message status update', {
                    messageId: status.id,
                    status: status.status,
                    timestamp: status.timestamp,
                  });
                }
              }
            }
          }
        }
      }

      // Queue messages for processing
      for (const message of messages) {
        const parsedMessage: any = {
          from: message.from,
          messageId: message.messageId,
          content: message.text || '',
          type: message.type,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        };

        // Add media fields if they exist
        if (message.image) parsedMessage.mediaId = message.image.id;
        if (message.video) parsedMessage.mediaId = message.video.id;
        if (message.document) parsedMessage.mediaId = message.document.id;
        if (message.audio) parsedMessage.mediaId = message.audio.id;
        if (message.location) parsedMessage.location = message.location;
        if (message.interactive) parsedMessage.interactive = message.interactive;

        await messageQueue.addMessage(parsedMessage);

        logger.info('Message queued for processing', {
          from: message.from,
          messageId: message.messageId,
          type: message.type,
        });
      }

      logger.info('Webhook processing completed', {
        processedCount: messages.length,
      });
    } catch (error) {
      logger.error('Error in async webhook processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      service: 'WhatsApp Webhook',
    });
  }
}

// Export singleton instance
export const webhookController = new WebhookController();
