/**
 * Message Queue Service using Bull
 * Implements queue system as per plan (lines 231, 271, 95)
 *
 * Handles async message processing with:
 * - Job persistence (Redis)
 * - Retry on failure
 * - Scalable workers
 * - Job tracking
 */

import Bull, { Job, JobOptions, Queue } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { redisManager } from '../../config/redis-manager';
import { ParsedMessage } from '../whatsapp/types';

const logger = createServiceLogger('MessageQueue');

// Job data interface
export interface MessageQueueJob {
  message: ParsedMessage;
  receivedAt: Date;
  retryCount?: number;
}

// Job result interface
export interface MessageQueueResult {
  processed: boolean;
  responseGenerated?: boolean;
  error?: string;
}

/**
 * Message Queue Service
 * Manages the WhatsApp message processing queue
 */
export class MessageQueueService {
  private queue: Queue<MessageQueueJob>;
  private deadLetterQueue: Queue<MessageQueueJob>;
  private isProcessing = false;

  constructor() {
    // Initialize Bull queue with shared Redis config (FIXED: Issue #2)
    // FIX: Optimized for low latency
    this.queue = new Bull<MessageQueueJob>('whatsapp-messages', {
      redis: redisManager.getBullRedisConfig(),
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs for debugging
      },
      settings: {
        lockDuration: 120000, // 120 seconds lock (increased for AI processing time)
        stalledInterval: 30000, // Check for stalled jobs every 30s
        maxStalledCount: 2, // Retry stalled jobs twice
        guardInterval: 5000, // Check for delayed jobs every 5s
        retryProcessDelay: 5000, // Retry failed processing after 5s
      },
      limiter: {
        max: 10, // Process max 10 jobs (reduced to prevent overload)
        duration: 1000, // per second
      },
    });

