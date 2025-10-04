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

import Queue, { Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { createServiceLogger } from '../../utils/logger';
import { ParsedMessage } from '../whatsapp/types';

const logger = createServiceLogger('MessageQueue');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false,
};

// Create Redis clients for Bull
const createRedisClient = () => {
  const client = new Redis(redisConfig);
  
  client.on('error', (error) => {
    logger.error('Redis connection error', { error: error.message });
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  return client;
};

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
  private isProcessing = false;

  constructor() {
    // Initialize Bull queue with Redis
    this.queue = new Queue<MessageQueueJob>('whatsapp-messages', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs for debugging
      },
    });

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Message Queue Service initialized', {
      queueName: 'whatsapp-messages',
      redis: `${redisConfig.host}:${redisConfig.port}`,
    });
  }

  /**
   * Add a message to the queue for processing
   * As per plan line 231: "Queue message for processing"
   */
  async addMessage(
    message: ParsedMessage,
    options?: JobOptions
  ): Promise<Job<MessageQueueJob>> {
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
  startProcessing(
    processor: (job: Job<MessageQueueJob>) => Promise<MessageQueueResult>
  ): void {
    if (this.isProcessing) {
      logger.warn('Queue processing already started');
      return;
    }

    // Process jobs with concurrency
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '5', 10);

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
    await this.queue.close();
    this.isProcessing = false;
    logger.info('Queue processing stopped');
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

    // Job failed
    this.queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        messageId: job.data.message.messageId,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message,
      });
    });

    // Job stalled (took too long)
    this.queue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        messageId: job.data.message.messageId,
      });
    });

    // Queue error
    this.queue.on('error', (error) => {
      logger.error('Queue error', { error: error.message });
    });

    // Queue ready
    this.queue.on('ready', () => {
      logger.info('Queue is ready');
    });
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueService();

