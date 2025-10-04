/**
 * Idle Session Check Service
 * Periodically checks for idle sessions and updates their state
 * As per plan line 309: "IDLE - No activity for X minutes"
 */

import Queue, { Job } from 'bull';
import { redisManager } from '../../config/redis-manager';
import { createServiceLogger } from '../../utils/logger';
import { sessionManager } from './session-manager.service';

const logger = createServiceLogger('IdleCheckService');

// Job data interface
interface IdleCheckJob {
  timestamp: Date;
}

/**
 * Idle Session Check Service
 * Runs periodic job to check for idle sessions
 */
export class IdleCheckService {
  private queue: Queue<IdleCheckJob>;
  private checkIntervalMinutes: number;

  constructor() {
    // Get interval from environment (default: 5 minutes)
    this.checkIntervalMinutes = parseInt(
      process.env.IDLE_CHECK_INTERVAL_MINUTES || '5',
      10
    );

    // Create Bull queue for idle checks with shared config
    this.queue = new Queue<IdleCheckJob>('idle-session-check', {
      redis: redisManager.getBullRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed checks
        removeOnFail: 50, // Keep last 50 failed checks
      },
    });

    logger.info('IdleCheckService initialized', {
      checkIntervalMinutes: this.checkIntervalMinutes,
      queueName: 'idle-session-check',
    });
  }

  /**
   * Start the periodic idle session checker
   * Runs every X minutes (default: 5 minutes)
   */
  async start(): Promise<void> {
    try {
      // Remove any existing repeatable jobs first
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.queue.removeRepeatableByKey(job.key);
      }

      // Add repeatable job to check for idle sessions
      await this.queue.add(
        'check-idle-sessions',
        { timestamp: new Date() },
        {
          repeat: {
            every: this.checkIntervalMinutes * 60 * 1000, // Convert to milliseconds
          },
        }
      );

      // Process the idle check jobs
      this.queue.process('check-idle-sessions', async (job: Job<IdleCheckJob>) => {
        return this.processIdleCheck(job);
      });

      // Set up event listeners
      this.setupEventListeners();

      logger.info('Idle session checker started', {
        checkIntervalMinutes: this.checkIntervalMinutes,
        nextRunIn: `${this.checkIntervalMinutes} minutes`,
      });
    } catch (error) {
      logger.error('Failed to start idle session checker', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process idle check job
   */
  private async processIdleCheck(job: Job<IdleCheckJob>): Promise<void> {
    logger.info('Running idle session check', {
      jobId: job.id,
      timestamp: job.data.timestamp,
    });

    try {
      // Call SessionManager's checkIdleSessions method
      await sessionManager.checkIdleSessions();

      logger.info('Idle session check completed successfully', {
        jobId: job.id,
      });
    } catch (error) {
      logger.error('Error during idle session check', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Let Bull handle retry
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.queue.on('completed', (job) => {
      logger.debug('Idle check job completed', {
        jobId: job.id,
      });
    });

    this.queue.on('failed', (job, error) => {
      logger.error('Idle check job failed', {
        jobId: job.id,
        error: error.message,
      });
    });

    this.queue.on('error', (error) => {
      logger.error('Idle check queue error', {
        error: error.message,
      });
    });

    this.queue.on('ready', () => {
      logger.info('Idle check queue is ready');
    });
  }

  /**
   * Stop the idle session checker (graceful shutdown)
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping idle session checker...');

      // Remove repeatable jobs
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.queue.removeRepeatableByKey(job.key);
        logger.debug('Removed repeatable job', { key: job.key });
      }

      // Close queue
      await this.queue.close();

      logger.info('Idle session checker stopped');
    } catch (error) {
      logger.error('Error stopping idle session checker', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

// Export singleton instance
export const idleCheckService = new IdleCheckService();

