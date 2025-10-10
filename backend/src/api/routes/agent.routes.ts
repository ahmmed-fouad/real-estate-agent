/**
 * Agent Management Routes
 * Defines all agent management endpoints with Swagger/OpenAPI documentation
 * As per plan Task 3.1, Subtask 2: Agent Management APIs (lines 705-711)
 */

import { Router } from 'express';
import * as agentController from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  UpdateProfileSchema,
  UpdateSettingsSchema,
} from '../validators/agent.validators';

const router = Router();

/**
 * @swagger
 * /api/agents/profile:
 *   get:
 *     summary: Get agent profile
 *     description: Retrieves the current agent's profile information
 *     tags: [Agent Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticate as any, agentController.getProfile as any);

/**
 * @swagger
 * /api/agents/profile:
 *   put:
 *     summary: Update agent profile
 *     description: Updates the current agent's profile information
 *     tags: [Agent Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               phoneNumber:
 *                 type: string
 *                 example: +201234567890
 *               companyName:
 *                 type: string
 *                 example: Real Estate Co.
 *               whatsappNumber:
 *                 type: string
 *                 example: +201234567890
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/profile',
  authenticate as any,
  validate(UpdateProfileSchema),
  agentController.updateProfile as any
);

/**
 * @swagger
 * /api/agents/stats:
 *   get:
 *     summary: Get agent statistics
 *     description: Retrieves statistics for the current agent (properties, conversations, leads)
 *     tags: [Agent Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProperties:
 *                       type: number
 *                       example: 50
 *                     totalConversations:
 *                       type: number
 *                       example: 120
 *                     activeConversations:
 *                       type: number
 *                       example: 15
 *                     totalLeads:
 *                       type: number
 *                       example: 45
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', authenticate as any, agentController.getStats as any);

/**
 * @swagger
 * /api/agents/settings:
 *   put:
 *     summary: Update agent settings
 *     description: Updates the current agent's settings and preferences
 *     tags: [Agent Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 description: Agent-specific settings (greeting messages, working hours, etc.)
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/settings',
  authenticate as any,
  validate(UpdateSettingsSchema),
  agentController.updateSettings as any
);

export default router;

