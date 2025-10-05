/**
 * Property Upload Helper
 * Eliminates duplication between bulkUpload and uploadFile endpoints
 */

import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createServiceLogger } from '../../../utils/logger';
import { propertyParser } from '../../../utils/property-parser';
import { propertyBatchQueue } from '../../../services/queue/property-batch-queue.service';

const logger = createServiceLogger('PropertyUploadHelper');

export interface BatchUploadOptions {
  includeRowOffset?: boolean; // For CSV/Excel, add +2 to show actual row numbers
  includeTotal?: boolean; // Include total count in error response
}

export interface BatchUploadResult {
  success: boolean;
  batchId?: string;
  response: any;
  statusCode: number;
}

/**
 * Validate and queue properties for batch processing
 * Eliminates duplication between JSON and CSV/Excel uploads
 * 
 * @param properties - Array of raw property data
 * @param agentId - Agent ID
 * @param source - Upload source ('json', 'csv', 'excel')
 * @param res - Express response object
 * @param options - Additional options
 * @returns Result object with status and data
 */
export async function validateAndQueueProperties(
  properties: any[],
  agentId: string,
  source: 'json' | 'csv' | 'excel',
  res: Response,
  options: BatchUploadOptions = {}
): Promise<BatchUploadResult> {
  const { includeRowOffset = false, includeTotal = false } = options;

  // Validate all properties
  const validationResults = propertyParser.validateBatch(properties);
  const invalidProperties = validationResults
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => !result.valid);

  // If validation failed, return error
  if (invalidProperties.length > 0) {
    logger.warn('Validation failed for some properties', {
      agentId,
      source,
      invalidCount: invalidProperties.length,
    });

    const errorData: any = {
      invalidProperties: invalidProperties.map(({ result, index }) => ({
        [includeRowOffset ? 'row' : 'index']: includeRowOffset ? index + 2 : index,
        errors: result.errors,
      })),
    };

    if (includeTotal) {
      errorData.total = properties.length;
      errorData.invalid = invalidProperties.length;
    }

    return {
      success: false,
      statusCode: 400,
      response: {
        success: false,
        message: `${invalidProperties.length} properties failed validation`,
        data: errorData,
      },
    };
  }

  // Generate batch ID and queue for processing
  const batchId = uuidv4();

  await propertyBatchQueue.addBatch({
    batchId,
    agentId,
    properties,
    uploadedAt: new Date(),
    source,
  });

  logger.info('Batch queued successfully', {
    batchId,
    agentId,
    source,
    count: properties.length,
  });

  return {
    success: true,
    batchId,
    statusCode: 202,
    response: {
      success: true,
      message: 'Properties queued for processing',
      data: {
        batchId,
        count: properties.length,
        statusUrl: `/api/properties/batch/${batchId}/progress`,
        resultUrl: `/api/properties/batch/${batchId}/result`,
      },
    },
  };
}
