/**
 * Viewing Confirmation Service
 * Task 4.3 Fix #2: Send confirmation messages after booking
 * As per plan line 993: "Sends confirmation to both parties"
 */

import { createServiceLogger } from '../../utils/logger';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { ViewingWithDetails } from '../../types/schedule';
import { messageBuilderService } from './message-builder.service';

const logger = createServiceLogger('ConfirmationService');

/**
 * Confirmation Service
 * Sends WhatsApp confirmations for viewing bookings
 */
export class ConfirmationService {
  /**
   * Send confirmation to customer after booking
   * Bilingual message with all viewing details
   */
  async sendCustomerConfirmation(viewing: ViewingWithDetails): Promise<void> {
    logger.info('Sending customer confirmation', {
      viewingId: viewing.id,
      customerPhone: viewing.customerPhone,
    });

    try {
      if (!viewing.property || !viewing.agent) {
        throw new Error('Viewing missing property or agent data');
      }

      const message = messageBuilderService.buildCustomerConfirmation(viewing);
      
      await whatsappService.sendTextMessage(viewing.customerPhone, message);

      logger.info('Customer confirmation sent successfully', {
        viewingId: viewing.id,
        customerPhone: viewing.customerPhone,
      });
    } catch (error) {
      logger.error('Failed to send customer confirmation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        viewingId: viewing.id,
        customerPhone: viewing.customerPhone,
      });
      // Don't throw - booking is already created, confirmation failure shouldn't block
    }
  }

  /**
   * Send notification to agent about new booking
   */
  async sendAgentNotification(viewing: ViewingWithDetails): Promise<void> {
    logger.info('Sending agent notification', {
      viewingId: viewing.id,
      agentId: viewing.agentId,
    });

    try {
      if (!viewing.property || !viewing.agent) {
        throw new Error('Viewing missing property or agent data');
      }

      const message = messageBuilderService.buildAgentNotification(viewing);
      
      // Send to agent's WhatsApp number
      await whatsappService.sendTextMessage(viewing.agent.whatsappNumber, message);

      logger.info('Agent notification sent successfully', {
        viewingId: viewing.id,
        agentId: viewing.agentId,
      });
    } catch (error) {
      logger.error('Failed to send agent notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        viewingId: viewing.id,
        agentId: viewing.agentId,
      });
      // Don't throw - notification failure shouldn't block
    }
  }

  /**
   * Send both confirmations (customer + agent)
   */
  async sendBookingConfirmations(viewing: ViewingWithDetails): Promise<void> {
    logger.info('Sending booking confirmations', {
      viewingId: viewing.id,
    });

    // Send both in parallel
    await Promise.all([
      this.sendCustomerConfirmation(viewing),
      this.sendAgentNotification(viewing),
    ]);

    logger.info('Booking confirmations sent', {
      viewingId: viewing.id,
    });
  }

  /**
   * Send cancellation notice to both parties
   */
  async sendCancellationNotice(viewing: ViewingWithDetails, reason?: string): Promise<void> {
    logger.info('Sending cancellation notice', {
      viewingId: viewing.id,
    });

    try {
      if (!viewing.property || !viewing.agent) {
        throw new Error('Viewing missing property or agent data');
      }

      const customerMessage = messageBuilderService.buildCancellationNotice(viewing);
      const agentMessage = messageBuilderService.buildCancellationNotice(viewing);

      // Send both in parallel
      await Promise.all([
        whatsappService.sendTextMessage(viewing.customerPhone, customerMessage),
        whatsappService.sendTextMessage(viewing.agent.whatsappNumber, agentMessage),
      ]);

      logger.info('Cancellation notices sent', {
        viewingId: viewing.id,
      });
    } catch (error) {
      logger.error('Failed to send cancellation notice', {
        error: error instanceof Error ? error.message : 'Unknown error',
        viewingId: viewing.id,
      });
    }
  }

  /**
   * Send rescheduling confirmation to both parties
   */
  async sendRescheduleConfirmation(
    viewing: ViewingWithDetails,
    oldTime: Date
  ): Promise<void> {
    logger.info('Sending reschedule confirmation', {
      viewingId: viewing.id,
    });

    try {
      if (!viewing.property || !viewing.agent) {
        throw new Error('Viewing missing property or agent data');
      }

      const customerMessage = messageBuilderService.buildRescheduleConfirmation(viewing, oldTime);
      const agentMessage = messageBuilderService.buildRescheduleConfirmation(viewing, oldTime);

      // Send both in parallel
      await Promise.all([
        whatsappService.sendTextMessage(viewing.customerPhone, customerMessage),
        whatsappService.sendTextMessage(viewing.agent.whatsappNumber, agentMessage),
      ]);

      logger.info('Reschedule confirmations sent', {
        viewingId: viewing.id,
      });
    } catch (error) {
      logger.error('Failed to send reschedule confirmation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        viewingId: viewing.id,
      });
    }
  }

  // ===== Private Message Building Methods =====

  // Task 4.3 Fix #3 & #4: Duplicate message building methods removed
  // Now using shared messageBuilderService for all message creation
}

// Singleton instance
export const confirmationService = new ConfirmationService();

// Register with scheduling service to avoid circular dependency
process.nextTick(() => {
  try {
    import('./scheduling.service').then(({ schedulingService }) => {
      schedulingService.setConfirmationService(confirmationService);
      logger.info('Confirmation service registered with scheduling service');
    });
  } catch (error) {
    logger.warn('Failed to register with scheduling service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
