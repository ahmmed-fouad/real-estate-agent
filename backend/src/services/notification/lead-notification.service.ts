/**
 * Lead Notification Service
 * Task 4.1, Subtask 3: Lead Routing (lines 945-948)
 * 
 * Routes leads based on quality:
 * - Hot leads → Immediate notification to agent
 * - Warm leads → Daily digest
 * - Cold leads → Nurture campaign
 */

import { createServiceLogger } from '../../utils/logger';
import { LeadScore, LeadQuality } from '../lead/lead-scoring-types';
import { ConversationSession } from '../session/types';
import { prisma } from '../../config/prisma-client';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { emailService, emailTemplateService } from '../email';

const logger = createServiceLogger('LeadNotificationService');

/**
 * Notification delivery methods
 */
export interface NotificationChannels {
  whatsapp?: boolean;
  email?: boolean;
  sms?: boolean;
  inApp?: boolean;
}

/**
 * Notification data for agent
 */
export interface LeadNotification {
  leadId: string;
  customerId: string;
  customerPhone: string;
  agentId: string;
  leadQuality: LeadQuality;
  leadScore: number;
  scoreExplanation: string;
  conversationSnippet: string;
  timestamp: Date;
  urgency: 'immediate' | 'daily' | 'weekly';
}

/**
 * Lead Notification Service
 * Handles notification routing based on lead quality
 */
export class LeadNotificationService {
  /**
   * Route notification based on lead quality
   * Task 4.1, Subtask 3: As per plan lines 945-948
   * 
   * FIX #1 & #2: Now returns notification metadata instead of storing directly
   * This allows caller to combine with other updates in single atomic operation
   * 
   * @param session - Conversation session
   * @param leadScore - Calculated lead score
   * @param scoreExplanation - Human-readable explanation
   * @param previousQuality - Previous lead quality (for tracking changes)
   * @returns Notification metadata to store in conversation
   */
  async routeLeadNotification(
    session: ConversationSession,
    leadScore: LeadScore,
    scoreExplanation: string,
    previousQuality: string | null
  ): Promise<any> {
    logger.info('Routing lead notification', {
      sessionId: session.id,
      customerId: session.customerId,
      leadQuality: leadScore.quality,
      leadScore: leadScore.total,
      previousQuality,
    });

    // Prepare notification data
    const notification: LeadNotification = {
      leadId: session.id,
      customerId: session.customerId,
      customerPhone: session.customerId, // Phone is the customer ID in our system
      agentId: session.agentId,
      leadQuality: leadScore.quality,
      leadScore: leadScore.total,
      scoreExplanation,
      conversationSnippet: this.getConversationSnippet(session),
      timestamp: new Date(),
      urgency: this.determineUrgency(leadScore.quality),
    };

    // Route based on lead quality (as per plan lines 946-948)
    switch (leadScore.quality) {
      case 'hot':
        // Hot leads → Immediate notification
        await this.sendImmediateNotification(notification, previousQuality);
        break;

      case 'warm':
        // Warm leads → Daily digest
        await this.queueForDailyDigest(notification, previousQuality);
        break;

      case 'cold':
        // Cold leads → Nurture campaign
        await this.queueForNurtureCampaign(notification, previousQuality);
        break;
    }

    logger.info('Lead notification routed successfully', {
      leadId: notification.leadId,
      quality: notification.leadQuality,
      urgency: notification.urgency,
    });

    // FIX #1: Return metadata for caller to store (no duplicate DB update)
    return {
      type: this.determineUrgency(leadScore.quality),
      quality: notification.leadQuality,
      score: notification.leadScore,
      explanation: notification.scoreExplanation,
      timestamp: notification.timestamp.toISOString(),
      previousQuality: previousQuality,
      qualityTransition: previousQuality ? `${previousQuality} → ${leadScore.quality}` : `new → ${leadScore.quality}`,
    };
  }

