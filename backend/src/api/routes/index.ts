/**
 * API Routes Index
 * Centralizes all API route modules
 * Includes all Task 3.1 routes (lines 697-745)
 */

import { Router } from 'express';
import webhookRoutes from './webhook.routes';
import authRoutes from './auth.routes';
import agentRoutes from './agent.routes';
import propertyRoutes from './property.routes';
import conversationRoutes from './conversation.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp AI Sales Agent API',
  });
});

/**
 * Mount all route modules
 */

// Webhook routes (Phase 1)
router.use('/webhook', webhookRoutes);

// Authentication routes (Task 3.1, Subtask 1: lines 697-703)
router.use('/auth', authRoutes);

// Agent management routes (Task 3.1, Subtask 2: lines 705-711)
router.use('/agents', agentRoutes);

// Property management routes (Task 3.1, Subtask 3: lines 713-721)
router.use('/properties', propertyRoutes);

// Conversation management routes (Task 3.1, Subtask 5: lines 730-737)
router.use('/conversations', conversationRoutes);

// Analytics routes (Task 3.1, Subtask 6: lines 739-745)
router.use('/analytics', analyticsRoutes);

export default router;

