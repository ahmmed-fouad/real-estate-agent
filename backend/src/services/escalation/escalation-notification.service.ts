/**
 * Escalation Notification Service
 * Task 4.5, Subtask 2: Notification System (Plan lines 1078-1082)
 * 
 * Sends notifications when conversation is escalated:
 * - WhatsApp notification to agent
 * - Email notification
 * - SMS notification (optional)
 * - In-app notification
 */

import { createServiceLogger } from '../../utils/logger';
import { emailService, emailTemplateService } from '../email';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { prisma } from '../../config/prisma-client';
import { EscalationTrigger } from './escalation-detector.service';
import { ConversationSession } from '../session/types';

const logger = createServiceLogger('EscalationNotificationService');

/**
 * Escalation notification data
 */
export interface EscalationNotificationData {
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerName?: string;
  agentId: string;
  trigger: EscalationTrigger;
  triggerReason: string;
  conversationSummary: string;
  urgency: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export class EscalationNotificationService {
  /**
   * Send all configured notifications for escalation
   * Task 4.5, Subtask 2: As per plan lines 1078-1082
   */
  async sendEscalationNotifications(
    data: EscalationNotificationData,
    session: ConversationSession
  ): Promise<void> {
    logger.info('Sending escalation notifications', {
      conversationId: data.conversationId,
      agentId: data.agentId,
      trigger: data.trigger,
    });

    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        whatsappNumber: true,
        settings: true,
      },
    });

    if (!agent) {
      logger.error('Agent not found for escalation notification', { agentId: data.agentId });
      return;
    }

    // Create in-app notification first (highest priority, always works)
    await this.createInAppNotification(data, agent);

    // Send notifications in parallel for better performance
    const notificationPromises: Promise<void>[] = [];

    // WhatsApp notification (Task 4.5, Subtask 2: Line 1079)
    if (agent.whatsappNumber) {
      notificationPromises.push(this.sendWhatsAppNotification(data, agent));
    }

    // Email notification (Task 4.5, Subtask 2: Line 1080)
    if (agent.email && emailService.isConfigured()) {
      notificationPromises.push(this.sendEmailNotification(data, agent, session));
    }

    // SMS notification (Task 4.5, Subtask 2: Line 1081 - Optional)
    const settings = agent.settings as any;
    if (settings?.notifications?.sms && agent.phoneNumber) {
      notificationPromises.push(this.sendSMSNotification(data, agent));
    }

    // Wait for all notifications to complete (don't fail if some fail)
    await Promise.allSettled(notificationPromises);

    logger.info('Escalation notifications sent', {
      conversationId: data.conversationId,
      agentId: data.agentId,
      notificationCount: notificationPromises.length + 1, // +1 for in-app
    });
  }

  /**
   * Send WhatsApp notification to agent
   * Task 4.5, Subtask 2: Line 1079 - "WhatsApp notification to agent"
   */
  private async sendWhatsAppNotification(
    data: EscalationNotificationData,
    agent: any
  ): Promise<void> {
    try {
      logger.info('Sending WhatsApp notification to agent', {
        agentId: agent.id,
        agentWhatsApp: agent.whatsappNumber,
      });

      const urgencyEmoji = this.getUrgencyEmoji(data.urgency);
      const triggerText = this.formatTriggerText(data.trigger);

      const message = `${urgencyEmoji} *Escalation Alert*

*Trigger:* ${triggerText}
*Customer:* ${data.customerName || data.customerPhone}
*Reason:* ${data.triggerReason}

*Conversation Summary:*
${data.conversationSummary}

*Action Required:*
Please review this conversation and respond to the customer.

View in portal: ${process.env.APP_BASE_URL}/conversations/${data.conversationId}`;

      await whatsappService.sendTextMessage(agent.whatsappNumber, message);

      logger.info('WhatsApp notification sent successfully', {
        agentId: agent.id,
        conversationId: data.conversationId,
      });
    } catch (error) {
      logger.error('Failed to send WhatsApp notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: agent.id,
      });
      // Don't throw - other notifications should still be sent
    }
  }

  /**
   * Send email notification to agent
   * Task 4.5, Subtask 2: Line 1080 - "Email notification"
   */
  private async sendEmailNotification(
    data: EscalationNotificationData,
    agent: any,
    session: ConversationSession
  ): Promise<void> {
    try {
      logger.info('Sending email notification to agent', {
        agentId: agent.id,
        agentEmail: agent.email,
      });

      const triggerText = this.formatTriggerText(data.trigger);
      const urgencyColor = this.getUrgencyColor(data.urgency);

      // Use centralized email template service (Task 4.5 Refactor)
      const emailHtml = emailTemplateService.generateEmail({
        title: '🚨 Conversation Escalated',
        subtitle: `${data.urgency.toUpperCase()} Priority`,
        headerColor: urgencyColor,
        infoSections: [
          { label: 'Trigger', value: triggerText },
          { label: 'Customer', value: data.customerName || data.customerPhone },
          { label: 'Phone', value: data.customerPhone },
          { label: 'Time', value: new Date(data.timestamp).toLocaleString() },
        ],
        contentSections: [
          {
            heading: '📋 Reason for Escalation',
            content: data.triggerReason,
            style: 'highlight',
          },
          {
            heading: '💬 Conversation Summary',
            content: this.formatConversationForEmail(session),
          },
        ],
        cta: {
          text: 'View Full Conversation →',
          url: `${process.env.APP_BASE_URL}/conversations/${data.conversationId}`,
        },
        actionNote: 'Please review this conversation and respond to the customer as soon as possible. The AI assistant has paused automatic responses until you take over or release the conversation.',
        footerText: 'WhatsApp Real Estate AI - Escalation Alert',
        customStyles: emailTemplateService.getCustomStyles({
          includeHighlightBox: true,
        }),
      });

      await emailService.sendEmail({
        to: agent.email,
        subject: `🚨 ${data.urgency.toUpperCase()} Priority: Conversation Escalated - ${data.customerName || data.customerPhone}`,
        html: emailHtml,
      });

      logger.info('Email notification sent successfully', {
        agentId: agent.id,
        conversationId: data.conversationId,
      });
    } catch (error) {
      logger.error('Failed to send email notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: agent.id,
      });
      // Don't throw - other notifications should still be sent
    }
  }

  /**
   * Send SMS notification to agent
   * Task 4.5, Subtask 2: Line 1081 - "SMS notification (optional)"
   */
  private async sendSMSNotification(
    data: EscalationNotificationData,
    agent: any
  ): Promise<void> {
    try {
      logger.info('SMS notification requested', {
        agentId: agent.id,
        agentPhone: agent.phoneNumber,
      });

      // TODO: Implement SMS service integration (Twilio, AWS SNS, etc.)
      // For now, log the notification
      logger.warn('SMS notification not yet implemented - logging instead', {
        agentId: agent.id,
        message: `Escalation Alert: ${data.customerName || data.customerPhone} - ${data.triggerReason}`,
      });

      // Store that SMS was attempted
      await prisma.analyticsEvent.create({
        data: {
          agentId: agent.id,
          eventType: 'sms_notification_attempted',
          eventData: {
            conversationId: data.conversationId,
            trigger: data.trigger,
            phone: agent.phoneNumber,
          },
        },
      });

      logger.info('SMS notification logged', { agentId: agent.id });
    } catch (error) {
      logger.error('Failed to send SMS notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: agent.id,
      });
      // Don't throw - other notifications should still be sent
    }
  }

  /**
   * Create in-app notification
   * Task 4.5, Subtask 2: Line 1082 - "In-app notification"
   */
  private async createInAppNotification(
    data: EscalationNotificationData,
    agent: any
  ): Promise<void> {
    try {
      logger.info('Creating in-app notification', {
        agentId: agent.id,
        conversationId: data.conversationId,
      });

      // Store notification in database for agent portal
      await prisma.analyticsEvent.create({
        data: {
          agentId: agent.id,
          eventType: 'escalation_notification',
          eventData: {
            conversationId: data.conversationId,
            customerId: data.customerId,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            trigger: data.trigger,
            triggerReason: data.triggerReason,
            conversationSummary: data.conversationSummary,
            urgency: data.urgency,
            timestamp: data.timestamp.toISOString(),
            read: false,
            url: `/conversations/${data.conversationId}`,
          },
        },
      });

      logger.info('In-app notification created successfully', {
        agentId: agent.id,
        conversationId: data.conversationId,
      });
    } catch (error) {
      logger.error('Failed to create in-app notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: agent.id,
      });
      // Don't throw - this is critical notification, but others should still be sent
    }
  }

  /**
   * Format conversation history for email
   * Task 4.5 Refactor: Use centralized template service
   */
  private formatConversationForEmail(session: ConversationSession): string {
    const recentMessages = session.context.messageHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : '[Media/Location]',
      timestamp: msg.timestamp,
    }));
    return emailTemplateService.formatConversationMessages(recentMessages);
  }

  /**
   * Get urgency emoji
   */
  private getUrgencyEmoji(urgency: string): string {
    switch (urgency) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * Get urgency color
   */
  private getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }

  /**
   * Format trigger text for display
   */
  private formatTriggerText(trigger: EscalationTrigger): string {
    const triggerTexts: Record<EscalationTrigger, string> = {
      [EscalationTrigger.EXPLICIT_REQUEST]: 'Customer Requested Agent',
      [EscalationTrigger.FRUSTRATION_DETECTED]: 'Customer Frustration Detected',
      [EscalationTrigger.COMPLEX_QUERY]: 'Complex Query',
      [EscalationTrigger.NEGOTIATION_REQUEST]: 'Negotiation/Custom Deal Request',
      [EscalationTrigger.COMPLAINT]: 'Customer Complaint',
      [EscalationTrigger.REPEATED_QUESTION]: 'Repeated Question',
    };

    return triggerTexts[trigger] || 'Unknown Trigger';
  }

  /**
   * Determine urgency level based on trigger
   */
  determineUrgency(trigger: EscalationTrigger): 'high' | 'medium' | 'low' {
    const highUrgency = [
      EscalationTrigger.EXPLICIT_REQUEST,
      EscalationTrigger.COMPLAINT,
      EscalationTrigger.FRUSTRATION_DETECTED,
    ];

    const mediumUrgency = [
      EscalationTrigger.NEGOTIATION_REQUEST,
      EscalationTrigger.REPEATED_QUESTION,
    ];

    if (highUrgency.includes(trigger)) {
      return 'high';
    } else if (mediumUrgency.includes(trigger)) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Export singleton instance
export const escalationNotificationService = new EscalationNotificationService();
