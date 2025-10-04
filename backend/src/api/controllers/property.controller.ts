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

    // Parse property data to PropertyDocument format
    const parsedProperty = propertyParser.parsePropertyData({
      agentId,
      ...propertyData,
    });

    // Ingest property (stores in vector DB and generates embedding)
    // As per plan line 727: "Generate embeddings automatically"
    const result = await ragService.ingestProperty(parsedProperty);

    if (!result.success) {
      throw new Error('Failed to generate property embedding');
    }

    // Store in SQL database
    // As per plan line 728: "Store in both SQL and vector DB"
    const property = await prisma.property.create({
      data: {
        id: parsedProperty.id,
        agentId,
        projectName: propertyData.projectName,
        developerName: propertyData.developerName || null,
        propertyType: propertyData.propertyType,
        city: propertyData.city,
        district: propertyData.district,
        address: propertyData.address || null,
        latitude: propertyData.latitude ? new Prisma.Decimal(propertyData.latitude) : null,
        longitude: propertyData.longitude ? new Prisma.Decimal(propertyData.longitude) : null,
        area: new Prisma.Decimal(propertyData.area),
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        floors: propertyData.floors || null,
        basePrice: new Prisma.Decimal(propertyData.basePrice),
        pricePerMeter: new Prisma.Decimal(propertyData.pricePerMeter),
        currency: propertyData.currency || 'EGP',
        amenities: propertyData.amenities,
        description: propertyData.description || null,
        deliveryDate: propertyData.deliveryDate ? new Date(propertyData.deliveryDate) : null,
        images: propertyData.images,
        documents: propertyData.documents,
        videoUrl: propertyData.videoUrl || null,
        status: propertyData.status || 'available',
        embeddingText: result.embeddingText,
        paymentPlans: propertyData.paymentPlans
          ? {
              create: propertyData.paymentPlans.map((plan) => ({
                planName: plan.planName,
                downPaymentPercentage: new Prisma.Decimal(plan.downPaymentPercentage),
                installmentYears: plan.installmentYears,
                monthlyPayment: new Prisma.Decimal(plan.monthlyPayment),
                description: plan.description || null,
              })),
            }
          : undefined,
      },
      include: {
        paymentPlans: true,
      },
    });

    logger.info('Property created successfully', {
      propertyId: property.id,
      agentId,
      projectName: property.projectName,
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
      {
        where,
        include: {
          paymentPlans: true,
        },
        orderBy: { [sortBy]: sortOrder },
      },
      { page, limit }
    );

    logger.info('Properties retrieved', {
      agentId,
      count: result.data.length,
      total: result.meta.total,
    });

    res.status(200).json({
      success: true,
      data: {
        properties: result.data,
        pagination: result.meta,
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
          location: {
            city: property.city,
            district: property.district,
            address: property.address || '',
            coordinates: [
              property.latitude ? parseFloat(property.latitude.toString()) : 0,
              property.longitude ? parseFloat(property.longitude.toString()) : 0,
            ],
          },
          pricing: {
            basePrice: parseFloat(property.basePrice.toString()),
            pricePerMeter: parseFloat(property.pricePerMeter.toString()),
            currency: property.currency,
          },
          specifications: {
            area: parseFloat(property.area.toString()),
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            floors: property.floors || undefined,
          },
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
 * Supports JSON array format
 * TODO: Add CSV/Excel support in Phase 3, Task 3.3
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

    const results = {
      success: [] as string[],
      failed: [] as { index: number; error: string }[],
    };

    // Process each property
    for (let i = 0; i < properties.length; i++) {
      try {
        const propertyData = properties[i];

        // Parse and ingest
        const parsedProperty = propertyParser.parsePropertyData({
          agentId,
          ...propertyData,
        });

        const ragResult = await ragService.ingestProperty(parsedProperty);

        if (!ragResult.success) {
          throw new Error('Failed to generate embedding');
        }

        // Store in database
        await prisma.property.create({
          data: {
            id: parsedProperty.id,
            agentId,
            projectName: propertyData.projectName,
            developerName: propertyData.developerName || null,
            propertyType: propertyData.propertyType,
            city: propertyData.city,
            district: propertyData.district,
            address: propertyData.address || null,
            latitude: propertyData.latitude ? new Prisma.Decimal(propertyData.latitude) : null,
            longitude: propertyData.longitude ? new Prisma.Decimal(propertyData.longitude) : null,
            area: new Prisma.Decimal(propertyData.area),
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            floors: propertyData.floors || null,
            basePrice: new Prisma.Decimal(propertyData.basePrice),
            pricePerMeter: new Prisma.Decimal(propertyData.pricePerMeter),
            currency: propertyData.currency || 'EGP',
            amenities: propertyData.amenities,
            description: propertyData.description || null,
            deliveryDate: propertyData.deliveryDate ? new Date(propertyData.deliveryDate) : null,
            images: propertyData.images,
            documents: propertyData.documents,
            videoUrl: propertyData.videoUrl || null,
            status: propertyData.status || 'available',
            embeddingText: ragResult.embeddingText,
            paymentPlans: propertyData.paymentPlans
              ? {
                  create: propertyData.paymentPlans.map((plan) => ({
                    planName: plan.planName,
                    downPaymentPercentage: new Prisma.Decimal(plan.downPaymentPercentage),
                    installmentYears: plan.installmentYears,
                    monthlyPayment: new Prisma.Decimal(plan.monthlyPayment),
                    description: plan.description || null,
                  })),
                }
              : undefined,
          },
        });

        results.success.push(parsedProperty.id);
      } catch (error) {
        results.failed.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Bulk upload completed', {
      agentId,
      success: results.success.length,
      failed: results.failed.length,
    });

    res.status(results.failed.length === 0 ? 201 : 207).json({
      success: results.failed.length === 0,
      message: `Uploaded ${results.success.length} properties, ${results.failed.length} failed`,
      data: { results },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Bulk upload failed', 500, { agentId: req.user.id });
  }
};


