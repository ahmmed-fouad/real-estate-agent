/**
 * Agent Management Request Validators
 * Uses Zod for request validation
 * Implements validation for Task 3.1, Subtask 2: Agent Management APIs (lines 705-711)
 */

import { z } from 'zod';

/**
 * Update agent profile schema
 * PUT /api/agents/profile
 */
export const UpdateProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(255, 'Full name too long')
      .trim()
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    companyName: z
      .string()
      .max(255, 'Company name too long')
      .trim()
      .optional(),
    whatsappNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid WhatsApp number format')
      .optional(),
  }),
});

/**
 * Update agent settings schema
 * PUT /api/agents/settings
 */
export const UpdateSettingsSchema = z.object({
  body: z.object({
    settings: z.record(z.any()).optional(),
  }),
});

/**
 * Type inference for validated data
 */
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>['body'];
export type UpdateSettingsData = z.infer<typeof UpdateSettingsSchema>['body'];


