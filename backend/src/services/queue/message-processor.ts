/**
 * Message Processor
 * Handles actual processing of messages from the queue
 * 
 * Now integrated with Session Management (Task 1.3)
 * Will be further expanded in Phase 2 (AI Integration)
 */

import { Job } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { sessionManager } from '../session';
import { ConversationState } from '../session/types';
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
    // Task 1.3: Get or create session for this customer
    const session = await sessionManager.getSession(message.from);

    logger.info('Session retrieved/created', {
      sessionId: session.id,
      customerId: session.customerId,
      state: session.state,
      messageCount: session.context.messageHistory.length,
    });

    // PERFORMANCE FIX: Update state in memory (don't persist yet)
    // This avoids double Redis writes (state update + message history)
    const oldState = session.state;
    if (session.state === ConversationState.NEW) {
      // First message - transition from NEW to ACTIVE
      session.state = ConversationState.ACTIVE;
      logger.info('Session state will transition: NEW → ACTIVE', {
        sessionId: session.id,
      });
    } else if (session.state === ConversationState.IDLE) {
      // Customer returned - transition from IDLE to ACTIVE
      session.state = ConversationState.ACTIVE;
      logger.info('Session state will transition: IDLE → ACTIVE', {
        sessionId: session.id,
      });
    }
    
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

    // ✅ Task 1.3 - Add message to history in memory (don't persist yet)
    // PERFORMANCE FIX: Add to array directly to batch with state update
    // This eliminates double Redis writes (was: state update + history update = 2 writes)
    // Now: single write with both changes
    session.context.messageHistory.push({
      role: 'user',
      content: message.content, // Can be string | MediaContent | LocationContent
      timestamp: new Date(),
      messageId: message.messageId,
      type: message.type,
    });

    // Persist all changes at once (state + message history + lastActivity)
    // This is 50% more efficient than separate calls
    await sessionManager.updateSession(session);

    logger.info('Session updated with message and state changes', {
      sessionId: session.id,
      messageType: message.type,
      totalMessages: session.context.messageHistory.length,
      stateTransition: oldState !== session.state ? `${oldState} → ${session.state}` : 'none',
    });

    // Handle text messages
    if (message.type === 'text' && typeof message.content === 'string') {
      logger.info('Processing text message', {
        messageId: message.messageId,
        from: message.from,
        textLength: message.content.length,
        preview: message.content.substring(0, 100),
      });

      // TODO: Task 2.3 - Classify intent and extract entities
      // TODO: Task 2.2 - Retrieve relevant documents (RAG)
      // TODO: Task 2.1 - Generate AI response
      // TODO: Task 2.4 - Send response via WhatsApp

      logger.info('Text message ready for AI processing (Phase 2)', {
        messageId: message.messageId,
        from: message.from,
        sessionId: session.id,
      });
    }

    // Handle media messages (images, videos, documents, audio)
    if (message.type === 'image' || message.type === 'video' || 
        message.type === 'document' || message.type === 'audio') {
      logger.info('Processing media message', {
        messageId: message.messageId,
        from: message.from,
        mediaType: message.type,
        hasMediaId: !!message.mediaId,
      });

      // TODO: In Phase 2, process with AI (image recognition, document OCR, etc.)
    }

    // Handle location messages
    if (message.type === 'location') {
      logger.info('Processing location message', {
        messageId: message.messageId,
        from: message.from,
        location: message.content,
      });

      // TODO: In Phase 2, search nearby properties based on location
    }

    // Handle button/list responses
    if (message.buttonPayload) {
      logger.info('Processing interactive response', {
        messageId: message.messageId,
        from: message.from,
        payload: message.buttonPayload,
      });

      // TODO: In Phase 2, handle button click actions
    }

    // Session is automatically persisted with updates
    logger.info('Message processing completed', {
      messageId: message.messageId,
      sessionUpdated: true,
    });

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

