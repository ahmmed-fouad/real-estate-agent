/**
 * Entity Extraction Service
 * Manages entity extraction, accumulation, and merging
 * Implements entity storage from plan (lines 596-599)
 */

import { createServiceLogger } from '../../utils/logger';
import { PriceFormatter } from '../../utils/price-formatter';
import { ExtractedEntities } from './intent-types';
// FIXED: ExtractedInfo is now just an alias for ExtractedEntities (no duplication)
import { ExtractedInfo } from '../session/types';

const logger = createServiceLogger('EntityExtractor');

/**
 * Entity Extraction Service
 * Handles entity accumulation and merging across conversation
 */
export class EntityExtractorService {
  /**
   * Merge new entities with existing extracted info
   * Accumulates entities across conversation (plan line 598)
   * New values override old values, but we keep old values if no new value provided
   * 
   * FIXED: Now both parameters use ExtractedEntities (ExtractedInfo is an alias)
   * This eliminates type conversion and simplifies the code
   * 
   * @param existing - Existing extracted information from session
   * @param newEntities - Newly extracted entities from current message
   * @returns Merged extracted information
   */
  mergeEntities(
    existing: ExtractedEntities,
    newEntities: ExtractedEntities
  ): ExtractedEntities {
    logger.debug('Merging entities', {
      existingKeys: Object.keys(existing).length,
      newKeys: Object.keys(newEntities).length,
    });

    // Create merged result, starting with existing data
    const merged: ExtractedEntities = { ...existing };

    // Merge budget information
    if (newEntities.budget !== undefined && newEntities.budget !== null) {
      merged.budget = newEntities.budget;
    }
    // If min/max price provided instead of budget, use the average or max
    if (newEntities.minPrice !== undefined || newEntities.maxPrice !== undefined) {
      const min = newEntities.minPrice || 0;
      const max = newEntities.maxPrice || newEntities.minPrice || 0;
      merged.budget = max || (min + max) / 2;
    }

    // Merge location information
    if (newEntities.location) {
      merged.location = newEntities.location;
    } else if (newEntities.city || newEntities.district) {
      // Build location from city and district
      merged.location = [newEntities.city, newEntities.district]
        .filter(Boolean)
        .join(', ');
    }

    // Merge property type
    if (newEntities.propertyType) {
      merged.propertyType = newEntities.propertyType;
    }

    // Merge specifications
    if (newEntities.bedrooms !== undefined && newEntities.bedrooms !== null) {
      merged.bedrooms = newEntities.bedrooms;
    }
    if (newEntities.bathrooms !== undefined && newEntities.bathrooms !== null) {
      merged.bathrooms = newEntities.bathrooms;
    }
    if (newEntities.minArea !== undefined || newEntities.maxArea !== undefined) {
      // Use average if both provided, otherwise use whichever is available
      const min = newEntities.minArea || 0;
      const max = newEntities.maxArea || newEntities.minArea || 0;
      merged.area = max || (min + max) / 2;
    }

    // Merge urgency
    if (newEntities.urgency) {
      merged.urgency = newEntities.urgency;
    }

    // Merge payment information
    if (newEntities.paymentMethod) {
      merged.paymentMethod = newEntities.paymentMethod;
    }

    // Merge delivery timeline
    if (newEntities.deliveryTimeline) {
      merged.deliveryDate = newEntities.deliveryTimeline;
    }

    logger.debug('Entities merged successfully', {
      mergedKeys: Object.keys(merged).length,
    });

    return merged;
  }

  // REMOVED: convertToEntities() method
  // No longer needed since ExtractedInfo is now an alias for ExtractedEntities
  // This eliminates unnecessary type conversion code

