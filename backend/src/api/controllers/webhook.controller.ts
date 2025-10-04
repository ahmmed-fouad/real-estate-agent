/**
 * Webhook Controller
 * Handles WhatsApp webhook verification and incoming messages
 */

import { Request, Response } from 'express';
import { whatsappConfig } from '../../config/whatsapp.config';
import { whatsappService } from '../../services/whatsapp/whatsapp.service';
import { messageQueue } from '../../services/queue';
import { createServiceLogger } from '../../utils/logger';
import { verifyWebhookSignature } from '../../utils/crypto';
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
      logger.error('Error in webhook verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process webhook verification',
      });
    }
  }

  /**
   * POST /webhook/whatsapp - Receive Incoming Messages
   * Handles incoming messages from WhatsApp
   * Must respond within 5 seconds or WhatsApp will retry
   */
  async receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Validate webhook signature if enabled (security best practice)
      // Note: 360dialog may not require this, but it's good to have for security
      const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
      
      if (webhookSecret) {
        const signature = req.headers['x-hub-signature-256'] as string;
        const rawBody = req.rawBody || JSON.stringify(req.body);

        if (!signature) {
          logger.warn('Webhook signature missing but validation is enabled');
        } else {
          // Remove 'sha256=' prefix if present
          const signatureHash = signature.startsWith('sha256=')
            ? signature.substring(7)
            : signature;

          const isValid = verifyWebhookSignature(rawBody, signatureHash, webhookSecret);

          if (!isValid) {
            logger.error('Webhook signature validation failed');
            res.status(401).json({
              error: 'Unauthorized',
              message: 'Invalid webhook signature',
            });
            return;
          }

          logger.debug('Webhook signature validated successfully');
        }
      }

      const payload: WebhookPayload = req.body;

      logger.info('Webhook received', {
        object: payload.object,
        entriesCount: payload.entry?.length || 0,
      });

      // Immediately respond with 200 OK (< 5 seconds requirement)
      res.status(200).json({ success: true });

      // Process the webhook asynchronously (don't block response)
      this.processWebhookAsync(payload);
    } catch (error) {
      logger.error('Error receiving webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Still return 200 to avoid WhatsApp retries
      res.status(200).json({ success: true });
    }
  }

  /**
   * Process webhook payload asynchronously
   * This runs after we've already responded to WhatsApp
   */
  private async processWebhookAsync(payload: WebhookPayload): Promise<void> {
    try {
      // Validate payload structure
      if (payload.object !== 'whatsapp_business_account') {
        logger.warn('Received non-WhatsApp webhook', { object: payload.object });
        return;
      }

      // Parse incoming messages
      const messages = whatsappService.parseWebhookPayload(payload);

      if (messages.length === 0) {
        logger.debug('No messages to process in webhook payload');
        return;
      }

      logger.info(`Processing ${messages.length} message(s)`);

      // Process each message - Add to Bull queue as per plan (lines 231, 271, 95)
      for (const message of messages) {
        try {
          // Mark message as read immediately
          await whatsappService.markAsRead(message.messageId);

          // Add message to Bull queue for async processing
          // This implements the queue system requirement from the plan
          await messageQueue.addMessage(message);

          logger.info('Message successfully queued for processing', {
            messageId: message.messageId,
            from: message.from,
            type: message.type,
            hasMediaId: !!message.mediaId,
          });
        } catch (error) {
          logger.error('Error queueing message', {
            messageId: message.messageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue processing other messages even if one fails
        }
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
      status: 'healthy',
      service: 'WhatsApp Webhook',
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const webhookController = new WebhookController();