    // Initialize Dead Letter Queue for permanently failed messages (FIXED: Issue #3)
    this.deadLetterQueue = new Bull<MessageQueueJob>('whatsapp-messages-dlq', {
      redis: redisManager.getBullRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: 1000, // Keep more DLQ entries
        removeOnFail: false, // Never auto-remove failures from DLQ
      },
    });

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Message Queue Service initialized', {
      queueName: 'whatsapp-messages',
    });
  }

  /**
   * Add a message to the queue for processing
   * As per plan line 231: "Queue message for processing"
   */
  async addMessage(message: ParsedMessage, options?: JobOptions): Promise<Job<MessageQueueJob>> {
    try {
      const job = await this.queue.add(
        'process-message',
        {
          message,
          receivedAt: new Date(),
        },
        {
          ...options,
          jobId: message.messageId, // Use message ID as job ID (prevents duplicates)
        }
      );

      logger.info('Message added to queue', {
        jobId: job.id,
        messageId: message.messageId,
        from: message.from,
        type: message.type,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add message to queue', {
        messageId: message.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Start processing messages from the queue
   * This will be called when server starts
   */
  startProcessing(processor: (job: Job<MessageQueueJob>) => Promise<MessageQueueResult>): void {
    if (this.isProcessing) {
      logger.warn('Queue processing already started');
      return;
    }

    // Process jobs with concurrency
    // FIX: Increased from 5 to 10 for faster processing
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10', 10);

    this.queue.process('process-message', concurrency, async (job) => {
      logger.info('Processing message from queue', {
        jobId: job.id,
        messageId: job.data.message.messageId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });

      try {
        const result = await processor(job);

        logger.info('Message processed successfully', {
          jobId: job.id,
          messageId: job.data.message.messageId,
          result,
        });

        return result;
      } catch (error) {
        logger.error('Error processing message', {
          jobId: job.id,
          messageId: job.data.message.messageId,
          attempt: job.attemptsMade + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error; // Bull will handle retry
      }
    });

    this.isProcessing = true;
    logger.info('Queue processing started', { concurrency });
  }

  /**
   * Stop processing messages (graceful shutdown)
   */
  async stopProcessing(): Promise<void> {
    logger.info('Stopping queue processing...');

    await Promise.all([this.queue.close(), this.deadLetterQueue.close()]);

    this.isProcessing = false;
    logger.info('Queue and DLQ processing stopped');
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<Job<MessageQueueJob> | null> {
    return this.queue.getJob(jobId);
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed from queue', { jobId });
    }
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanOldJobs(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    // Clean completed jobs older than specified time (default 24 hours)
    await this.queue.clean(olderThan, 'completed');
    await this.queue.clean(olderThan, 'failed');
    logger.info('Old jobs cleaned from queue', { olderThanMs: olderThan });
  }

  /**
   * Get Dead Letter Queue statistics (FIXED: Issue #3)
   * Useful for monitoring permanently failed messages
   */
  async getDLQStats(): Promise<{
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  }> {
    const [waiting, active, failed, completed] = await Promise.all([
      this.deadLetterQueue.getWaitingCount(),
      this.deadLetterQueue.getActiveCount(),
      this.deadLetterQueue.getFailedCount(),
      this.deadLetterQueue.getCompletedCount(),
    ]);

    return { waiting, active, failed, completed };
  }

  /**
   * Retry messages from Dead Letter Queue (FIXED: Issue #3)
   * Admin tool to manually retry failed messages
   */
  async retryFromDLQ(jobId: string): Promise<boolean> {
    try {
      const job = await this.deadLetterQueue.getJob(jobId);

      if (!job) {
        logger.warn('Job not found in DLQ', { jobId });
        return false;
      }

      // Add back to main queue for retry
      await this.addMessage(job.data.message);

      // Remove from DLQ
      await job.remove();

      logger.info('Message retried from DLQ', {
        jobId,
        messageId: job.data.message.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to retry from DLQ', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Job completed
    this.queue.on('completed', (job, result) => {
      logger.debug('Job completed', {
        jobId: job.id,
        messageId: job.data.message.messageId,
        result,
      });
    });

    // Job failed (FIXED: Issue #3 - Enhanced error recovery)
    this.queue.on('failed', async (job, error) => {
      const isFinalFailure = job.attemptsMade >= (job.opts.attempts || 3);

      logger.error('Job failed', {
        jobId: job.id,
        messageId: job.data.message.messageId,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        isFinalFailure,
        error: error.message,
        stack: error.stack,
      });

      // Move to Dead Letter Queue after all retries exhausted
      if (isFinalFailure) {
        try {
          await this.deadLetterQueue.add(job.data, {
            priority: 1, // Lower priority for DLQ processing
          });

          logger.error('Message moved to Dead Letter Queue', {
            jobId: job.id,
            messageId: job.data.message.messageId,
            from: job.data.message.from,
            originalError: error.message,
          });

          // TODO: Add alerting/notification system here
          // - Send to monitoring system (Sentry, DataDog)
          // - Notify on-call engineer
          // - Store in database for admin review
        } catch (dlqError) {
          logger.error('Failed to add message to Dead Letter Queue', {
            jobId: job.id,
            messageId: job.data.message.messageId,
            error: dlqError instanceof Error ? dlqError.message : 'Unknown error',
          });
        }
      }
    });

    // Job stalled (took too long) (FIXED: Issue #3 - Better monitoring)
    this.queue.on('stalled', (job) => {
      logger.warn('Job stalled (worker crashed?)', {
        jobId: job.id,
        messageId: job.data.message.messageId,
        attempt: job.attemptsMade,
      });
      // Stalled jobs are automatically retried by Bull
      // TODO: If stall rate is high, trigger circuit breaker
    });

    // Queue error
    this.queue.on('error', (error) => {
      // Only log non-connection errors to reduce noise during startup
      if (
        !error.message.includes('ECONNREFUSED') &&
        !error.message.includes('connect ETIMEDOUT') &&
        !error.message.includes('Connection is closed')
      ) {
        logger.error('Queue error', { error: error.message });
      }
    });

    // Queue ready
    this.queue.on('ready', () => {
      logger.info('Queue is ready');
    });
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueService();