  /**
   * Extract search filters from entities for RAG queries
   * Used for filtering property searches based on customer preferences
   * 
   * FIXED: Now accepts ExtractedEntities only (ExtractedInfo is the same type)
   */
  extractSearchFilters(entities: ExtractedEntities): {
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    propertyType?: string;
    bedrooms?: number;
    minArea?: number;
    maxArea?: number;
  } {
    const filters: any = {};

    // Extract filter values from entities
    // All properties are properly typed in ExtractedEntities interface
    const { budget, minPrice, maxPrice, minArea, maxArea, location, propertyType, bedrooms } = entities;

    // Price filters
    if (minPrice !== undefined) {
      filters.minPrice = minPrice;
    }
    if (maxPrice !== undefined) {
      filters.maxPrice = maxPrice;
    }
    // If only budget provided, use it as max price
    if (budget !== undefined && !maxPrice) {
      filters.maxPrice = budget;
    }

    // Location filter
    if (location) {
      filters.location = location;
    }

    // Property type filter
    if (propertyType) {
      filters.propertyType = propertyType;
    }

    // Bedrooms filter
    if (bedrooms !== undefined) {
      filters.bedrooms = bedrooms;
    }

    // Area filters
    if (minArea !== undefined) {
      filters.minArea = minArea;
    }
    if (maxArea !== undefined) {
      filters.maxArea = maxArea;
    }
    // If only area provided (not minArea/maxArea), use it as approximate range
    // Note: 'area' field is not in ExtractedEntities, check for it on entities object
    const area = (entities as any).area; // Only cast for non-standard field
    if (area !== undefined && !minArea && !maxArea) {
      filters.minArea = area * 0.9; // Allow 10% variance
      filters.maxArea = area * 1.1;
    }

    logger.debug('Extracted search filters', { filters });

    return filters;
  }

  /**
   * Validate and clean entity values
   * Ensures entity values are reasonable and properly formatted
   */
  validateEntities(entities: ExtractedEntities): ExtractedEntities {
    const validated: ExtractedEntities = { ...entities };

    // Validate numeric values
    if (validated.budget !== undefined && (validated.budget < 0 || validated.budget > 1000000000)) {
      logger.warn('Invalid budget value, removing', { budget: validated.budget });
      delete validated.budget;
    }
    if (validated.bedrooms !== undefined && (validated.bedrooms < 0 || validated.bedrooms > 20)) {
      logger.warn('Invalid bedrooms value, removing', { bedrooms: validated.bedrooms });
      delete validated.bedrooms;
    }
    if (validated.bathrooms !== undefined && (validated.bathrooms < 0 || validated.bathrooms > 20)) {
      logger.warn('Invalid bathrooms value, removing', { bathrooms: validated.bathrooms });
      delete validated.bathrooms;
    }
    if (validated.minArea !== undefined && validated.minArea < 0) {
      logger.warn('Invalid minArea value, removing', { minArea: validated.minArea });
      delete validated.minArea;
    }
    if (validated.maxArea !== undefined && validated.maxArea < 0) {
      logger.warn('Invalid maxArea value, removing', { maxArea: validated.maxArea });
      delete validated.maxArea;
    }

    // Validate string values
    if (validated.propertyType) {
      validated.propertyType = validated.propertyType.toLowerCase().trim();
    }
    if (validated.location) {
      validated.location = validated.location.trim();
    }
    if (validated.urgency) {
      validated.urgency = validated.urgency.toLowerCase().trim();
    }

    return validated;
  }

  /**
   * Get a summary of extracted entities for logging/display
   * 
   * FIXED: Now accepts ExtractedEntities only (ExtractedInfo is the same type)
   */
  getEntitySummary(entities: ExtractedEntities): string {
    const parts: string[] = [];

    if (entities.budget) {
      parts.push(`Budget: ${PriceFormatter.formatForLog(entities.budget)}`);
    }
    if (entities.location) {
      parts.push(`Location: ${entities.location}`);
    }
    if (entities.propertyType) {
      parts.push(`Type: ${entities.propertyType}`);
    }
    if (entities.bedrooms) {
      parts.push(`Bedrooms: ${entities.bedrooms}`);
    }
    if ((entities as any).area) {
      parts.push(`Area: ${(entities as any).area} m²`);
    }
    if (entities.urgency) {
      parts.push(`Urgency: ${entities.urgency}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No entities extracted';
  }
}

// Export singleton instance
export const entityExtractor = new EntityExtractorService();

