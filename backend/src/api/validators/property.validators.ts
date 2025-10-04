/**
 * Property Management Request Validators
 * Uses Zod for request validation
 * Implements validation for Task 3.1, Subtask 3: Property Management APIs (lines 713-721)
 */

import { z } from 'zod';

/**
 * Create property schema
 * POST /api/properties
 */
export const CreatePropertySchema = z.object({
  body: z.object({
    projectName: z.string().min(1, 'Project name is required'),
    developerName: z.string().optional(),
    propertyType: z.string().min(1, 'Property type is required'),
    
    // Location
    city: z.string().min(1, 'City is required'),
    district: z.string().min(1, 'District is required'),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    
    // Specifications
    area: z.number().positive('Area must be positive'),
    bedrooms: z.number().int().nonnegative('Bedrooms must be non-negative'),
    bathrooms: z.number().int().nonnegative('Bathrooms must be non-negative'),
    floors: z.number().int().positive('Floors must be positive').optional(),
    
    // Pricing
    basePrice: z.number().positive('Base price must be positive'),
    pricePerMeter: z.number().positive('Price per meter must be positive'),
    currency: z.string().default('EGP'),
    
    // Details
    amenities: z.array(z.string()).default([]),
    description: z.string().optional(),
    deliveryDate: z.string().or(z.date()).optional(),
    
    // Media
    images: z.array(z.string().url('Invalid image URL')).default([]),
    documents: z.array(z.string().url('Invalid document URL')).default([]),
    videoUrl: z.string().url('Invalid video URL').optional(),
    
    // Status
    status: z.enum(['available', 'sold', 'reserved']).default('available'),
    
    // Payment plans
    paymentPlans: z.array(z.object({
      planName: z.string(),
      downPaymentPercentage: z.number().min(0).max(100),
      installmentYears: z.number().int().positive(),
      monthlyPayment: z.number().positive(),
      description: z.string().optional(),
    })).optional(),
  }),
});

/**
 * Update property schema
 * PUT /api/properties/:id
 */
export const UpdatePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID'),
  }),
  body: z.object({
    projectName: z.string().min(1).optional(),
    developerName: z.string().optional(),
    propertyType: z.string().min(1).optional(),
    
    city: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    
    area: z.number().positive().optional(),
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().int().nonnegative().optional(),
    floors: z.number().int().positive().optional(),
    
    basePrice: z.number().positive().optional(),
    pricePerMeter: z.number().positive().optional(),
    currency: z.string().optional(),
    
    amenities: z.array(z.string()).optional(),
    description: z.string().optional(),
    deliveryDate: z.string().or(z.date()).optional(),
    
    images: z.array(z.string().url()).optional(),
    documents: z.array(z.string().url()).optional(),
    videoUrl: z.string().url().optional(),
    
    status: z.enum(['available', 'sold', 'reserved']).optional(),
  }),
});

/**
 * Get property by ID schema
 * GET /api/properties/:id
 */
export const GetPropertySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID'),
  }),
});

/**
 * Delete property schema
 * DELETE /api/properties/:id
 */
export const DeletePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID'),
  }),
});

/**
 * List properties query schema
 * GET /api/properties
 */
export const ListPropertiesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    status: z.enum(['available', 'sold', 'reserved', 'all']).optional(),
    propertyType: z.string().optional(),
    city: z.string().optional(),
    minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    bedrooms: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['createdAt', 'basePrice', 'area']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

/**
 * Type inference for validated data
 */
export type CreatePropertyData = z.infer<typeof CreatePropertySchema>['body'];
export type UpdatePropertyData = z.infer<typeof UpdatePropertySchema>['body'];
export type UpdatePropertyParams = z.infer<typeof UpdatePropertySchema>['params'];
export type GetPropertyParams = z.infer<typeof GetPropertySchema>['params'];
export type DeletePropertyParams = z.infer<typeof DeletePropertySchema>['params'];
export type ListPropertiesQuery = z.infer<typeof ListPropertiesSchema>['query'];


