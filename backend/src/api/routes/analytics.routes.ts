/**
 * Analytics Routes
 * Defines all analytics endpoints with Swagger/OpenAPI documentation
 * As per plan Task 3.1, Subtask 6: Analytics APIs (lines 739-745)
 */

import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  AnalyticsOverviewSchema,
  ConversationAnalyticsSchema,
  LeadAnalyticsSchema,
  PropertyAnalyticsSchema,
  InquiryTopicsSchema,
} from '../validators/analytics.validators';

const router = Router();

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     description: Retrieves dashboard statistics and metrics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Overview retrieved successfully
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
 *                     totalConversations:
 *                       type: number
 *                     activeConversations:
 *                       type: number
 *                     closedConversations:
 *                       type: number
 *                     totalMessages:
 *                       type: number
 *                     avgMessagesPerConversation:
 *                       type: number
 *                     totalProperties:
 *                       type: number
 *                     availableProperties:
 *                       type: number
 *                     totalScheduledViewings:
 *                       type: number
 *                     completedViewings:
 *                       type: number
 *       401:
 *         description: Not authenticated
 */
router.get('/overview', authenticate as any, validate(AnalyticsOverviewSchema), analyticsController.getOverview as any);

/**
 * @swagger
 * /api/analytics/conversations:
 *   get:
 *     summary: Get conversation analytics
 *     description: Retrieves detailed conversation metrics and trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Conversation analytics retrieved successfully
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
 *                     conversationTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                     averageResponseTime:
 *                       type: number
 *                     escalationRate:
 *                       type: number
 */
router.get(
  '/conversations',
  authenticate as any,
  validate(ConversationAnalyticsSchema),
  analyticsController.getConversationAnalytics as any
);

/**
 * @swagger
 * /api/analytics/leads:
 *   get:
 *     summary: Get lead analytics
 *     description: Retrieves lead statistics, quality distribution, and conversion metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lead analytics retrieved successfully
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
 *                     totalLeads:
 *                       type: number
 *                     leadQualityDistribution:
 *                       type: object
 *                     conversionRate:
 *                       type: number
 *                     averageLeadScore:
 *                       type: number
 */
router.get('/leads', authenticate as any, validate(LeadAnalyticsSchema), analyticsController.getLeadAnalytics as any);

/**
 * @swagger
 * /api/analytics/properties:
 *   get:
 *     summary: Get property analytics
 *     description: Retrieves property performance metrics and inquiry statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Property analytics retrieved successfully
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
 *                     topProperties:
 *                       type: array
 *                     inquiryRate:
 *                       type: number
 *                     viewingConversionRate:
 *                       type: number
 */
router.get(
  '/properties',
  authenticate as any,
  validate(PropertyAnalyticsSchema),
  analyticsController.getPropertyAnalytics as any
);

/**
 * @swagger
 * /api/analytics/topics:
 *   get:
 *     summary: Get customer inquiry topics
 *     description: Retrieves breakdown of customer inquiry topics/intents
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Inquiry topics retrieved successfully
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
 *                     topics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topic:
 *                             type: string
 *                           label:
 *                             type: string
 *                           count:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     totalIntents:
 *                       type: number
 */
router.get('/topics', authenticate as any, validate(InquiryTopicsSchema), analyticsController.getInquiryTopics as any);

/**
 * Task 4.4, Subtask 1: Detailed metrics endpoint
 * GET /api/analytics/detailed
 */
router.get(
  '/detailed',
  authenticate as any,
  validate(AnalyticsOverviewSchema),
  analyticsController.getDetailedAnalytics as any
);

/**
 * Task 4.4, Subtask 2: Report generation endpoints
 * GET /api/analytics/report
 * GET /api/analytics/report/email-preview
 */
router.get('/report', authenticate as any, analyticsController.generateReport as any);
router.get('/report/email-preview', authenticate as any, analyticsController.getEmailPreview as any);

/**
 * Task 4.4, Subtask 3: Visualization endpoints
 * Dashboard visualization data for charts
 */
router.get('/visualizations/conversation-trends', authenticate as any, analyticsController.getConversationTrendsChart as any);
router.get('/visualizations/lead-quality-trends', authenticate as any, analyticsController.getLeadQualityTrendsChart as any);
router.get(
  '/visualizations/property-type-comparison',
  authenticate as any,
  analyticsController.getPropertyTypeComparisonChart as any
);
router.get('/visualizations/location-comparison', authenticate as any, analyticsController.getLocationComparisonChart as any);
router.get(
  '/visualizations/lead-quality-distribution',
  authenticate as any,
  analyticsController.getLeadQualityDistributionChart as any
);
router.get('/visualizations/conversation-status', authenticate as any, analyticsController.getConversationStatusChart as any);
router.get('/visualizations/lead-journey-funnel', authenticate as any, analyticsController.getLeadJourneyFunnel as any);
router.get('/visualizations/peak-hours-heatmap', authenticate as any, analyticsController.getPeakHoursHeatmap as any);

export default router;
