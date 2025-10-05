/**
 * Reminder Service
 * Task 4.3, Subtask 3: Reminder System
 * As per plan lines 1000-1003
 * 
 * Handles:
 * - Send reminder 24h before viewing
 * - Send reminder 2h before viewing
 * - Handle cancellations/rescheduling (cancel scheduled reminders)
 */

import Queue, { Job } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { redisManager } from '../../config/redis-connection';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { prisma } from '../../config/prisma-client';
import { messageBuilderService } from './message-builder.service';

const logger = createServiceLogger('ReminderService');

/**
 * Reminder job data
 */
export interface ReminderJob {
  viewingId: string;
  type: '24h' | '2h';
  scheduledTime: Date;
}

/**
 * Reminder Service
 * Manages automated viewing reminders via WhatsApp
 */
export class ReminderService {
  private queue: Queue<ReminderJob>;

  constructor() {
    // Initialize Bull queue with Redis
    this.queue = new Queue<ReminderJob>('viewing-reminders', redisManager.getBullRedisConfig());

    // Process reminder jobs
    this.queue.process(async (job: Job<ReminderJob>) => {
      return this.processReminder(job);
    });

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Reminder service initialized', {
      queueName: 'viewing-reminders',
    });

    // Set this instance in scheduling service to avoid circular dependency
    // This will be called after both services are instantiated
    this.initializeSchedulingServiceIntegration();
  }

  /**
   * Initialize integration with scheduling service
   * Deferred to avoid circular dependency
   */
  private async initializeSchedulingServiceIntegration(): Promise<void> {
    // Defer until next tick to ensure schedulingService is instantiated
    process.nextTick(() => {
      try {
        // Import and set reminder service in scheduling service
        import('./scheduling.service').then(({ schedulingService }) => {
          schedulingService.setReminderService(this);
          logger.info('Reminder service registered with scheduling service');
        });
      } catch (error) {
        logger.warn('Failed to register with scheduling service', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Schedule reminders for a new viewing
   * Task 4.3, Subtask 3: As per plan lines 1001-1002
   * 
   * @param viewingId - Viewing ID
   * @param scheduledTime - Viewing scheduled time
   */
  async scheduleReminders(viewingId: string, scheduledTime: Date): Promise<void> {
    logger.info('Scheduling reminders', { viewingId, scheduledTime });

    const now = new Date();
    const scheduledTimestamp = scheduledTime.getTime();

    // Calculate reminder times
    const reminder24h = new Date(scheduledTimestamp - 24 * 60 * 60 * 1000);
    const reminder2h = new Date(scheduledTimestamp - 2 * 60 * 60 * 1000);

    // Schedule 24h reminder if it's in the future
    if (reminder24h > now) {
      await this.queue.add(
        {
          viewingId,
          type: '24h',
          scheduledTime,
        },
        {
          delay: reminder24h.getTime() - now.getTime(),
          jobId: `${viewingId}-24h`,
          removeOnComplete: true,
        }
      );

      logger.info('24h reminder scheduled', {
        viewingId,
        reminderTime: reminder24h,
      });
    }

    // Schedule 2h reminder if it's in the future
    if (reminder2h > now) {
      await this.queue.add(
        {
          viewingId,
          type: '2h',
          scheduledTime,
        },
        {
          delay: reminder2h.getTime() - now.getTime(),
          jobId: `${viewingId}-2h`,
          removeOnComplete: true,
        }
      );

      logger.info('2h reminder scheduled', {
        viewingId,
        reminderTime: reminder2h,
      });
    }

    logger.info('Reminders scheduled successfully', { viewingId });
  }

  /**
   * Cancel scheduled reminders for a viewing
   * Task 4.3, Subtask 3: As per plan line 1003
   * Used when viewing is cancelled or rescheduled
   * 
   * @param viewingId - Viewing ID
   */
  async cancelReminders(viewingId: string): Promise<void> {
    logger.info('Cancelling reminders', { viewingId });

    try {
      // Remove both reminder jobs
      const job24h = await this.queue.getJob(`${viewingId}-24h`);
      const job2h = await this.queue.getJob(`${viewingId}-2h`);

      if (job24h) {
        await job24h.remove();
        logger.info('24h reminder cancelled', { viewingId });
      }

      if (job2h) {
        await job2h.remove();
        logger.info('2h reminder cancelled', { viewingId });
      }

      logger.info('Reminders cancelled successfully', { viewingId });
    } catch (error) {
      logger.error('Failed to cancel reminders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        viewingId,
      });
      throw error;
    }
  }

  /**
   * Reschedule reminders for a viewing
   * Task 4.3, Subtask 3: As per plan line 1003
   * 
   * @param viewingId - Viewing ID
   * @param newScheduledTime - New viewing time
   */
  async rescheduleReminders(viewingId: string, newScheduledTime: Date): Promise<void> {
    logger.info('Rescheduling reminders', {
      viewingId,
      newScheduledTime,
    });

    // Cancel existing reminders
    await this.cancelReminders(viewingId);

    // Schedule new reminders
    await this.scheduleReminders(viewingId, newScheduledTime);

    logger.info('Reminders rescheduled successfully', { viewingId });
  }

  /**
   * Process a reminder job
   * Sends WhatsApp message to customer
   */
  private async processReminder(job: Job<ReminderJob>): Promise<void> {
    const { viewingId, type, scheduledTime } = job.data;

    logger.info('Processing reminder', {
      jobId: job.id,
      viewingId,
      type,
    });

    try {
      // Get viewing details from database
      const viewing = await prisma.scheduledViewing.findUnique({
        where: { id: viewingId },
        include: {
          property: {
            select: {
              projectName: true,
              propertyType: true,
              city: true,
              district: true,
              address: true,
            },
          },
          agent: {
            select: {
              fullName: true,
              phoneNumber: true,
              whatsappNumber: true,
            },
          },
        },
      });

      if (!viewing) {
        logger.warn('Viewing not found for reminder', { viewingId });
        return;
      }

      // Skip if viewing was cancelled or completed
      if (viewing.status === 'cancelled' || viewing.status === 'completed') {
        logger.info('Skipping reminder for cancelled/completed viewing', {
          viewingId,
          status: viewing.status,
        });
        return;
      }

      // Skip if reminder already sent
      if (viewing.reminderSent && type === '24h') {
        logger.info('24h reminder already sent', { viewingId });
        return;
      }

      // Build reminder message using shared service
      const message = type === '24h' 
        ? messageBuilderService.build24hReminder(viewing, scheduledTime)
        : messageBuilderService.build2hReminder(viewing, scheduledTime);

      // Send WhatsApp message
      await whatsappService.sendTextMessage(viewing.customerPhone, message);

      // Mark reminder as sent (for 24h reminder only, as we track once)
      if (type === '24h') {
        await prisma.scheduledViewing.update({
          where: { id: viewingId },
          data: { reminderSent: true },
        });
      }

      logger.info('Reminder sent successfully', {
        viewingId,
        type,
        customerPhone: viewing.customerPhone,
      });
    } catch (error) {
      logger.error('Failed to process reminder', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: job.id,
        viewingId,
        type,
      });
      throw error; // Throw to trigger Bull retry
    }
  }

  // Task 4.3 Fix #2 & #5: Duplicate message building method removed
  // Now using shared messageBuilderService for all message creation

  /**
   * Set up Bull queue event listeners
   */
  private setupEventListeners(): void {
    this.queue.on('completed', (job: Job<ReminderJob>) => {
      logger.info('Reminder job completed', {
        jobId: job.id,
        viewingId: job.data.viewingId,
        type: job.data.type,
      });
    });

    this.queue.on('failed', (job: Job<ReminderJob>, error: Error) => {
      logger.error('Reminder job failed', {
        jobId: job.id,
        viewingId: job.data.viewingId,
        type: job.data.type,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on('error', (error: Error) => {
      logger.error('Reminder queue error', {
        error: error.message,
      });
    });
  }

  /**
   * Get queue for graceful shutdown
   */
  getQueue(): Queue<ReminderJob> {
    return this.queue;
  }

  /**
   * Close the queue gracefully
   */
  async close(): Promise<void> {
    logger.info('Closing reminder queue');
    await this.queue.close();
  }
}

// Singleton instance
export const reminderService = new ReminderService();
