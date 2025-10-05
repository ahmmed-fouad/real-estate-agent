/**
 * Webhook Routes
 * Defines routes for WhatsApp webhook endpoints
 */

import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * GET /webhook/whatsapp - Webhook Verification
 * Used by WhatsApp to verify the webhook URL during setup
 */
router.get('/whatsapp', (req, res) => webhookController.verifyWebhook(req, res));

/**
 * POST /webhook/whatsapp - Receive Messages
 * Receives incoming messages, statuses, and other events from WhatsApp
 */
router.post('/whatsapp', (req, res) => webhookController.receiveMessage(req, res));

/**
 * GET /webhook/health - Health Check
 * Simple health check endpoint
 */
router.get('/health', (req, res) => webhookController.healthCheck(req, res));

export default router;
