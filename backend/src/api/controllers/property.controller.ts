/**
 * Property Management Controller
 * Handles property CRUD operations and bulk upload
 * As per plan Task 3.1, Subtask 3: Property Management APIs (lines 713-728)
 * 
 * Endpoints:
 * - POST /api/properties (line 715)
 * - GET /api/properties (line 716)
 * - GET /api/properties/:id (line 717)
 * - PUT /api/properties/:id (line 718)
 * - DELETE /api/properties/:id (line 719)
 * - POST /api/properties/bulk-upload (line 720)
 * 
 * Features (lines 724-728):
 * - Support JSON, CSV, Excel
 * - Validate data structure
 * - Process images and documents
 * - Generate embeddings automatically
 * - Store in both SQL and vector DB
 */

import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { prisma } from '../../config/prisma-client';
import { ragService } from '../../services/ai';
import { propertyParser } from '../../utils/property-parser';
import { ErrorResponse, paginate } from '../../utils';
import { propertyTemplateService } from '../../services/template';
import { propertyBatchQueue } from '../../services/queue/property-batch-queue.service';
import { propertyCreationService } from '../../services/property';
import { validateAndQueueProperties } from './helpers/property-upload.helper';
import { fileUploadService } from '../../services/storage';
import {
  CreatePropertyData,
  UpdatePropertyData,
  UpdatePropertyParams,
  GetPropertyParams,
  DeletePropertyParams,
  ListPropertiesQuery,
} from '../validators/property.validators';

const logger = createServiceLogger('PropertyController');

/**
 * Create new property
 * POST /api/properties
 * As per plan line 715
 */
export const createProperty = async (
  req: AuthenticatedRequest<{}, {}, CreatePropertyData>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const propertyData = req.body;

    logger.info('Property creation attempt', {
      agentId,
      projectName: propertyData.projectName,
    });

    // Use centralized property creation service (Fix #1: Eliminates duplication)
    const result = await propertyCreationService.createProperty(
      propertyData as any,
      agentId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create property');
    }

    // Fetch created property with relations
    const property = await prisma.property.findUnique({
      where: { id: result.propertyId },
      include: { paymentPlans: true },
    });

    logger.info('Property created successfully', {
      propertyId: property?.id,
      agentId,
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to create property', 500, { agentId: req.user.id });
  }
};

/**
 * List properties with pagination and filters
 * GET /api/properties
 * As per plan line 716
 */
export const listProperties = async (
  req: AuthenticatedRequest<{}, {}, {}, ListPropertiesQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const {
      page,
      limit,
      status,
      propertyType,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      sortBy,
      sortOrder,
    } = req.query;

    logger.info('Property list request', { agentId, page, limit });

    // Build filters
    const where: Prisma.PropertyWhereInput = {
      agentId,
      ...(status && status !== 'all' && { status }),
      ...(propertyType && { propertyType }),
      ...(city && { city }),
      ...(bedrooms && { bedrooms }),
      ...(minPrice && {
        basePrice: {
          gte: new Prisma.Decimal(minPrice),
        },
      }),
      ...(maxPrice && {
        basePrice: {
          lte: new Prisma.Decimal(maxPrice),
        },
      }),
    };

    // Use pagination helper
    const result = await paginate(
      prisma.property,
      where,
      { page, limit, sortBy, sortOrder },
      {
        paymentPlans: true,
      }
    );

    logger.info('Properties retrieved', {
      agentId,
      count: result.items.length,
      total: result.pagination.total,
    });

    res.status(200).json({
      success: true,
      data: {
        properties: result.items,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve properties', 500, { agentId: req.user.id });
  }
};

/**
 * Get property by ID
 * GET /api/properties/:id
 * As per plan line 717
 */
export const getProperty = async (
  req: AuthenticatedRequest<GetPropertyParams>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Property retrieval', { agentId, propertyId: id });

    const property = await prisma.property.findFirst({
      where: {
        id,
        agentId, // Ensure agent can only access their own properties
      },
      include: {
        paymentPlans: true,
        scheduledViewings: {
          take: 10,
          orderBy: { scheduledTime: 'desc' },
        },
      },
    });

    if (!property) {
      logger.warn('Property not found', { agentId, propertyId: id });
      return ErrorResponse.notFound(res, 'The property does not exist or you do not have access to it');
    }

    logger.info('Property retrieved', { agentId, propertyId: id });

    res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve property', 500, {
      agentId: req.user.id,
      propertyId: req.params.id,
    });
  }
};

