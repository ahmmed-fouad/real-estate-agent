/**
 * Message Processor
 * Handles actual processing of messages from the queue
 * 
 * This will be expanded in Task 1.3 (Session Management) and Phase 2 (AI Integration)
 */

import { Job } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { MessageQueueJob, MessageQueueResult } from './message-queue.service';

const logger = createServiceLogger('MessageProcessor');

/**
 * Process a message from the queue
 * This is a placeholder that will be expanded in later tasks:
 * - Task 1.3: Add session management
 * - Task 2.1: Add AI/LLM integration
 * - Task 2.2: Add RAG retrieval
 * - Task 2.3: Add intent classification
 */
export async function processMessage(job: Job<MessageQueueJob>): Promise<MessageQueueResult> {
  const { message } = job.data;

  logger.info('Processing message', {
    jobId: job.id,
    messageId: message.messageId,
    from: message.from,
    type: message.type,
  });

  try {
    // Handle media messages - download if needed
    if (message.mediaId) {
      logger.info('Message contains media', {
        messageId: message.messageId,
        mediaId: message.mediaId,
        type: message.type,
      });

      // Download media for processing (will be used in Phase 2 for AI image recognition)
      // For now, just log that we can download it
      try {
        const mediaUrl = await whatsappService.getMediaUrl(message.mediaId);
        logger.info('Media URL retrieved', {
          messageId: message.messageId,
          mediaId: message.mediaId,
          mimeType: mediaUrl.mimeType,
          size: mediaUrl.size,
        });

        // TODO: In Phase 2, download and process media
        // const mediaBuffer = await whatsappService.downloadMedia(message.mediaId);
        // Process with AI (image recognition, document OCR, etc.)
      } catch (error) {
        logger.error('Failed to process media', {
          messageId: message.messageId,
          mediaId: message.mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Handle text messages
    if (message.type === 'text' && typeof message.content === 'string') {
      logger.info('Processing text message', {
        messageId: message.messageId,
        from: message.from,
        textLength: message.content.length,
        preview: message.content.substring(0, 100),
      });

      // TODO: Task 1.3 - Get or create session
      // TODO: Task 2.3 - Classify intent and extract entities
      // TODO: Task 2.2 - Retrieve relevant documents (RAG)
      // TODO: Task 2.1 - Generate AI response
      // TODO: Task 2.4 - Send response via WhatsApp

      // For now, just log that we received it
      logger.info('Text message queued for AI processing (Phase 2)', {
        messageId: message.messageId,
        from: message.from,
      });
    }

    // Handle button/list responses
    if (message.buttonPayload) {
      logger.info('Processing interactive response', {
        messageId: message.messageId,
        from: message.from,
        payload: message.buttonPayload,
      });

      // TODO: Handle button click actions in Phase 2
    }

    // Handle location messages
    if (message.type === 'location') {
      logger.info('Processing location message', {
        messageId: message.messageId,
        from: message.from,
        location: message.content,
      });

      // TODO: Process location (search nearby properties) in Phase 2
    }

    return {
      processed: true,
      responseGenerated: false, // Will be true in Phase 2
    };
  } catch (error) {
    logger.error('Error processing message', {
      jobId: job.id,
      messageId: message.messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Let Bull handle retry
  }
}

