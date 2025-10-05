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

// All routes require authentication
router.use(authenticate);

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
router.get('/overview', validate(AnalyticsOverviewSchema), analyticsController.getOverview);

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
  validate(ConversationAnalyticsSchema),
  analyticsController.getConversationAnalytics
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
router.get('/leads', validate(LeadAnalyticsSchema), analyticsController.getLeadAnalytics);

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
  validate(PropertyAnalyticsSchema),
  analyticsController.getPropertyAnalytics
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
router.get('/topics', validate(InquiryTopicsSchema), analyticsController.getInquiryTopics);

/**
 * Task 4.4, Subtask 1: Detailed metrics endpoint
 * GET /api/analytics/detailed
 */
router.get(
  '/detailed',
  validate(AnalyticsOverviewSchema),
  analyticsController.getDetailedAnalytics
);

/**
 * Task 4.4, Subtask 2: Report generation endpoints
 * GET /api/analytics/report
 * GET /api/analytics/report/email-preview
 */
router.get('/report', analyticsController.generateReport);
router.get('/report/email-preview', analyticsController.getEmailPreview);

/**
 * Task 4.4, Subtask 3: Visualization endpoints
 * Dashboard visualization data for charts
 */
router.get('/visualizations/conversation-trends', analyticsController.getConversationTrendsChart);
router.get('/visualizations/lead-quality-trends', analyticsController.getLeadQualityTrendsChart);
router.get(
  '/visualizations/property-type-comparison',
  analyticsController.getPropertyTypeComparisonChart
);
router.get('/visualizations/location-comparison', analyticsController.getLocationComparisonChart);
router.get(
  '/visualizations/lead-quality-distribution',
  analyticsController.getLeadQualityDistributionChart
);
router.get('/visualizations/conversation-status', analyticsController.getConversationStatusChart);
router.get('/visualizations/lead-journey-funnel', analyticsController.getLeadJourneyFunnel);
router.get('/visualizations/peak-hours-heatmap', analyticsController.getPeakHoursHeatmap);

export default router;