/**
 * Update property
 * PUT /api/properties/:id
 * As per plan line 718
 */
export const updateProperty = async (
  req: AuthenticatedRequest<UpdatePropertyParams, {}, UpdatePropertyData>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Property update attempt', {
      agentId,
      propertyId: id,
      fields: Object.keys(updateData),
    });

    // Check if property exists and belongs to agent
    const existingProperty = await prisma.property.findFirst({
      where: { id, agentId },
      include: { paymentPlans: true },
    });

    if (!existingProperty) {
      return ErrorResponse.notFound(res, 'Property not found');
    }

    // Update property in database
    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(updateData.projectName && { projectName: updateData.projectName }),
        ...(updateData.developerName !== undefined && { developerName: updateData.developerName }),
        ...(updateData.propertyType && { propertyType: updateData.propertyType }),
        ...(updateData.city && { city: updateData.city }),
        ...(updateData.district && { district: updateData.district }),
        ...(updateData.address !== undefined && { address: updateData.address }),
        ...(updateData.latitude !== undefined && { latitude: updateData.latitude ? new Prisma.Decimal(updateData.latitude) : null }),
        ...(updateData.longitude !== undefined && { longitude: updateData.longitude ? new Prisma.Decimal(updateData.longitude) : null }),
        ...(updateData.area && { area: new Prisma.Decimal(updateData.area) }),
        ...(updateData.bedrooms !== undefined && { bedrooms: updateData.bedrooms }),
        ...(updateData.bathrooms !== undefined && { bathrooms: updateData.bathrooms }),
        ...(updateData.floors !== undefined && { floors: updateData.floors }),
        ...(updateData.basePrice && { basePrice: new Prisma.Decimal(updateData.basePrice) }),
        ...(updateData.pricePerMeter && { pricePerMeter: new Prisma.Decimal(updateData.pricePerMeter) }),
        ...(updateData.currency && { currency: updateData.currency }),
        ...(updateData.amenities && { amenities: updateData.amenities }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.deliveryDate && { deliveryDate: new Date(updateData.deliveryDate) }),
        ...(updateData.images && { images: updateData.images }),
        ...(updateData.documents && { documents: updateData.documents }),
        ...(updateData.videoUrl !== undefined && { videoUrl: updateData.videoUrl }),
        ...(updateData.status && { status: updateData.status }),
      },
      include: {
        paymentPlans: true,
      },
    });

    // Update in vector DB if significant fields changed
    if (
      updateData.description ||
      updateData.projectName ||
      updateData.amenities ||
      updateData.propertyType
    ) {
      try {
        // Re-parse and re-ingest for updated embedding
        const parsedProperty = propertyParser.parsePropertyData({
          id: property.id,
          agentId,
          projectName: property.projectName,
          developerName: property.developerName || '',
          propertyType: property.propertyType,
          city: property.city,
          district: property.district,
          address: property.address || '',
          latitude: property.latitude ? parseFloat(property.latitude.toString()) : undefined,
          longitude: property.longitude ? parseFloat(property.longitude.toString()) : undefined,
          area: parseFloat(property.area.toString()),
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          floors: property.floors || undefined,
          basePrice: parseFloat(property.basePrice.toString()),
          pricePerMeter: parseFloat(property.pricePerMeter.toString()),
          currency: property.currency,
          amenities: property.amenities,
          paymentPlans: property.paymentPlans.map((plan) => ({
            id: plan.id,
            planName: plan.planName,
            downPaymentPercentage: parseFloat(plan.downPaymentPercentage.toString()),
            installmentYears: plan.installmentYears,
            monthlyPayment: parseFloat(plan.monthlyPayment.toString()),
            description: plan.description || undefined,
          })),
          deliveryDate: property.deliveryDate || undefined,
          description: property.description || '',
          images: property.images,
          documents: property.documents,
          videoUrl: property.videoUrl || undefined,
        }, false);

        await ragService.ingestProperty(parsedProperty);
        logger.info('Property embedding updated', { propertyId: id });
      } catch (embeddingError) {
        logger.error('Failed to update embedding', {
          error: embeddingError instanceof Error ? embeddingError.message : 'Unknown error',
          propertyId: id,
        });
        // Continue even if embedding update fails
      }
    }

    logger.info('Property updated successfully', {
      agentId,
      propertyId: id,
    });

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: { property },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to update property', 500, {
      agentId: req.user.id,
      propertyId: req.params.id,
    });
  }
};

