/**
 * Conversation Management Request Validators
 * Uses Zod for request validation
 * Implements validation for Task 3.1, Subtask 5: Conversation Management APIs (lines 730-737)
 */

import { z } from 'zod';

/**
 * List conversations query schema
 * GET /api/conversations
 */
export const ListConversationsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    status: z.enum(['active', 'idle', 'closed', 'waiting_agent', 'all']).optional(),
    leadQuality: z.enum(['hot', 'warm', 'cold', 'all']).optional(),
    search: z.string().optional(), // Search by customer name or phone
    sortBy: z.enum(['createdAt', 'lastActivityAt', 'leadScore']).default('lastActivityAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

/**
 * Get conversation by ID schema
 * GET /api/conversations/:id
 */
export const GetConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
});

/**
 * Takeover conversation schema
 * POST /api/conversations/:id/takeover
 */
export const TakeoverConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
});

/**
 * Close conversation schema
 * POST /api/conversations/:id/close
 */
export const CloseConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});

/**
 * Release conversation schema
 * POST /api/conversations/:id/release
 */
export const ReleaseConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
});

/**
 * Export conversation schema
 * GET /api/conversations/:id/export
 */
export const ExportConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  query: z.object({
    format: z.enum(['json', 'text', 'csv']).default('json'),
  }),
});

/**
 * Send message as agent schema
 * POST /api/conversations/:id/send-message
 * Task 4.5 Fix #1: Agent can respond via portal
 */
export const SendMessageAsAgentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty').max(4096, 'Message too long'),
  }),
});

/**
 * Type inference for validated data
 */
export type ListConversationsQuery = z.infer<typeof ListConversationsSchema>['query'];
export type GetConversationParams = z.infer<typeof GetConversationSchema>['params'];
export type TakeoverConversationParams = z.infer<typeof TakeoverConversationSchema>['params'];
export type CloseConversationParams = z.infer<typeof CloseConversationSchema>['params'];
export type CloseConversationBody = z.infer<typeof CloseConversationSchema>['body'];
export type ReleaseConversationParams = z.infer<typeof ReleaseConversationSchema>['params'];
export type ExportConversationParams = z.infer<typeof ExportConversationSchema>['params'];
export type ExportConversationQuery = z.infer<typeof ExportConversationSchema>['query'];
export type SendMessageAsAgentParams = z.infer<typeof SendMessageAsAgentSchema>['params'];
export type SendMessageAsAgentBody = z.infer<typeof SendMessageAsAgentSchema>['body'];


