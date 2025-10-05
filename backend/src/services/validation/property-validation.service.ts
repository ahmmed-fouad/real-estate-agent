/**
 * Property Data Validation Service
 * Task 3.3, Subtask 2: Data Validation Rules (lines 856-880)
 * 
 * Provides comprehensive validation for property data:
 * - Required fields validation
 * - Type validation
 * - Custom validation rules
 * - Detailed error reporting
 */

import { RawPropertyData } from '../../utils/property-parser';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('PropertyValidation');

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Property Validation Service
 * As per plan lines 856-880
 */
export class PropertyValidationService {
  /**
   * Required fields for property data
   * As per plan line 859-865
   */
  private readonly requiredFields = [
    'projectName',
    'propertyType',
    'city',        // location.city
    'district',    // location.district
    'basePrice',   // pricing.basePrice
    'area',        // specifications.area
  ] as const;

  /**
   * Validate property data comprehensively
   * 
   * @param data - Raw property data to validate
   * @returns Validation result with errors if any
   */
  validatePropertyData(data: RawPropertyData): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Required fields validation
    this.validateRequiredFields(data, errors);

    // 2. Type validation
    this.validateTypes(data, errors);

    // 3. Custom validation rules
    this.validateCustomRules(data, errors);

    const valid = errors.length === 0;

    if (!valid) {
      logger.warn('Property validation failed', {
        errorCount: errors.length,
        projectName: data.projectName,
      });
    }

