/**
 * Property Batch Upload Queue Service
 * Task 3.3, Subtask 4: Batch Processing (lines 887-891)
 * 
 * Features:
 * - Queue system for large uploads
 * - Progress tracking
 * - Error reporting per row
 * - Rollback on critical errors
 */

import Queue, { Job, JobOptions } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { redisManager } from '../../config/redis-manager';
import { RawPropertyData } from '../../utils/property-parser';

const logger = createServiceLogger('PropertyBatchQueue');

/**
 * Property batch job data
 */
export interface PropertyBatchJob {
  batchId: string;
  agentId: string;
  properties: RawPropertyData[];
  uploadedAt: Date;
  source: 'csv' | 'excel' | 'json';
}

/**
 * Property batch job result
 */
export interface PropertyBatchResult {
  batchId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  results: PropertyProcessingResult[];
  completedAt: Date;
}

/**
 * Individual property processing result
 */
export interface PropertyProcessingResult {
  index: number;
  success: boolean;
  propertyId?: string;
  projectName?: string;
  error?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

/**
 * Progress update data
 */
export interface ProgressUpdate {
  batchId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  currentProperty?: string;
}

/**
 * Property Batch Queue Service
 * Manages async processing of property bulk uploads
 */
export class PropertyBatchQueueService {
  private queue: Queue<PropertyBatchJob>;
  private isProcessing = false;

  // Store progress in Redis for real-time tracking
  private readonly PROGRESS_PREFIX = 'batch-progress:';
  private readonly PROGRESS_TTL = 3600; // 1 hour

  constructor() {
    // Initialize Bull queue with shared Redis config
    this.queue = new Queue<PropertyBatchJob>('property-batch-uploads', {
      redis: redisManager.getBullRedisConfig(),
      defaultJobOptions: {
        attempts: 1, // Don't retry entire batch (handle row-level failures)
        removeOnComplete: 50, // Keep last 50 completed batches
        removeOnFail: 100, // Keep last 100 failed batches
        timeout: 300000, // 5 minutes timeout for entire batch
      },
    });

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Property Batch Queue Service initialized');
  }