/**
 * Delete property
 * DELETE /api/properties/:id
 * As per plan line 719
 */
export const deleteProperty = async (
  req: AuthenticatedRequest<DeletePropertyParams>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Property deletion attempt', { agentId, propertyId: id });

    // Check if property exists and belongs to agent
    const property = await prisma.property.findFirst({
      where: { id, agentId },
    });

    if (!property) {
      return ErrorResponse.notFound(res, 'Property not found');
    }

    // Delete from database (will cascade to payment_plans)
    await prisma.property.delete({
      where: { id },
    });

    // Delete from vector DB
    try {
      await ragService.deleteProperty(id);
      logger.info('Property deleted from vector DB', { propertyId: id });
    } catch (vectorError) {
      logger.error('Failed to delete from vector DB', {
        error: vectorError instanceof Error ? vectorError.message : 'Unknown error',
        propertyId: id,
      });
      // Continue even if vector DB deletion fails
    }

    logger.info('Property deleted successfully', { agentId, propertyId: id });

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to delete property', 500, {
      agentId: req.user.id,
      propertyId: req.params.id,
    });
  }
};

/**
 * Bulk upload properties
 * POST /api/properties/bulk-upload
 * As per plan line 720
 * 
 * Fix #2: Now uses batch queue system (lines 887-891)
 * Fix #6: Validates all properties before queueing
 * Supports JSON array format
 */
export const bulkUpload = async (
  req: AuthenticatedRequest<{}, {}, { properties: CreatePropertyData[] }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { properties } = req.body;

    if (!Array.isArray(properties) || properties.length === 0) {
      return ErrorResponse.badRequest(res, 'Properties must be a non-empty array');
    }

    logger.info('Bulk upload attempt', {
      agentId,
      count: properties.length,
    });

    // Use helper to eliminate duplication with uploadFile
    const result = await validateAndQueueProperties(
      properties.map((p: any) => ({ ...p, agentId })),
      agentId,
      'json',
      res,
      { includeRowOffset: false, includeTotal: false }
    );

    res.status(result.statusCode).json(result.response);
  } catch (error) {
    return ErrorResponse.send(res, error, 'Bulk upload failed', 500, { agentId: req.user.id });
  }
};

/**
 * Download property upload template
 * GET /api/properties/template
 * Task 3.3, Subtask 3: Template Generation (lines 882-886)
 * 
 * Returns Excel template with:
 * - Empty template sheet with headers
 * - Example data sheet
 * - Instructions sheet
 */
export const downloadTemplate = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    logger.info('Template download requested');

    // Generate template
    const templateBuffer = propertyTemplateService.generateTemplate();
    const filename = propertyTemplateService.getTemplateFilename();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', templateBuffer.length);

    logger.info('Template downloaded successfully', { filename });

    // Send buffer
    res.send(templateBuffer);
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to generate template', 500);
  }
};

/**
 * Upload CSV/Excel file for bulk import
 * POST /api/properties/upload-file
 * Fix #3: CSV/Excel file upload support (lines 851-854)
 * 
 * Handles multipart/form-data file uploads
 */