    return { valid, errors };
  }

  /**
   * Validate required fields
   * As per plan line 859-865
   */
  private validateRequiredFields(data: RawPropertyData, errors: ValidationError[]): void {
    if (!data.agentId || data.agentId.trim() === '') {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required',
        value: data.agentId,
      });
    }

    if (!data.projectName || data.projectName.trim() === '') {
      errors.push({
        field: 'projectName',
        message: 'Project name is required',
        value: data.projectName,
      });
    }

    if (!data.propertyType || data.propertyType.trim() === '') {
      errors.push({
        field: 'propertyType',
        message: 'Property type is required',
        value: data.propertyType,
      });
    }

    // Location validation
    if (!data.city || data.city.trim() === '') {
      errors.push({
        field: 'city',
        message: 'City is required',
        value: data.city,
      });
    }

    if (!data.district || data.district.trim() === '') {
      errors.push({
        field: 'district',
        message: 'District is required',
        value: data.district,
      });
    }

    // Pricing validation
    if (data.basePrice === undefined || data.basePrice === null) {
      errors.push({
        field: 'basePrice',
        message: 'Base price is required',
        value: data.basePrice,
      });
    }

    // Specifications validation
    if (data.area === undefined || data.area === null) {
      errors.push({
        field: 'area',
        message: 'Area is required',
        value: data.area,
      });
    }
  }

  /**
   * Validate field types
   * As per plan lines 867-872
   */
  private validateTypes(data: RawPropertyData, errors: ValidationError[]): void {
    // Number type validations
    const numberFields = [
      { field: 'area', value: data.area },
      { field: 'bedrooms', value: data.bedrooms },
      { field: 'bathrooms', value: data.bathrooms },
      { field: 'floors', value: data.floors },
      { field: 'basePrice', value: data.basePrice },
      { field: 'pricePerMeter', value: data.pricePerMeter },
      { field: 'latitude', value: data.latitude },
      { field: 'longitude', value: data.longitude },
    ];

    for (const { field, value } of numberFields) {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field,
            message: `${field} must be a valid number`,
            value,
          });
        }
      }
    }

    // String type validations
    const stringFields = [
      { field: 'projectName', value: data.projectName },
      { field: 'propertyType', value: data.propertyType },
      { field: 'city', value: data.city },
      { field: 'district', value: data.district },
      { field: 'currency', value: data.currency },
    ];

    for (const { field, value } of stringFields) {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'string') {
          errors.push({
            field,
            message: `${field} must be a string`,
            value,
          });
        }
      }
    }

    // Array validations
    if (data.amenities !== undefined && !Array.isArray(data.amenities) && typeof data.amenities !== 'string') {
      errors.push({
        field: 'amenities',
        message: 'Amenities must be an array or comma-separated string',
        value: data.amenities,
      });
    }

    if (data.images !== undefined && !Array.isArray(data.images) && typeof data.images !== 'string') {
      errors.push({
        field: 'images',
        message: 'Images must be an array or comma-separated string',
        value: data.images,
      });
    }

    if (data.documents !== undefined && !Array.isArray(data.documents) && typeof data.documents !== 'string') {
      errors.push({
        field: 'documents',
        message: 'Documents must be an array or comma-separated string',
        value: data.documents,
      });
    }

    // Payment plans validation
    if (data.paymentPlans !== undefined) {
      if (!Array.isArray(data.paymentPlans) && typeof data.paymentPlans !== 'string') {
        errors.push({
          field: 'paymentPlans',
          message: 'Payment plans must be an array or JSON string',
          value: data.paymentPlans,
        });
      }
    }
  }

  /**
   * Custom validation rules
   * As per plan lines 874-878
   */
  private validateCustomRules(data: RawPropertyData, errors: ValidationError[]): void {
    // Price must be positive
    if (data.basePrice !== undefined && data.basePrice !== null) {
      if (data.basePrice <= 0) {
        errors.push({
          field: 'basePrice',
          message: 'Base price must be greater than 0',
          value: data.basePrice,
        });
      }
    }

    if (data.pricePerMeter !== undefined && data.pricePerMeter !== null) {
      if (data.pricePerMeter <= 0) {
        errors.push({
          field: 'pricePerMeter',
          message: 'Price per meter must be greater than 0',
          value: data.pricePerMeter,
        });
      }
    }

    // Area must be positive
    if (data.area !== undefined && data.area !== null) {
      if (data.area <= 0) {
        errors.push({
          field: 'area',
          message: 'Area must be greater than 0',
          value: data.area,
        });
      }
    }

    // Bedrooms/Bathrooms must be non-negative
    if (data.bedrooms !== undefined && data.bedrooms !== null) {
      if (data.bedrooms < 0) {
        errors.push({
          field: 'bedrooms',
          message: 'Bedrooms must be non-negative',
          value: data.bedrooms,
        });
      }
    }

    if (data.bathrooms !== undefined && data.bathrooms !== null) {
      if (data.bathrooms < 0) {
        errors.push({
          field: 'bathrooms',
          message: 'Bathrooms must be non-negative',
          value: data.bathrooms,
        });
      }
    }

    if (data.floors !== undefined && data.floors !== null) {
      if (data.floors < 0) {
        errors.push({
          field: 'floors',
          message: 'Floors must be non-negative',
          value: data.floors,
        });
      }
    }

    // Property type validation (common types)
    if (data.propertyType) {
      const validTypes = ['apartment', 'villa', 'townhouse', 'penthouse', 'studio', 'duplex', 'chalet', 'land'];
      const normalizedType = data.propertyType.toLowerCase().trim();
      
      if (!validTypes.includes(normalizedType)) {
        // Just a warning, not an error (allows custom types)
        logger.debug('Uncommon property type', {
          propertyType: data.propertyType,
          validTypes,
        });
      }
    }

    // Currency validation
    if (data.currency) {
      const validCurrencies = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
      if (!validCurrencies.includes(data.currency.toUpperCase())) {
        errors.push({
          field: 'currency',
          message: `Currency must be one of: ${validCurrencies.join(', ')}`,
          value: data.currency,
        });
      }
    }

    // Status validation
    if (data.status) {
      const validStatuses = ['available', 'sold', 'reserved', 'under_construction'];
      if (!validStatuses.includes(data.status.toLowerCase())) {
        errors.push({
          field: 'status',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
          value: data.status,
        });
      }
    }

    // Coordinates validation (if provided, both must be present)
    if (data.latitude !== undefined || data.longitude !== undefined) {
      if (data.latitude === undefined || data.longitude === undefined) {
        errors.push({
          field: 'coordinates',
          message: 'Both latitude and longitude must be provided together',
          value: { latitude: data.latitude, longitude: data.longitude },
        });
      }

      // Validate coordinate ranges
      if (data.latitude !== undefined && data.latitude !== null) {
        if (data.latitude < -90 || data.latitude > 90) {
          errors.push({
            field: 'latitude',
            message: 'Latitude must be between -90 and 90',
            value: data.latitude,
          });
        }
      }

      if (data.longitude !== undefined && data.longitude !== null) {
        if (data.longitude < -180 || data.longitude > 180) {
          errors.push({
            field: 'longitude',
            message: 'Longitude must be between -180 and 180',
            value: data.longitude,
          });
        }
      }
    }

    // Date validation (if provided)
    if (data.deliveryDate) {
      const date = new Date(data.deliveryDate);
      if (isNaN(date.getTime())) {
        errors.push({
          field: 'deliveryDate',
          message: 'Delivery date must be a valid date',
          value: data.deliveryDate,
        });
      }
    }

    // URL validation (basic check)
    if (data.videoUrl) {
      try {
        new URL(data.videoUrl);
      } catch {
        errors.push({
          field: 'videoUrl',
          message: 'Video URL must be a valid URL',
          value: data.videoUrl,
        });
      }
    }
  }

  /**
   * Validate batch of properties
   * Returns array of validation results
   * 
   * @param properties - Array of properties to validate
   * @returns Array of validation results
   */
  validateBatch(properties: RawPropertyData[]): ValidationResult[] {
    logger.info('Validating batch of properties', { count: properties.length });

    const results = properties.map((property, index) => {
      try {
        return this.validatePropertyData(property);
      } catch (error) {
        logger.error('Error validating property', {
          index,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
          valid: false,
          errors: [{
            field: 'general',
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        };
      }
    });

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;

    logger.info('Batch validation completed', {
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
    });

    return results;
  }

  /**
   * Get validation summary for batch
   * Useful for showing upload preview
   */
  getValidationSummary(results: ValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    errorsByField: Record<string, number>;
    commonErrors: Array<{ field: string; message: string; count: number }>;
  } {
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    const invalid = total - valid;

    // Count errors by field
    const errorsByField: Record<string, number> = {};
    const errorMessages: Map<string, number> = new Map();

    results.forEach(result => {
      result.errors.forEach(error => {
        errorsByField[error.field] = (errorsByField[error.field] || 0) + 1;
        
        const key = `${error.field}:${error.message}`;
        errorMessages.set(key, (errorMessages.get(key) || 0) + 1);
      });
    });

    // Get top 10 most common errors
    const commonErrors = Array.from(errorMessages.entries())
      .map(([key, count]) => {
        const [field, message] = key.split(':');
        return { field, message, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      valid,
      invalid,
      errorsByField,
      commonErrors,
    };
  }
}

// Export singleton instance
export const propertyValidationService = new PropertyValidationService();

