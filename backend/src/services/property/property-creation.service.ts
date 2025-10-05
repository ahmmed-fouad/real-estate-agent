/**
 * Property Creation Service
 * Task 3.3 Fix: Eliminates duplicated property creation logic
 * 
 * Centralizes property creation to avoid duplication across:
 * - createProperty endpoint
 * - bulkUpload endpoint
 * - batch processor
 */

import { Prisma } from '@prisma/client';
import { createServiceLogger } from '../../utils/logger';
import { prisma } from '../../config/prisma-client';
import { ragService } from '../ai';
import { propertyParser, RawPropertyData } from '../../utils/property-parser';

const logger = createServiceLogger('PropertyCreation');

/**
 * Property creation result
 */
export interface PropertyCreationResult {
  success: boolean;
  propertyId?: string;
  error?: string;
}

/**
 * Property Creation Service
 * Centralizes all property creation logic
 */
export class PropertyCreationService {
  /**
   * Create a single property
   * Handles parsing, validation, embedding generation, and database storage
   * 
   * @param rawData - Raw property data
   * @param agentId - Agent ID
   * @returns Creation result
   */
  async createProperty(
    rawData: RawPropertyData,
    agentId: string
  ): Promise<PropertyCreationResult> {
    try {
      // Ensure agentId is set
      rawData.agentId = agentId;

      // Parse property data
      const parsedProperty = propertyParser.parsePropertyData(rawData);

      // Generate embeddings and store in vector DB
      const ragResult = await ragService.ingestProperty(parsedProperty);

      if (!ragResult.success) {
        return {
          success: false,
          error: 'Failed to generate property embedding',
        };
      }

      // Store in SQL database
      const property = await prisma.property.create({
        data: {
          id: parsedProperty.id,
          agentId,
          projectName: rawData.projectName,
          developerName: rawData.developerName || null,
          propertyType: rawData.propertyType,
          city: rawData.city,
          district: rawData.district,
          address: rawData.address || null,
          latitude: rawData.latitude ? new Prisma.Decimal(rawData.latitude) : null,
          longitude: rawData.longitude ? new Prisma.Decimal(rawData.longitude) : null,
          area: new Prisma.Decimal(rawData.area),
          bedrooms: rawData.bedrooms,
          bathrooms: rawData.bathrooms,
          floors: rawData.floors || null,
          basePrice: new Prisma.Decimal(rawData.basePrice),
          pricePerMeter: new Prisma.Decimal(rawData.pricePerMeter),
          currency: rawData.currency || 'EGP',
          amenities: rawData.amenities || [],
          description: rawData.description || null,
          deliveryDate: rawData.deliveryDate ? new Date(rawData.deliveryDate) : null,
          images: rawData.images || [],
          documents: rawData.documents || [],
          videoUrl: rawData.videoUrl || null,
          status: rawData.status || 'available',
          embeddingText: ragResult.embeddingText,
          paymentPlans: rawData.paymentPlans
            ? {
                create: rawData.paymentPlans.map((plan: any) => ({
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

      return {
        success: true,
        propertyId: property.id,
      };
    } catch (error) {
      logger.error('Error creating property', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectName: rawData.projectName,
        agentId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create multiple properties
   * 
   * @param properties - Array of raw property data
   * @param agentId - Agent ID
   * @returns Array of creation results
   */
  async createMultipleProperties(
    properties: RawPropertyData[],
    agentId: string
  ): Promise<PropertyCreationResult[]> {
    logger.info('Creating multiple properties', {
      agentId,
      count: properties.length,
    });

    const results = await Promise.all(
      properties.map((property) => this.createProperty(property, agentId))
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    logger.info('Multiple properties created', {
      agentId,
      total: properties.length,
      successful,
      failed,
    });

    return results;
  }
}

// Export singleton instance
export const propertyCreationService = new PropertyCreationService();