  /**
   * Add a batch upload job to the queue
   * Task 3.3, Subtask 4: Queue system for large uploads
   * 
   * @param batchData - Batch job data
   * @param options - Bull job options
   * @returns Job instance
   */
  async addBatch(
    batchData: PropertyBatchJob,
    options?: JobOptions
  ): Promise<Job<PropertyBatchJob>> {
    try {
      logger.info('Adding batch to queue', {
        batchId: batchData.batchId,
        agentId: batchData.agentId,
        propertyCount: batchData.properties.length,
        source: batchData.source,
      });

      // Initialize progress tracking
      await this.initializeProgress(batchData.batchId, batchData.properties.length);

      // Add job to queue
      const job = await this.queue.add('process-batch', batchData, {
        jobId: batchData.batchId,
        priority: batchData.properties.length > 100 ? 2 : 1, // Lower priority for large batches
        ...options,
      });

      logger.info('Batch added to queue successfully', {
        batchId: batchData.batchId,
        jobId: job.id,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add batch to queue', {
        batchId: batchData.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Start processing batches from the queue
   * 
   * @param processor - Function to process each batch
   */
  startProcessing(
    processor: (job: Job<PropertyBatchJob>) => Promise<PropertyBatchResult>
  ): void {
    if (this.isProcessing) {
      logger.warn('Batch queue processing already started');
      return;
    }

    // Process batches with limited concurrency
    const concurrency = parseInt(process.env.BATCH_QUEUE_CONCURRENCY || '2', 10);

    this.queue.process('process-batch', concurrency, async (job) => {
      logger.info('Processing batch from queue', {
        jobId: job.id,
        batchId: job.data.batchId,
        propertyCount: job.data.properties.length,
      });

      try {
        const result = await processor(job);

        logger.info('Batch processed successfully', {
          jobId: job.id,
          batchId: result.batchId,
          successful: result.successful,
          failed: result.failed,
        });

        // Store final result
        await this.storeFinalResult(result);

        return result;
      } catch (error) {
        logger.error('Error processing batch', {
          jobId: job.id,
          batchId: job.data.batchId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update progress with error
        await this.updateProgress(job.data.batchId, {
          total: job.data.properties.length,
          processed: job.data.properties.length,
          successful: 0,
          failed: job.data.properties.length,
          percentage: 100,
        });

        throw error;
      }
    });

    this.isProcessing = true;
    logger.info('Batch queue processing started', { concurrency });
  }

  /**
   * Stop processing batches (graceful shutdown)
   */
  async stopProcessing(): Promise<void> {
    logger.info('Stopping batch queue processing...');
    await this.queue.close();
    this.isProcessing = false;
    logger.info('Batch queue processing stopped');
  }

  /**
   * Initialize progress tracking for a batch
   * Task 3.3, Subtask 4: Progress tracking
   */
  private async initializeProgress(batchId: string, total: number): Promise<void> {
    const progress: ProgressUpdate = {
      batchId,
      total,
      processed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
    };

    const redis = redisManager.getClient();
    const key = `${this.PROGRESS_PREFIX}${batchId}`;

    await redis.setex(key, this.PROGRESS_TTL, JSON.stringify(progress));

    logger.debug('Progress initialized', { batchId, total });
  }

  /**
   * Update progress for a batch
   * Task 3.3, Subtask 4: Progress tracking
   */
  async updateProgress(batchId: string, update: Partial<ProgressUpdate>): Promise<void> {
    try {
      const redis = redisManager.getClient();
      const key = `${this.PROGRESS_PREFIX}${batchId}`;

      // Get current progress
      const current = await redis.get(key);
      if (!current) {
        logger.warn('Progress not found for batch', { batchId });
        return;
      }

      const progress: ProgressUpdate = JSON.parse(current);

      // Update with new values
      const updated: ProgressUpdate = {
        ...progress,
        ...update,
        percentage: update.total
          ? Math.round((update.processed! / update.total) * 100)
          : progress.percentage,
      };

      // Save updated progress
      await redis.setex(key, this.PROGRESS_TTL, JSON.stringify(updated));

      logger.debug('Progress updated', {
        batchId,
        processed: updated.processed,
        total: updated.total,
        percentage: updated.percentage,
      });
    } catch (error) {
      logger.error('Failed to update progress', {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current progress for a batch
   * Task 3.3, Subtask 4: Progress tracking
   */
  async getProgress(batchId: string): Promise<ProgressUpdate | null> {
    try {
      const redis = redisManager.getClient();
      const key = `${this.PROGRESS_PREFIX}${batchId}`;

      const data = await redis.get(key);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get progress', {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Store final batch result
   * Task 3.3, Subtask 4: Error reporting per row
   */
  private async storeFinalResult(result: PropertyBatchResult): Promise<void> {
    try {
      const redis = redisManager.getClient();
      const key = `batch-result:${result.batchId}`;
      const TTL = 86400; // 24 hours

      await redis.setex(key, TTL, JSON.stringify(result));

      logger.info('Batch result stored', {
        batchId: result.batchId,
        successful: result.successful,
        failed: result.failed,
      });
    } catch (error) {
      logger.error('Failed to store batch result', {
        batchId: result.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get batch result
   * Task 3.3, Subtask 4: Error reporting per row
   */
  async getBatchResult(batchId: string): Promise<PropertyBatchResult | null> {
    try {
      const redis = redisManager.getClient();
      const key = `batch-result:${batchId}`;

      const data = await redis.get(key);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get batch result', {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
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
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Job completed
    this.queue.on('completed', (job, result: PropertyBatchResult) => {
      logger.info('Batch job completed', {
        jobId: job.id,
        batchId: result.batchId,
        successful: result.successful,
        failed: result.failed,
        duration: Date.now() - job.timestamp,
      });
    });

    // Job failed
    this.queue.on('failed', (job, error) => {
      logger.error('Batch job failed', {
        jobId: job.id,
        batchId: job.data.batchId,
        error: error.message,
      });
    });

    // Job progress
    this.queue.on('progress', (job, progress) => {
      logger.debug('Batch job progress', {
        jobId: job.id,
        batchId: job.data.batchId,
        progress,
      });
    });

    // Queue error
    this.queue.on('error', (error) => {
      logger.error('Batch queue error', { error: error.message });
    });

    // Queue ready
    this.queue.on('ready', () => {
      logger.info('Batch queue is ready');
    });
  }
}

// Export singleton instance
export const propertyBatchQueue = new PropertyBatchQueueService();
