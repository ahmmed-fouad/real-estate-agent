/**
 * Conversation Management Routes
 * Defines all conversation management endpoints with Swagger/OpenAPI documentation
 * As per plan Task 3.1, Subtask 5: Conversation Management APIs (lines 730-737)
 */

import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  ListConversationsSchema,
  GetConversationSchema,
  TakeoverConversationSchema,
  CloseConversationSchema,
  ReleaseConversationSchema,
  ExportConversationSchema,
  SendMessageAsAgentSchema,
} from '../validators/conversation.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: List all conversations
 *     description: Retrieves paginated list of conversations with optional filters
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, idle, closed, waiting_agent]
 *       - in: query
 *         name: leadQuality
 *         schema:
 *           type: string
 *           enum: [all, hot, warm, cold]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: lastActivityAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                     conversations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/',
  validate(ListConversationsSchema),
  conversationController.listConversations
);

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Get conversation details
 *     description: Retrieves full conversation history with messages and metadata
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
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
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     activeSession:
 *                       type: object
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:id',
  validate(GetConversationSchema),
  conversationController.getConversation
);

/**
 * @swagger
 * /api/conversations/{id}/takeover:
 *   post:
 *     summary: Agent takes over conversation
 *     description: Transfers conversation control from AI to human agent
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Takeover successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:id/takeover',
  validate(TakeoverConversationSchema),
  conversationController.takeoverConversation
);

/**
 * @swagger
 * /api/conversations/{id}/close:
 *   post:
 *     summary: Close conversation
 *     description: Marks a conversation as closed
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:id/close',
  validate(CloseConversationSchema),
  conversationController.closeConversation
);

/**
 * @swagger
 * /api/conversations/{id}/release:
 *   post:
 *     summary: Release conversation (return control to AI)
 *     description: Transfers conversation control back from agent to AI assistant
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Control returned to AI successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Conversation is not under agent control
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:id/release',
  validate(ReleaseConversationSchema),
  conversationController.releaseConversation
);

/**
 * @swagger
 * /api/conversations/{id}/export:
 *   get:
 *     summary: Export conversation transcript
 *     description: Exports conversation history in specified format
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, txt]
 *           default: json
 *     responses:
 *       200:
 *         description: Transcript exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:id/export',
  validate(ExportConversationSchema),
  conversationController.exportConversation
);

/**
 * @swagger
 * /api/conversations/{id}/send-message:
 *   post:
 *     summary: Send message as agent
 *     description: Allows agent to send a message to customer via portal (Task 4.5 Fix #1)
 *     tags: [Conversation Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 4096
 *                 description: Message text to send to customer
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                     messageId:
 *                       type: string
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid conversation state
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:id/send-message',
  validate(SendMessageAsAgentSchema),
  conversationController.sendMessageAsAgent
);

export default router;