export const uploadFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const file = (req as any).file;

    if (!file) {
      return ErrorResponse.badRequest(res, 'No file uploaded');
    }

    logger.info('File upload attempt', {
      agentId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    // Determine file type
    const ext = file.originalname.toLowerCase().split('.').pop();
    let properties: any[];

    if (ext === 'csv') {
      // Parse CSV
      const csvData = file.buffer.toString('utf-8');
      properties = propertyParser.parseCSV(csvData, agentId);
    } else if (ext === 'xlsx' || ext === 'xls') {
      // Parse Excel
      properties = propertyParser.parseExcel(file.buffer, agentId);
    } else {
      return ErrorResponse.badRequest(res, 'Unsupported file format. Please upload CSV or Excel file');
    }

    if (properties.length === 0) {
      return ErrorResponse.badRequest(res, 'No valid properties found in file');
    }

    logger.info('File parsed successfully', {
      agentId,
      propertyCount: properties.length,
    });

    // Use helper to eliminate duplication with bulkUpload
    const result = await validateAndQueueProperties(
      properties,
      agentId,
      ext === 'csv' ? 'csv' : 'excel',
      res,
      { includeRowOffset: true, includeTotal: true } // CSV/Excel shows row numbers
    );

    // Add filename to response if successful
    if (result.success && result.response.data) {
      result.response.data.filename = file.originalname;
      result.response.message = 'File processed and properties queued for import';
    }

    res.status(result.statusCode).json(result.response);
  } catch (error) {
    return ErrorResponse.send(res, error, 'File upload failed', 500, { agentId: req.user.id });
  }
};

/**
 * Get batch upload progress
 * GET /api/properties/batch/:batchId/progress
 * Fix #4: Progress tracking endpoint (line 889)
 */
export const getBatchProgress = async (
  req: AuthenticatedRequest<{ batchId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const agentId = req.user.id;

    const progress = await propertyBatchQueue.getProgress(batchId);

    if (!progress) {
      return ErrorResponse.notFound(res, 'Batch not found or expired');
    }

    logger.debug('Batch progress retrieved', {
      batchId,
      agentId,
      percentage: progress.percentage,
    });

    res.status(200).json({
      success: true,
      data: { progress },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to get batch progress', 500, {
      batchId: req.params.batchId,
    });
  }
};

/**
 * Get batch upload result
 * GET /api/properties/batch/:batchId/result
 * Fix #4: Result endpoint (line 890)
 */
export const getBatchResult = async (
  req: AuthenticatedRequest<{ batchId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const agentId = req.user.id;

    const result = await propertyBatchQueue.getBatchResult(batchId);

    if (!result) {
      return ErrorResponse.notFound(res, 'Batch result not found or expired');
    }

    logger.info('Batch result retrieved', {
      batchId,
      agentId,
      successful: result.successful,
      failed: result.failed,
    });

    res.status(200).json({
      success: true,
      data: { result },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to get batch result', 500, {
      batchId: req.params.batchId,
    });
  }
};

/**
 * Get batch queue statistics
 * GET /api/properties/batch/stats
 * Fix #4: Queue stats endpoint
 */
export const getBatchStats = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await propertyBatchQueue.getStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to get batch stats', 500);
  }
};

/**
 * Upload property images
 * POST /api/properties/upload-images
 * Critical Fix: Missing endpoint for image uploads
 * 
 * Accepts multipart/form-data with 'images' field
 * Returns array of public URLs
 */
export const uploadImages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const files = (req as any).files;

    if (!files || files.length === 0) {
      return ErrorResponse.badRequest(res, 'No images uploaded');
    }

    logger.info('Image upload request', {
      agentId,
      count: files.length,
      totalSize: files.reduce((sum: number, f: any) => sum + f.size, 0),
    });

    // Upload to Supabase Storage
    const uploadResults = await fileUploadService.uploadImages(files, agentId);

    const urls = uploadResults.map(result => result.url);

    logger.info('Images uploaded successfully', {
      agentId,
      count: urls.length,
    });

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { urls },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Image upload failed', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Upload property documents
 * POST /api/properties/upload-documents
 * Critical Fix: Missing endpoint for document uploads
 * 
 * Accepts multipart/form-data with 'documents' field
 * Returns array of public URLs
 */
export const uploadDocuments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const files = (req as any).files;

    if (!files || files.length === 0) {
      return ErrorResponse.badRequest(res, 'No documents uploaded');
    }

    logger.info('Document upload request', {
      agentId,
      count: files.length,
      totalSize: files.reduce((sum: number, f: any) => sum + f.size, 0),
    });

    // Upload to Supabase Storage
    const uploadResults = await fileUploadService.uploadDocuments(files, agentId);

    const urls = uploadResults.map(result => result.url);

    logger.info('Documents uploaded successfully', {
      agentId,
      count: urls.length,
    });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { urls },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Document upload failed', 500, {
      agentId: req.user.id,
    });
  }
};


