/**
 * Analytics Request Validators
 * Uses Zod for request validation
 * Implements validation for Task 3.1, Subtask 6: Analytics APIs (lines 739-745)
 */

import { z } from 'zod';

/**
 * Date range schema (reusable)
 */
const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Analytics overview query schema
 * GET /api/analytics/overview
 */
export const AnalyticsOverviewSchema = z.object({
  query: DateRangeSchema,
});

/**
 * Conversation analytics query schema
 * GET /api/analytics/conversations
 */
export const ConversationAnalyticsSchema = z.object({
  query: DateRangeSchema.extend({
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  }),
});

/**
 * Lead analytics query schema
 * GET /api/analytics/leads
 */
export const LeadAnalyticsSchema = z.object({
  query: DateRangeSchema,
});

/**
 * Property analytics query schema
 * GET /api/analytics/properties
 */
export const PropertyAnalyticsSchema = z.object({
  query: DateRangeSchema,
});

/**
 * Inquiry topics analytics schema
 * GET /api/analytics/topics
 */
export const InquiryTopicsSchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

/**
 * Type inference for validated data
 */
export type AnalyticsOverviewQuery = z.infer<typeof AnalyticsOverviewSchema>['query'];
export type ConversationAnalyticsQuery = z.infer<typeof ConversationAnalyticsSchema>['query'];
export type LeadAnalyticsQuery = z.infer<typeof LeadAnalyticsSchema>['query'];
export type PropertyAnalyticsQuery = z.infer<typeof PropertyAnalyticsSchema>['query'];
export type InquiryTopicsQuery = z.infer<typeof InquiryTopicsSchema>['query'];


