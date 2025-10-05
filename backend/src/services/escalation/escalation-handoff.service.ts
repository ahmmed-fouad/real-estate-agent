/**
 * Escalation Handoff Service
 * Task 4.5, Subtask 3: Handoff Flow (Plan lines 1084-1089)
 *
 * Manages the complete handoff process:
 * - AI informs customer agent will respond soon
 * - AI summarizes conversation for agent
 * - Agent receives context and chat history
 * - Agent can respond via portal or WhatsApp directly
 * - AI resumes when agent marks conversation as handled
 */

import { createServiceLogger } from '../../utils/logger';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { sessionManager } from '../session/session-manager.service';
import { prisma } from '../../config/prisma-client';
import { ConversationState, ConversationSession } from '../session/types';
import { openaiClient } from '../../config/openai-client';
import { EscalationDetection, escalationDetectorService } from './escalation-detector.service';
import {
  EscalationNotificationData,
  escalationNotificationService,
} from './escalation-notification.service';

const logger = createServiceLogger('EscalationHandoffService');

/**
 * Handoff result
 */
export interface HandoffResult {
  success: boolean;
  conversationId: string;
  escalationTrigger: string;
  customerNotified: boolean;
  agentNotified: boolean;
  conversationSummary: string;
}

export class EscalationHandoffService {
  /**
   * Execute complete escalation and handoff
   * Task 4.5, Subtask 3: Complete handoff flow (Plan lines 1084-1089)
   */
  async executeHandoff(
    session: ConversationSession,
    escalation: EscalationDetection
  ): Promise<HandoffResult> {
    logger.info('Executing escalation handoff', {
      sessionId: session.id,
      customerId: session.customerId,
      trigger: escalation.trigger,
    });

    try {
      // 1. Update conversation status to WAITING_AGENT
      const conversation = await this.updateConversationStatus(session);

      // 2. Update session state
      await sessionManager.updateState(session, ConversationState.WAITING_AGENT);

      // 3. Generate conversation summary for agent (Plan line 1086)
      const conversationSummary = await this.generateConversationSummary(session, escalation);

      // 4. Notify customer that agent will respond soon (Plan line 1085)
      const customerNotified = await this.notifyCustomer(session, escalation);

      // 5. Send notifications to agent (Plan line 1087-1088)
      const agentNotified = await this.notifyAgent(
        session,
        conversation,
        escalation,
        conversationSummary
      );

      // 6. Log escalation event
      await this.logEscalationEvent(session, escalation);

      logger.info('Escalation handoff completed successfully', {
        sessionId: session.id,
        conversationId: conversation.id,
        customerNotified,
        agentNotified,
      });

      return {
        success: true,
        conversationId: conversation.id,
        escalationTrigger: escalation.trigger!,
        customerNotified,
        agentNotified,
        conversationSummary,
      };
    } catch (error) {
      logger.error('Failed to execute escalation handoff', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });

      throw error;
    }
  }

  /**
   * Update conversation status in database
   */
  private async updateConversationStatus(session: ConversationSession): Promise<any> {
    // Get or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerPhone: session.customerId,
        agentId: session.agentId,
        status: { not: 'closed' },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    if (!conversation) {
      // Create new conversation if doesn't exist
      conversation = await prisma.conversation.create({
        data: {
          agentId: session.agentId,
          customerPhone: session.customerId,
          status: 'waiting_agent',
          startedAt: session.startTime,
          lastActivityAt: new Date(),
          metadata: {
            escalated: true,
            escalatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      // Update existing conversation
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'waiting_agent',
          lastActivityAt: new Date(),
          metadata: {
            ...((conversation.metadata as any) || {}),
            escalated: true,
            escalatedAt: new Date().toISOString(),
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Generate conversation summary for agent using LLM
   * Task 4.5, Subtask 3: Line 1086 - "AI summarizes conversation for agent"
   */
  private async generateConversationSummary(
    session: ConversationSession,
    escalation: EscalationDetection
  ): Promise<string> {
    try {
      logger.info('Generating conversation summary', { sessionId: session.id });

      const conversationHistory = session.context.messageHistory
        .map((msg) => {
          const role = msg.role === 'user' ? 'Customer' : msg.role === 'agent' ? 'Agent' : 'AI';
          const content = typeof msg.content === 'string' ? msg.content : '[Media Message]';
          return `${role}: ${content}`;
        })
        .join('\n');

      const extractedInfo = session.context.extractedInfo;

      const prompt = `Summarize the following customer conversation for a real estate agent who is taking over from the AI assistant.

**Escalation Reason:** ${escalation.reason}
**Escalation Trigger:** ${escalation.trigger}

**Conversation History:**
${conversationHistory}

**Customer Preferences Extracted:**
${JSON.stringify(extractedInfo, null, 2)}

**Please provide:**
1. Brief overview of what the customer wants
2. Key customer requirements and preferences
3. What has been discussed so far
4. Current status and what the customer is waiting for
5. Recommended next steps for the agent

Keep it concise but comprehensive. Format in clear bullet points.`;

      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at summarizing customer conversations for real estate agents. Be concise, clear, and actionable.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const summary = response.choices[0].message.content || 'Unable to generate summary';

      logger.info('Conversation summary generated', {
        sessionId: session.id,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate conversation summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });

      // Fallback to basic summary
      return this.generateBasicSummary(session, escalation);
    }
  }

  /**
   * Generate basic summary without LLM (fallback)
   */
  private generateBasicSummary(
    session: ConversationSession,
    escalation: EscalationDetection
  ): string {
    const extractedInfo = session.context.extractedInfo;
    const messageCount = session.context.messageHistory.length;

    let summary = `**Escalation Summary**\n\n`;
    summary += `**Reason:** ${escalation.reason}\n`;
    summary += `**Trigger:** ${escalation.trigger}\n`;
    summary += `**Messages Exchanged:** ${messageCount}\n\n`;

    if (extractedInfo.budget) {
      summary += `**Budget:** ${extractedInfo.budget} ${extractedInfo.currency || 'EGP'}\n`;
    }
    if (extractedInfo.location) {
      summary += `**Location:** ${extractedInfo.location}\n`;
    }
    if (extractedInfo.propertyType) {
      summary += `**Property Type:** ${extractedInfo.propertyType}\n`;
    }
    if (extractedInfo.bedrooms) {
      summary += `**Bedrooms:** ${extractedInfo.bedrooms}\n`;
    }

    const recentMessages = session.context.messageHistory.slice(-3);
    summary += `\n**Recent Conversation:**\n`;
    recentMessages.forEach((msg) => {
      const role = msg.role === 'user' ? 'Customer' : 'AI';
      const content = typeof msg.content === 'string' ? msg.content.substring(0, 100) : '[Media]';
      summary += `${role}: ${content}...\n`;
    });

    return summary;
  }

  /**
   * Notify customer that agent will respond soon
   * Task 4.5, Subtask 3: Line 1085 - "AI informs customer agent will respond soon"
   */
  private async notifyCustomer(
    session: ConversationSession,
    escalation: EscalationDetection
  ): Promise<boolean> {
    try {
      logger.info('Notifying customer about escalation', {
        sessionId: session.id,
        customerId: session.customerId,
      });

      // Determine language preference
      const language = session.context.languagePreference || 'en';

      // Prepare message based on escalation trigger
      let message: string;

      if (escalation.trigger === 'EXPLICIT_REQUEST') {
        // Customer asked for agent
        message =
          language === 'ar'
            ? 'شكراً لك! سأقوم بتحويلك إلى أحد موظفينا المتخصصين الآن. سيقوم بالرد عليك في أقرب وقت ممكن. 👨‍💼'
            : 'Thank you! I am transferring you to one of our specialists now. They will respond to you as soon as possible. 👨‍💼';
      } else if (escalation.trigger === 'COMPLAINT') {
        // Complaint detected
        message =
          language === 'ar'
            ? 'أعتذر عن أي إزعاج. سأقوم بتحويلك إلى مدير الخدمة الذي سيساعدك في حل هذه المشكلة فوراً. 🙏'
            : 'I apologize for any inconvenience. I am transferring you to our service manager who will help resolve this immediately. 🙏';
      } else if (escalation.trigger === 'NEGOTIATION_REQUEST') {
        // Negotiation request
        message =
          language === 'ar'
            ? 'بالتأكيد! سأقوم بتحويلك إلى أحد مستشارينا المتخصصين الذي يمكنه مناقشة العروض الخاصة والترتيبات المالية معك. 💼'
            : 'Certainly! I am connecting you with one of our specialized consultants who can discuss special offers and financial arrangements with you. 💼';
      } else {
        // General escalation
        message =
          language === 'ar'
            ? 'سأقوم بتحويلك إلى أحد خبرائنا للحصول على مساعدة أفضل. سيقوم بالرد عليك قريباً. ⏳'
            : 'I am connecting you with one of our experts for better assistance. They will respond to you shortly. ⏳';
      }

      await whatsappService.sendTextMessage(session.customerId, message);

      logger.info('Customer notified about escalation', {
        sessionId: session.id,
        language,
      });

      return true;
    } catch (error) {
      logger.error('Failed to notify customer about escalation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });

      return false;
    }
  }

  /**
   * Notify agent about escalation
   * Task 4.5, Subtask 3: Line 1087 - "Agent receives context and chat history"
   */
  private async notifyAgent(
    session: ConversationSession,
    conversation: any,
    escalation: EscalationDetection,
    conversationSummary: string
  ): Promise<boolean> {
    try {
      logger.info('Notifying agent about escalation', {
        sessionId: session.id,
        agentId: session.agentId,
      });

      // Prepare notification data
      const notificationData: EscalationNotificationData = {
        conversationId: conversation.id,
        customerId: session.customerId,
        customerPhone: session.customerId,
        customerName: conversation.customerName || undefined,
        agentId: session.agentId,
        trigger: escalation.trigger!,
        triggerReason: escalation.reason,
        conversationSummary,
        urgency: escalationNotificationService.determineUrgency(escalation.trigger!),
        timestamp: new Date(),
      };

      // Send all configured notifications (WhatsApp, Email, SMS, In-app)
      await escalationNotificationService.sendEscalationNotifications(notificationData, session);

      logger.info('Agent notified about escalation', {
        sessionId: session.id,
        agentId: session.agentId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to notify agent about escalation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });

      return false;
    }
  }

  /**
   * Log escalation event for analytics
   */
  private async logEscalationEvent(
    session: ConversationSession,
    escalation: EscalationDetection
  ): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          agentId: session.agentId,
          eventType: 'conversation_escalated',
          eventData: {
            sessionId: session.id,
            customerId: session.customerId,
            trigger: escalation.trigger,
            reason: escalation.reason,
            confidence: escalation.confidence,
            messageCount: session.context.messageHistory.length,
            extractedInfo: session.context.extractedInfo,
            timestamp: new Date().toISOString(),
          },
        },
      });

      logger.info('Escalation event logged', {
        sessionId: session.id,
        trigger: escalation.trigger,
      });
    } catch (error) {
      logger.error('Failed to log escalation event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });
      // Don't throw - logging failure shouldn't break the escalation
    }
  }

  /**
   * Resume AI control after agent releases conversation
   * Task 4.5, Subtask 3: Line 1089 - "AI resumes when agent marks conversation as handled"
   */
  async resumeAIControl(conversationId: string, agentId: string): Promise<void> {
    try {
      logger.info('Resuming AI control', { conversationId, agentId });

      // Update conversation status
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'active',
          lastActivityAt: new Date(),
          metadata: {
            ...(
              await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { metadata: true },
              })
            )?.metadata,
            aiResumed: true,
            aiResumedAt: new Date().toISOString(),
            handledByAgent: agentId,
          },
        },
      });

      // Update session state if active
      try {
        const session = await sessionManager.getSession(conversation.customerPhone);
        if (session) {
          await sessionManager.updateState(session, ConversationState.ACTIVE);
          logger.info('Session state updated to ACTIVE', {
            conversationId,
            sessionId: session.id,
          });
        }
      } catch (sessionError) {
        logger.warn('Could not update session state', {
          conversationId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
        });
      }

      // Notify customer that AI is resuming
      await this.notifyCustomerAIResumed(conversation);

      // Log event
      await prisma.analyticsEvent.create({
        data: {
          agentId,
          eventType: 'ai_control_resumed',
          eventData: {
            conversationId,
            customerPhone: conversation.customerPhone,
            timestamp: new Date().toISOString(),
          },
        },
      });

      logger.info('AI control resumed successfully', { conversationId });
    } catch (error) {
      logger.error('Failed to resume AI control', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Notify customer that AI is resuming
   */
  private async notifyCustomerAIResumed(conversation: any): Promise<void> {
    try {
      // Get language preference from conversation metadata
      const metadata = conversation.metadata as any;
      const language = metadata?.languagePreference || 'en';

      const message =
        language === 'ar'
          ? 'شكراً لتحدثك معنا. أنا هنا لمساعدتك في أي شيء آخر تحتاجه. 😊'
          : 'Thank you for speaking with us. I am here to help you with anything else you need. 😊';

      await whatsappService.sendTextMessage(conversation.customerPhone, message);

      logger.info('Customer notified about AI resumption', {
        conversationId: conversation.id,
      });
    } catch (error) {
      logger.error('Failed to notify customer about AI resumption', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversation.id,
      });
      // Don't throw - notification failure shouldn't break the resumption
    }
  }
}

// Export singleton instance
export const escalationHandoffService = new EscalationHandoffService();
