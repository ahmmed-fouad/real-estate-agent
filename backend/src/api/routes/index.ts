/**
 * Main Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import webhookRoutes from './webhook.routes';

const router = Router();

// Mount webhook routes
router.use('/webhook', webhookRoutes);

// Health check for the API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'WhatsApp AI Agent API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;