  /**
   * Send immediate notification for hot leads
   * Task 4.1, Subtask 3: Line 946 - "Hot leads → Immediate notification to agent"
   * Task 4.5 Fix #2: Actually send notifications instead of just logging
   * 
   * FIX #1: Removed duplicate database update - caller handles storage
   */
  private async sendImmediateNotification(
    notification: LeadNotification,
    previousQuality: string | null
  ): Promise<void> {
    logger.info('Sending immediate notification for hot lead', {
      leadId: notification.leadId,
      agentId: notification.agentId,
      leadScore: notification.leadScore,
      transition: previousQuality ? `${previousQuality} → hot` : 'new → hot',
    });

    try {
      // Create analytics event for hot lead
      await prisma.analyticsEvent.create({
        data: {
          agentId: notification.agentId,
          eventType: 'hot_lead_identified',
          eventData: {
            leadId: notification.leadId,
            customerPhone: notification.customerPhone,
            leadScore: notification.leadScore,
            scoreExplanation: notification.scoreExplanation,
            timestamp: notification.timestamp.toISOString(),
            previousQuality: previousQuality,
            qualityTransition: previousQuality ? `${previousQuality} → hot` : 'new → hot',
          },
        },
      });

      // Get agent details for notification
      const agent = await prisma.agent.findUnique({
        where: { id: notification.agentId },
        select: {
          id: true,
          fullName: true,
          email: true,
          whatsappNumber: true,
        },
      });

      if (!agent) {
        logger.error('Agent not found for hot lead notification', {
          agentId: notification.agentId,
        });
        return;
      }

      // 1. Send WhatsApp notification to agent
      if (agent.whatsappNumber) {
        try {
          const whatsappMessage = `🔥 *Hot Lead Alert!*

*Score:* ${notification.leadScore}/100
*Customer:* ${notification.customerPhone}
*Quality Transition:* ${previousQuality ? `${previousQuality} → hot` : 'new → hot'}

*Score Breakdown:*
${notification.scoreExplanation}

*Recent Conversation:*
${notification.conversationSnippet}

*Action:* Please reach out to this customer immediately!

View in portal: ${process.env.APP_BASE_URL || 'http://localhost:3000'}/conversations`;

          await whatsappService.sendTextMessage(agent.whatsappNumber, whatsappMessage);
          
          logger.info('WhatsApp notification sent for hot lead', {
            agentId: agent.id,
            leadId: notification.leadId,
          });
        } catch (whatsappError) {
          logger.error('Failed to send WhatsApp notification for hot lead', {
            error: whatsappError instanceof Error ? whatsappError.message : 'Unknown error',
            agentId: agent.id,
          });
        }
      }

      // 2. Send email notification
      if (agent.email && emailService.isConfigured()) {
        try {
          // Use centralized email template service (Task 4.5 Refactor)
          const scoreBadge = `<div style="text-align: center; margin: 20px 0;"><span class="score-badge">Score: ${notification.leadScore}/100</span></div>`;
          
          const emailHtml = emailTemplateService.generateEmail({
            title: '🔥 Hot Lead Alert!',
            subtitle: 'Immediate Action Required',
            headerColor: '#ef4444',
            infoSections: [
              { label: 'Customer', value: notification.customerPhone },
              { label: 'Quality Transition', value: previousQuality ? `${previousQuality} → hot` : 'new → hot' },
              { label: 'Time', value: new Date(notification.timestamp).toLocaleString() },
            ],
            contentSections: [
              {
                content: scoreBadge,
              },
              {
                heading: '📊 Score Breakdown',
                content: notification.scoreExplanation.replace(/\n/g, '<br>'),
              },
              {
                heading: '💬 Recent Conversation',
                content: `<div class="conversation">${notification.conversationSnippet}</div>`,
              },
            ],
            cta: {
              text: 'View in Portal →',
              url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/conversations`,
            },
            actionNote: 'This is a high-priority lead. Please reach out to the customer immediately to maximize conversion chances.',
            customStyles: emailTemplateService.getCustomStyles({
              includeScoreBadge: true,
              includeConversationStyle: true,
            }),
          });

          await emailService.sendEmail({
            to: agent.email,
            subject: `🔥 Hot Lead Alert - ${notification.customerPhone} (Score: ${notification.leadScore}/100)`,
            html: emailHtml,
          });

          logger.info('Email notification sent for hot lead', {
            agentId: agent.id,
            leadId: notification.leadId,
          });
        } catch (emailError) {
          logger.error('Failed to send email notification for hot lead', {
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            agentId: agent.id,
          });
        }
      }

      // 3. Create in-app notification
      await prisma.analyticsEvent.create({
        data: {
          agentId: notification.agentId,
          eventType: 'hot_lead_notification',
          eventData: {
            leadId: notification.leadId,
            customerPhone: notification.customerPhone,
            leadScore: notification.leadScore,
            scoreExplanation: notification.scoreExplanation,
            conversationSnippet: notification.conversationSnippet,
            timestamp: notification.timestamp.toISOString(),
            read: false,
            urgency: 'immediate',
          },
        },
      });

      logger.info('Hot lead notification sent successfully', {
        leadId: notification.leadId,
        agentId: notification.agentId,
      });

    } catch (error) {
      logger.error('Failed to send immediate notification', {
        leadId: notification.leadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Queue lead for daily digest
   * Task 4.1, Subtask 3: Line 947 - "Warm leads → Daily digest"
   * 
   * FIX #1: Removed duplicate database update - caller handles storage
   */
  private async queueForDailyDigest(
    notification: LeadNotification,
    previousQuality: string | null
  ): Promise<void> {
    logger.info('Queueing lead for daily digest', {
      leadId: notification.leadId,
      agentId: notification.agentId,
      transition: previousQuality ? `${previousQuality} → warm` : 'new → warm',
    });

    try {
      // Create analytics event for warm lead
      await prisma.analyticsEvent.create({
        data: {
          agentId: notification.agentId,
          eventType: 'warm_lead_identified',
          eventData: {
            leadId: notification.leadId,
            customerPhone: notification.customerPhone,
            leadScore: notification.leadScore,
            scoreExplanation: notification.scoreExplanation,
            timestamp: notification.timestamp.toISOString(),
            previousQuality: previousQuality,
            qualityTransition: previousQuality ? `${previousQuality} → warm` : 'new → warm',
          },
        },
      });

      // FIX #1: Removed storeNotificationForPortal() - caller handles storage

      logger.info('Lead queued for daily digest successfully', {
        leadId: notification.leadId,
      });

    } catch (error) {
      logger.error('Failed to queue for daily digest', {
        leadId: notification.leadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Queue lead for nurture campaign
   * Task 4.1, Subtask 3: Line 948 - "Cold leads → Nurture campaign"
   * 
   * FIX #1: Removed duplicate database update - caller handles storage
   */
  private async queueForNurtureCampaign(
    notification: LeadNotification,
    previousQuality: string | null
  ): Promise<void> {
    logger.info('Queueing lead for nurture campaign', {
      leadId: notification.leadId,
      agentId: notification.agentId,
      transition: previousQuality ? `${previousQuality} → cold` : 'new → cold',
    });

    try {
      // Create analytics event for cold lead
      await prisma.analyticsEvent.create({
        data: {
          agentId: notification.agentId,
          eventType: 'cold_lead_identified',
          eventData: {
            leadId: notification.leadId,
            customerPhone: notification.customerPhone,
            leadScore: notification.leadScore,
            timestamp: notification.timestamp.toISOString(),
            previousQuality: previousQuality,
            qualityTransition: previousQuality ? `${previousQuality} → cold` : 'new → cold',
          },
        },
      });

      // FIX #1: Removed storeNotificationForPortal() - caller handles storage

      logger.info('Lead queued for nurture campaign successfully', {
        leadId: notification.leadId,
      });

    } catch (error) {
      logger.error('Failed to queue for nurture campaign', {
        leadId: notification.leadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // FIX #1: Removed storeNotificationForPortal() method
  // Notification metadata is now stored by caller in single atomic update

  /**
   * Get conversation snippet for notification
   * Returns last 2-3 messages for context
   */
  private getConversationSnippet(session: ConversationSession): string {
    const recentMessages = session.context.messageHistory.slice(-3);
    const snippet = recentMessages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Customer' : 'Bot';
        const content = typeof msg.content === 'string'
          ? msg.content.substring(0, 100)
          : '[Media]';
        return `${role}: ${content}`;
      })
      .join('\n');

    return snippet || 'No conversation history yet';
  }

  /**
   * Determine notification urgency based on lead quality
   */
  private determineUrgency(
    quality: LeadQuality
  ): 'immediate' | 'daily' | 'weekly' {
    switch (quality) {
      case 'hot':
        return 'immediate';
      case 'warm':
        return 'daily';
      case 'cold':
        return 'weekly';
    }
  }

  /**
   * Get notification statistics for an agent
   * Useful for agent dashboard
   */
  async getAgentNotificationStats(
    agentId: string,
    days: number = 7
  ): Promise<{
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    totalNotifications: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const events = await prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: {
          agentId,
          createdAt: { gte: since },
          eventType: {
            in: ['hot_lead_identified', 'warm_lead_identified', 'cold_lead_identified'],
          },
        },
        _count: true,
      });

      const stats = {
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        totalNotifications: 0,
      };

      events.forEach((event) => {
        const count = event._count;
        stats.totalNotifications += count;

        if (event.eventType === 'hot_lead_identified') {
          stats.hotLeads = count;
        } else if (event.eventType === 'warm_lead_identified') {
          stats.warmLeads = count;
        } else if (event.eventType === 'cold_lead_identified') {
          stats.coldLeads = count;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get notification stats', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        totalNotifications: 0,
      };
    }
  }
}

// Export singleton instance
export const leadNotificationService = new LeadNotificationService();
