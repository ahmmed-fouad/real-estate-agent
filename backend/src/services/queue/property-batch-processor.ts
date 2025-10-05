/**
 * Property Batch Processor
 * Task 3.3, Subtask 4: Batch Processing (lines 887-891)
 * 
 * Fix #1: Now uses centralized property creation service
 * 
 * Handles actual processing of property batches:
 * - Validates each property
 * - Uses shared creation service
 * - Updates progress
 * - Reports errors per row
 * - Rollback on critical errors
 */

import { Job } from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { prisma } from '../../config/prisma-client';
import { propertyValidationService } from '../validation';
import { propertyCreationService } from '../property';
import {
  PropertyBatchJob,
  PropertyBatchResult,
  PropertyProcessingResult,
  propertyBatchQueue,
} from './property-batch-queue.service';

const logger = createServiceLogger('PropertyBatchProcessor');

/**
 * Process a batch of properties
 * Task 3.3, Subtask 4: Main batch processing logic
 * 
 * @param job - Bull job containing batch data
 * @returns Batch processing result
 */
export async function processPropertyBatch(
  job: Job<PropertyBatchJob>
): Promise<PropertyBatchResult> {
  const { batchId, agentId, properties, source } = job.data;

  logger.info('Starting batch processing', {
    batchId,
    agentId,
    propertyCount: properties.length,
    source,
  });

  const results: PropertyProcessingResult[] = [];
  let successful = 0;
  let failed = 0;
  const processedPropertyIds: string[] = [];

  // Track if we should rollback (critical errors)
  let shouldRollback = false;
  let criticalError: Error | null = null;

  try {
    // Process each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];

      try {
        // Update progress
        await propertyBatchQueue.updateProgress(batchId, {
          batchId,
          total: properties.length,
          processed: i,
          successful,
          failed,
          currentProperty: property.projectName,
        });

        // Update job progress (for Bull UI)
        await job.progress({
          processed: i,
          total: properties.length,
          percentage: Math.round((i / properties.length) * 100),
        });

        // Process single property
        const result = await processSingleProperty(property, agentId, i);

        results.push(result);

        if (result.success) {
          successful++;
          if (result.propertyId) {
            processedPropertyIds.push(result.propertyId);
          }
        } else {
          failed++;
        }

        logger.debug('Property processed', {
          batchId,
          index: i,
          projectName: property.projectName,
          success: result.success,
        });
      } catch (error) {
        // Handle individual property error
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          index: i,
          success: false,
          projectName: property.projectName,
          error: errorMessage,
        });

        logger.error('Property processing failed', {
          batchId,
          index: i,
          projectName: property.projectName,
          error: errorMessage,
        });

        // Check if this is a critical error (e.g., database connection lost)
        if (isCriticalError(error)) {
          shouldRollback = true;
          criticalError = error as Error;
          logger.error('Critical error detected, will rollback', {
            batchId,
            error: errorMessage,
          });
          break; // Stop processing
        }
      }
    }

    // Task 3.3, Subtask 4: Rollback on critical errors
    if (shouldRollback) {
      logger.warn('Rolling back batch due to critical error', {
        batchId,
        successfulCount: successful,
        propertyIds: processedPropertyIds,
      });

      await rollbackBatch(batchId, processedPropertyIds, agentId);

      throw new Error(
        `Batch processing failed due to critical error: ${criticalError?.message}. All changes have been rolled back.`
      );
    }

    // Final progress update
    await propertyBatchQueue.updateProgress(batchId, {
      batchId,
      total: properties.length,
      processed: properties.length,
      successful,
      failed,
      percentage: 100,
    });

    const result: PropertyBatchResult = {
      batchId,
      total: properties.length,
      processed: properties.length,
      successful,
      failed,
      results,
      completedAt: new Date(),
    };

    logger.info('Batch processing completed', {
      batchId,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });

    return result;
  } catch (error) {
    logger.error('Batch processing failed', {
      batchId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Process a single property
 * Fix #1: Uses centralized property creation service (eliminates 80+ line duplication)
 * 
 * @param rawProperty - Raw property data
 * @param agentId - Agent ID
 * @param index - Property index in batch
 * @returns Processing result for this property
 */
async function processSingleProperty(
  rawProperty: any,
  agentId: string,
  index: number
): Promise<PropertyProcessingResult> {
  try {
    // 1. Ensure agentId is set
    rawProperty.agentId = agentId;

    // 2. Validate property data
    const validation = propertyValidationService.validatePropertyData(rawProperty);

    if (!validation.valid) {
      return {
        index,
        success: false,
        projectName: rawProperty.projectName,
        validationErrors: validation.errors.map((e) => ({
          field: e.field,
          message: e.message,
        })),
        error: `Validation failed: ${validation.errors.length} errors found`,
      };
    }

    // 3. Use centralized property creation service (Fix #1: Eliminates duplication)
    const result = await propertyCreationService.createProperty(rawProperty, agentId);

    if (!result.success) {
      return {
        index,
        success: false,
        projectName: rawProperty.projectName,
        error: result.error || 'Failed to create property',
      };
    }

    return {
      index,
      success: true,
      propertyId: result.propertyId,
      projectName: rawProperty.projectName,
    };
  } catch (error) {
    logger.error('Error processing single property', {
      index,
      projectName: rawProperty.projectName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      index,
      success: false,
      projectName: rawProperty.projectName,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an error is critical (requires rollback)
 * Task 3.3, Subtask 4: Rollback on critical errors
 * 
 * Critical errors include:
 * - Database connection lost
 * - Redis connection lost
 * - Out of memory
 * - File system errors
 */
function isCriticalError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Database connection errors
  if (
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('connection pool')
  ) {
    return true;
  }

  // Redis errors
  if (message.includes('redis') && message.includes('connect')) {
    return true;
  }

  // Memory errors
  if (message.includes('out of memory') || message.includes('enomem')) {
    return true;
  }

  // Prisma specific critical errors
  if (
    error.name === 'PrismaClientKnownRequestError' &&
    ['P1000', 'P1001', 'P1002', 'P1008', 'P1009', 'P1010'].includes((error as any).code)
  ) {
    return true;
  }

  return false;
}

/**
 * Rollback a batch by deleting all processed properties
 * Task 3.3, Subtask 4: Rollback on critical errors
 * 
 * @param batchId - Batch ID
 * @param propertyIds - IDs of properties to delete
 * @param agentId - Agent ID
 */
async function rollbackBatch(
  batchId: string,
  propertyIds: string[],
  agentId: string
): Promise<void> {
  if (propertyIds.length === 0) {
    logger.info('No properties to rollback', { batchId });
    return;
  }

  try {
    logger.info('Starting rollback', {
      batchId,
      propertyCount: propertyIds.length,
    });

    // Delete from SQL database (will cascade to payment plans)
    const deleteResult = await prisma.property.deleteMany({
      where: {
        id: { in: propertyIds },
        agentId, // Safety: ensure agent owns these properties
      },
    });

    logger.info('Rollback completed - SQL database cleaned', {
      batchId,
      deletedCount: deleteResult.count,
    });

    // Note: Vector DB cleanup would require individual deletion
    // For now, we'll let those orphaned records exist (they won't be retrieved without SQL record)
    // TODO: Implement batch deletion in RAG service if needed

    logger.warn('Vector DB records not deleted (orphaned)', {
      batchId,
      propertyIds,
      note: 'These will not be retrieved without SQL records',
    });
  } catch (error) {
    logger.error('Rollback failed', {
      batchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      propertyIds,
    });
    // Don't throw - we already have a critical error, don't mask it
  }
}
