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
import { llmService, promptBuilder, ragService, intentClassifier, entityExtractor, responsePostProcessor, Intent } from '../ai';
import { leadScoringService } from '../lead';
import { leadNotificationService } from '../notification';
import { languageDetectionService } from '../language';
import { schedulingIntegrationService } from '../schedule';
import { prisma } from '../../config/prisma-client';

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

    // ✅ Task 1.3 - Add user message to history in memory (don't persist yet)
    // PERFORMANCE OPTIMIZATION: Defer Redis write until after AI response
    // This batches state update + user message + AI response into ONE Redis write
    // instead of TWO separate writes (before and after AI generation)
    session.context.messageHistory.push({
      role: 'user',
      content: message.content, // Can be string | MediaContent | LocationContent
      timestamp: new Date(),
      messageId: message.messageId,
      type: message.type,
    });

    logger.debug('User message added to session (in memory, not persisted yet)', {
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

      try {
        // ✅ Task 4.3 Fix #5 - Handle customer slot selection
        if (session.context.awaitingSchedulingResponse && session.context.schedulingContext) {
          logger.info('Customer is responding to scheduling flow', {
            sessionId: session.id,
            step: session.context.schedulingContext.step,
            message: message.content,
          });

          // Validate and find matching slot
          const validationResult = await schedulingIntegrationService.validateAndFindSlot(
            session.agentId,
            message.content,
            session.context.schedulingContext.propertyId
          );

          if (validationResult.success && validationResult.slot) {
            logger.info('Valid slot found, creating booking', {
              sessionId: session.id,
              slot: validationResult.slot,
            });

            // Create the booking
            const bookingResult = await schedulingIntegrationService.createBookingFromConversation(
              session,
              session.context.schedulingContext.propertyId!,
              validationResult.slot
            );

            if (bookingResult.success) {
              // Send confirmation message
              const confirmationMsg = await schedulingIntegrationService.generateBookingConfirmationMessage(
                bookingResult.viewingId!,
                session.context.languagePreference?.primary || 'mixed'
              );

              await whatsappService.sendTextMessage(message.from, confirmationMsg);

              // Clear scheduling context
              session.context.awaitingSchedulingResponse = false;
              delete session.context.schedulingContext;

              // Update session history
              session.context.messageHistory.push(
                { role: 'user', content: message.content, timestamp: new Date() },
                { role: 'assistant', content: confirmationMsg, timestamp: new Date() }
              );

              await sessionManager.updateSession(session);

              logger.info('Booking created and confirmed', {
                sessionId: session.id,
                viewingId: bookingResult.viewingId,
              });

              return {
                processed: true,
                responseGenerated: true,
              };
            } else {
              // Booking failed, send error message
              await whatsappService.sendTextMessage(message.from, bookingResult.error || 'حدث خطأ في الحجز\nBooking failed');
              
              // Clear context and let AI handle follow-up
              session.context.awaitingSchedulingResponse = false;
              delete session.context.schedulingContext;
            }
          } else {
            // Slot validation failed, send clarification message
            await whatsappService.sendTextMessage(message.from, validationResult.message);
            
            // Keep scheduling context active for retry
            logger.info('Slot validation failed, awaiting retry', {
              sessionId: session.id,
            });

            // Update history but stay in scheduling flow
            session.context.messageHistory.push(
              { role: 'user', content: message.content, timestamp: new Date() },
              { role: 'assistant', content: validationResult.message, timestamp: new Date() }
            );

            await sessionManager.updateSession(session);

            return {
              processed: true,
              responseGenerated: true,
            };
          }
        }

        // ✅ Task 4.2, Subtask 1 - Detect customer language
        logger.debug('Detecting customer language', {
          messageId: message.messageId,
          sessionId: session.id,
        });

        const languageDetection = languageDetectionService.detectLanguage(message.content);
        
        // Update session with detected language preference
        if (!session.context.languagePreference || 
            languageDetection.confidence > (session.context.languagePreference.confidence || 0)) {
          session.context.languagePreference = {
            primary: languageDetection.language,
            confidence: languageDetection.confidence,
            lastDetected: new Date(),
            messagesSampled: (session.context.languagePreference?.messagesSampled || 0) + 1,
          };

          logger.info('Language preference updated', {
            sessionId: session.id,
            language: languageDetection.language,
            confidence: languageDetection.confidence,
            hasArabic: languageDetection.hasArabic,
            hasEnglish: languageDetection.hasEnglish,
            isArabizi: languageDetection.isArabizi,
          });
        }

        // ✅ Task 2.3 - Classify intent and extract entities (Phase 2) IMPLEMENTED
        logger.info('Classifying intent and extracting entities', {
          messageId: message.messageId,
          sessionId: session.id,
          messagePreview: message.content.substring(0, 100),
        });

        // Get conversation context for classification
        const conversationContext = intentClassifier.formatConversationContext(
          session.context.messageHistory.slice(-5) // Last 5 messages for context
        );

        // Classify intent and extract entities using LLM
        // As per plan lines 571-588: Use LLM for zero-shot classification
        const intentAnalysis = await intentClassifier.analyze(
          message.content,
          conversationContext
        );

        logger.info('Intent classified and entities extracted', {
          messageId: message.messageId,
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          entityCount: Object.keys(intentAnalysis.entities).length,
          entitySummary: entityExtractor.getEntitySummary(intentAnalysis.entities),
        });

        // ✅ Task 2.3 - Update session with extracted entities (plan lines 596-599)
        // Merge new entities with existing session data (accumulate across conversation)
        session.context.extractedInfo = entityExtractor.mergeEntities(
          session.context.extractedInfo,
          intentAnalysis.entities
        );

        // Update current intent in session context
        session.context.currentIntent = intentAnalysis.intent;
        session.context.currentTopic = intentAnalysis.explanation;

        logger.debug('Session context updated with entities and intent', {
          sessionId: session.id,
          currentIntent: session.context.currentIntent,
          extractedInfo: session.context.extractedInfo,
        });

        // ✅ Task 4.3 Fix #3 - Handle SCHEDULE_VIEWING intent specially
        // As per plan lines 990-991: "AI suggests available slots", "Customer selects time"
        if (intentAnalysis.intent === Intent.SCHEDULE_VIEWING) {
          logger.info('SCHEDULE_VIEWING intent detected - showing available slots', {
            sessionId: session.id,
            messageId: message.messageId,
          });

          try {
            const detectedLanguage = session.context.languagePreference?.primary || 'mixed';
            
            // ✅ Task 4.3 Fix #6: Check if customer has selected a specific property
            const propertyId = session.context.extractedInfo?.propertyId || undefined;

            // If no specific property selected, ask which one
            if (!propertyId) {
              const clarificationMsg = detectedLanguage === 'ar' 
                ? 'بالتأكيد! لأي عقار تريد حجز معاينة؟'
                : detectedLanguage === 'en'
                ? 'Sure! Which property would you like to schedule a viewing for?'
                : 'بالتأكيد! لأي عقار تريد حجز معاينة؟\nSure! Which property would you like to schedule a viewing for?';

              await whatsappService.sendTextMessage(message.from, clarificationMsg);

              // Update session history
              session.context.messageHistory.push({
                role: 'assistant',
                content: clarificationMsg,
                timestamp: new Date(),
              });

              await sessionManager.updateSession(session);

              logger.info('Asked customer to specify property', {
                sessionId: session.id,
              });

              return {
                processed: true,
                responseGenerated: true,
              };
            }

            // Generate available slots message for specific property
            const slotsMessage = await schedulingIntegrationService.generateAvailableSlotsMessage(
              session.agentId,
              propertyId,
              detectedLanguage as 'ar' | 'en' | 'mixed'
            );

            // Send slots to customer
            await whatsappService.sendTextMessage(message.from, slotsMessage);

            // Mark session as awaiting slot selection
            session.context.awaitingSchedulingResponse = true;
            session.context.schedulingContext = {
              propertyId,
              step: 'awaiting_time_selection',
            };

            // Update session with assistant response
            session.context.messageHistory.push({
              role: 'assistant',
              content: slotsMessage,
              timestamp: new Date(),
            });

            // Persist session
            await sessionManager.updateSession(session);

            logger.info('Viewing slots sent to customer', {
              sessionId: session.id,
              messageId: message.messageId,
            });

            return {
              processed: true,
              responseGenerated: true,
            };
          } catch (error) {
            logger.error('Failed to handle SCHEDULE_VIEWING intent', {
              error: error instanceof Error ? error.message : 'Unknown error',
              sessionId: session.id,
            });
            // Fall through to normal AI response as fallback
          }
        }

        // ✅ Task 2.3 - Extract search filters from entities for RAG (plan line 599)
        // Use extracted entities for filtering property search
        const searchFilters = entityExtractor.extractSearchFilters(session.context.extractedInfo);

        // Task 2.2 - Retrieve relevant documents (RAG) ✅ IMPLEMENTED
        logger.info('Retrieving relevant properties with entity-based filters', {
          messageId: message.messageId,
          sessionId: session.id,
          agentId: session.agentId,
          query: message.content.substring(0, 100),
          filters: searchFilters,
        });

        // Retrieve relevant property documents using RAG with entity-based filters
        // As per plan lines 524-535: RAG Flow with extracted entity filters
        const relevantProperties = await ragService.retrieveRelevantDocs(
          message.content,
          session.agentId,
          {
            topK: 5, // Return top 5 most relevant properties
            ...searchFilters, // ✅ Task 2.3: Add extracted entity filters here
          }
        );

        logger.info('Relevant properties retrieved', {
          messageId: message.messageId,
          count: relevantProperties.length,
        });

        // Augment prompt with retrieved properties
        // As per plan lines 506-512 and 532: "Format properties into context string"
        const ragContext = await ragService.augmentPrompt(
          message.content,
          relevantProperties
        );

        logger.debug('RAG context generated', {
          messageId: message.messageId,
          contextLength: ragContext.length,
        });

        // Task 2.1 - Generate AI response ✅ IMPLEMENTED
        logger.info('Generating AI response with RAG context', {
          messageId: message.messageId,
          sessionId: session.id,
          messageCount: session.context.messageHistory.length,
          hasRagContext: relevantProperties.length > 0,
        });

        // Build system prompt from session context with RAG context
        const systemPrompt = promptBuilder.buildSystemPromptFromSession(
          session,
          ragContext // Task 2.2: Add RAG context here ✅
        );

        // Generate response using LLM with RAG context
        // Uses configured maxTokens from openaiConfig (default: 500)
        const llmResponse = await llmService.generateResponse(
          systemPrompt,
          message.content,
          undefined, // Context is already in system prompt via ragContext
          {
            // maxTokens and temperature will use defaults from llmService
            // which are configured via environment variables
          }
        );

        logger.info('AI response generated', {
          messageId: message.messageId,
          responseLength: llmResponse.content.length,
          tokenUsage: llmResponse.tokenUsage,
          responseTime: llmResponse.responseTime,
        });

        // ✅ Task 2.4 - Post-process response (plan line 650)
        // Enhance response with property cards, buttons, formatting, etc.
        logger.info('Post-processing response', {
          messageId: message.messageId,
          intent: intentAnalysis.intent,
          propertiesCount: relevantProperties.length,
        });

        // FIX: Pass detected language to post-processor for template adaptation
        const detectedLanguage = session.context.languagePreference?.primary || 'mixed';
        
        const enhancedResponse = await responsePostProcessor.postProcess(
          llmResponse.content,
          {
            intent: intentAnalysis.intent,
            properties: relevantProperties,
            customerName: undefined, // TODO: Extract from conversation if available
            agentName: session.agentId,
            extractedInfo: session.context.extractedInfo,
            detectedLanguage: detectedLanguage,  // FIX: Pass detected language
          }
        );

        logger.info('Response post-processing complete', {
          messageId: message.messageId,
          hasEnhancedText: enhancedResponse.text !== llmResponse.content,
          hasProperties: !!enhancedResponse.properties,
          buttonsCount: enhancedResponse.buttons?.length || 0,
          hasLocation: !!enhancedResponse.location,
          requiresEscalation: enhancedResponse.requiresEscalation,
        });

        // Add AI response to session history (in memory)
        // Store the enhanced text in history
        session.context.messageHistory.push({
          role: 'assistant',
          content: enhancedResponse.text,
          timestamp: new Date(),
          type: 'text',
        });

        // Handle escalation if needed
        if (enhancedResponse.requiresEscalation) {
          logger.info('Escalation required, updating session state', {
            sessionId: session.id,
            currentState: session.state,
          });
          
          // Update session state to WAITING_AGENT
          session.state = ConversationState.WAITING_AGENT;
          
          // TODO: Notify agent via notification system (Phase 4)
          logger.info('Agent notification would be sent here (to be implemented in Phase 4)', {
            sessionId: session.id,
            customerId: session.customerId,
            agentId: session.agentId,
          });
        }

        // PERFORMANCE FIX: Single Redis write with all changes
        // Includes: state transition + user message + AI response + potential escalation
        // This is 50% more efficient than multiple separate writes
        await sessionManager.updateSession(session);

        logger.info('Session updated with all changes', {
          sessionId: session.id,
          stateTransition: oldState !== session.state ? `${oldState} → ${session.state}` : 'none',
          messagesAdded: 2, // User message + AI response
          totalMessages: session.context.messageHistory.length,
        });

        // ✅ Task 4.1 - Calculate and update lead score
        try {
          const leadScore = leadScoringService.calculateScore(session);
          const scoreExplanation = leadScoringService.getScoreExplanation(leadScore);

          // FIX #2: Get previous lead quality to detect changes
          const existingConversation = await prisma.conversation.findFirst({
            where: {
              agentId: session.agentId,
              customerPhone: session.customerId,
              status: { not: 'closed' },
            },
            select: {
              leadScore: true,
              leadQuality: true,
            },
          });

          const previousQuality = existingConversation?.leadQuality ?? null;
          const qualityChanged = previousQuality !== leadScore.quality;

          // FIX #2: Only route notification if quality changed (no spam)
          let notificationMetadata = null;
          if (qualityChanged) {
            logger.info('Lead quality changed - routing notification', {
              sessionId: session.id,
              previousQuality,
              newQuality: leadScore.quality,
            });

            // Route notification and get metadata to store
            notificationMetadata = await leadNotificationService.routeLeadNotification(
              session,
              leadScore,
              scoreExplanation,
              previousQuality
            );
          } else {
            logger.debug('Lead quality unchanged - skipping notification', {
              sessionId: session.id,
              quality: leadScore.quality,
            });
          }

          // FIX #1 & #3: Single atomic database update with combined metadata
          await prisma.conversation.updateMany({
            where: {
              agentId: session.agentId,
              customerPhone: session.customerId,
              status: { not: 'closed' },
            },
            data: {
              leadScore: leadScore.total,
              leadQuality: leadScore.quality,
              metadata: {
                // Score factors
                leadScoreFactors: leadScore.factors,
                leadScoreExplanation: scoreExplanation,
                lastScoreUpdate: new Date().toISOString(),
                // Quality tracking
                previousQuality: previousQuality,
                qualityChangedAt: qualityChanged ? new Date().toISOString() : undefined,
                // Notification metadata (FIX #1: combined in single update)
                ...(notificationMetadata && { lastNotification: notificationMetadata }),
              },
            },
          });

          logger.info('Lead score calculated and updated', {
            sessionId: session.id,
            customerId: session.customerId,
            leadScore: leadScore.total,
            leadQuality: leadScore.quality,
            qualityChanged,
            explanation: scoreExplanation,
          });

        } catch (scoringError) {
          // Don't fail the message processing if scoring fails
          logger.error('Failed to calculate/update lead score', {
            sessionId: session.id,
            error: scoringError instanceof Error ? scoringError.message : 'Unknown error',
          });
        }

        // ✅ Task 2.4 - Send enhanced response via WhatsApp
        // Send main text message (Task 4.3 Fix #7: Use correct API)
        await whatsappService.sendTextMessage(message.from, enhancedResponse.text);

        logger.info('Enhanced response sent successfully', {
          messageId: message.messageId,
          to: message.from,
          responseLength: enhancedResponse.text.length,
        });

        // TODO: Send property cards if present (requires WhatsApp template messages)
        // This will be implemented when we add media support
        if (enhancedResponse.properties && enhancedResponse.properties.length > 0) {
          logger.info('Properties included in response (cards to be sent separately)', {
            messageId: message.messageId,
            propertiesCount: enhancedResponse.properties.length,
          });
          
          // For now, properties are included in the text summary
          // In Phase 3/4, we'll send them as separate cards/template messages
        }

        // TODO: Send interactive buttons (requires WhatsApp interactive messages API)
        // This will be implemented when we add button support
        if (enhancedResponse.buttons && enhancedResponse.buttons.length > 0) {
          logger.info('Buttons generated (to be sent as interactive message)', {
            messageId: message.messageId,
            buttons: enhancedResponse.buttons.map(b => b.title),
          });
          
          // For now, we log the buttons
          // In Phase 3/4, we'll send them as WhatsApp interactive messages
        }

        // TODO: Send location pin if present
        // This will be implemented when we add location support
        if (enhancedResponse.location) {
          logger.info('Location pin to be sent', {
            messageId: message.messageId,
            location: enhancedResponse.location.name,
          });
          
          // For now, we log the location
          // In Phase 3/4, we'll send it as a WhatsApp location message
        }

        // Mark that we generated and sent a response
        return {
          processed: true,
          responseGenerated: true,
        };
      } catch (aiError) {
        logger.error('Error generating or sending AI response', {
          messageId: message.messageId,
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
          stack: aiError instanceof Error ? aiError.stack : undefined,
        });

        // CRITICAL: Persist session even on AI failure
        // User message is in memory and needs to be saved
        try {
          await sessionManager.updateSession(session);
          logger.info('Session updated after AI error', {
            sessionId: session.id,
            stateTransition: oldState !== session.state ? `${oldState} → ${session.state}` : 'none',
            userMessageSaved: true,
          });
        } catch (sessionError) {
          logger.error('Failed to save session after AI error', {
            sessionId: session.id,
            error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          });
        }

        // Send fallback message to customer (Task 4.3 Fix #7: Use correct API)
        try {
          await whatsappService.sendTextMessage(
            message.from,
            'عذراً، حدث خطأ مؤقت. سيتواصل معك أحد ممثلينا قريباً.\n\nSorry, a temporary error occurred. One of our representatives will contact you soon.'
          );
          logger.info('Fallback message sent', { messageId: message.messageId });
        } catch (fallbackError) {
          logger.error('Failed to send fallback message', {
            messageId: message.messageId,
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          });
        }

        // Don't throw - we handled it gracefully with fallback
        return {
          processed: true,
          responseGenerated: false,
        };
      }
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

    // ✅ Task 4.3 Fix #1 - Handle button/list responses
    if (message.buttonPayload) {
      logger.info('Processing interactive button response', {
        messageId: message.messageId,
        from: message.from,
        payload: message.buttonPayload,
      });

      // Handle scheduling-related buttons
      if (message.buttonPayload.startsWith('schedule_') || message.buttonPayload.includes('viewing')) {
        logger.info('Scheduling button clicked', {
          sessionId: session.id,
          payload: message.buttonPayload,
        });

        // Parse button payload (format: "schedule_viewing_{propertyId}" or "schedule_slot_{timestamp}")
        if (message.buttonPayload.startsWith('schedule_viewing_')) {
          const propertyId = message.buttonPayload.replace('schedule_viewing_', '');
          
          // Set scheduling context
          session.context.awaitingSchedulingResponse = true;
          session.context.schedulingContext = {
            propertyId,
            step: 'awaiting_time_selection',
          };

          // Show available slots
          const detectedLanguage = session.context.languagePreference?.primary || 'mixed';
          const slotsMessage = await schedulingIntegrationService.generateAvailableSlotsMessage(
            session.agentId,
            propertyId,
            detectedLanguage as 'ar' | 'en' | 'mixed'
          );

          await whatsappService.sendTextMessage(message.from, slotsMessage);

          // Update session
          session.context.messageHistory.push({
            role: 'assistant',
            content: slotsMessage,
            timestamp: new Date(),
          });
          await sessionManager.updateSession(session);

          logger.info('Viewing slots sent after button click', {
            sessionId: session.id,
            propertyId,
          });
        } else if (message.buttonPayload.startsWith('schedule_slot_')) {
          // Customer clicked a specific slot button
          const timestamp = message.buttonPayload.replace('schedule_slot_', '');
          const selectedSlot = new Date(parseInt(timestamp, 10));

          if (session.context.schedulingContext?.propertyId) {
            // Create booking directly
            const bookingResult = await schedulingIntegrationService.createBookingFromConversation(
              session,
              session.context.schedulingContext.propertyId,
              selectedSlot
            );

            if (bookingResult.success) {
              const confirmationMsg = await schedulingIntegrationService.generateBookingConfirmationMessage(
                bookingResult.viewingId!,
                session.context.languagePreference?.primary || 'mixed'
              );

              await whatsappService.sendTextMessage(message.from, confirmationMsg);

              // Clear scheduling context
              session.context.awaitingSchedulingResponse = false;
              delete session.context.schedulingContext;

              logger.info('Booking created from button click', {
                sessionId: session.id,
                viewingId: bookingResult.viewingId,
              });
            }
          }
        }
      }

      // Handle other button types in the future (property_details, contact_agent, etc.)
      // For now, log and continue
      logger.debug('Button click processed', {
        sessionId: session.id,
        payload: message.buttonPayload,
      });
    }

    // For non-text messages, persist session now
    // (Text messages are persisted inside the AI processing block)
    await sessionManager.updateSession(session);

    logger.info('Message processing completed', {
      messageId: message.messageId,
      sessionUpdated: true,
      messageType: message.type,
      stateTransition: oldState !== session.state ? `${oldState} → ${session.state}` : 'none',
    });

    return {
      processed: true,
      responseGenerated: false, // True for text messages with AI, false for media/location/etc.
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

