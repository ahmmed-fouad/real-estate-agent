/**
 * Analytics Controller
 * Handles analytics and reporting operations
 * As per plan Task 3.1, Subtask 6: Analytics APIs (lines 739-745)
 * 
 * Endpoints:
 * - GET /api/analytics/overview (line 741)
 * - GET /api/analytics/conversations (line 742)
 * - GET /api/analytics/leads (line 743)
 * - GET /api/analytics/properties (line 744)
 */

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { prisma } from '../../config/prisma-client';
import { ErrorResponse } from '../../utils';
import {
  AnalyticsOverviewQuery,
  ConversationAnalyticsQuery,
  LeadAnalyticsQuery,
  PropertyAnalyticsQuery,
  InquiryTopicsQuery,
} from '../validators/analytics.validators';
import { analyticsService, reportGeneratorService, visualizationService } from '../../services/analytics';

const logger = createServiceLogger('AnalyticsController');

/**
 * Get analytics overview (dashboard stats)
 * GET /api/analytics/overview
 * As per plan line 741
 */
export const getOverview = async (
  req: AuthenticatedRequest<{}, {}, {}, AnalyticsOverviewQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    logger.info('Analytics overview request', { agentId, startDate, endDate });

    // Build date filter
    const dateFilter: Prisma.ConversationWhereInput = startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {};

    // Fetch all metrics in parallel
    const [
      totalConversations,
      activeConversations,
      closedConversations,
      totalMessages,
      avgMessagesPerConversation,
      totalProperties,
      availableProperties,
      totalScheduledViewings,
      completedViewings,
      leadQualityDistribution,
      recentConversations,
    ] = await Promise.all([
      // Total conversations
      prisma.conversation.count({
        where: { agentId, ...dateFilter },
      }),
      
      // Active conversations
      prisma.conversation.count({
        where: { agentId, status: 'active', ...dateFilter },
      }),
      
      // Closed conversations
      prisma.conversation.count({
        where: { agentId, status: 'closed', ...dateFilter },
      }),
      
      // Total messages
      prisma.message.count({
        where: {
          conversation: { agentId, ...dateFilter },
        },
      }),
      
      // Average messages per conversation
      prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          conversation: { agentId, ...dateFilter },
        },
        _count: true,
      }),
      
      // Total properties
      prisma.property.count({ where: { agentId } }),
      
      // Available properties
      prisma.property.count({
        where: { agentId, status: 'available' },
      }),
      
      // Total scheduled viewings
      prisma.scheduledViewing.count({
        where: { agentId },
      }),
      
      // Completed viewings
      prisma.scheduledViewing.count({
        where: { agentId, status: 'completed' },
      }),
      
      // Lead quality distribution
      prisma.conversation.groupBy({
        by: ['leadQuality'],
        where: { agentId, leadQuality: { not: null }, ...dateFilter },
        _count: true,
      }),
      
      // Recent conversations
      prisma.conversation.findMany({
        where: { agentId, ...dateFilter },
        orderBy: { lastActivityAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          status: true,
          leadQuality: true,
          leadScore: true,
          lastActivityAt: true,
        },
      }),
    ]);

    // Calculate average messages
    const avgMessages =
      avgMessagesPerConversation.length > 0
        ? avgMessagesPerConversation.reduce((sum, item) => sum + item._count, 0) /
          avgMessagesPerConversation.length
        : 0;

    // Format lead quality distribution
    const leadDistribution = leadQualityDistribution.reduce((acc, item) => {
      if (item.leadQuality) {
        acc[item.leadQuality] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate response rate (messages per conversation)
    const responseRate =
      totalConversations > 0 ? (totalMessages / totalConversations).toFixed(2) : '0';

    // Calculate viewing conversion rate
    const viewingRate =
      totalScheduledViewings > 0
        ? ((completedViewings / totalScheduledViewings) * 100).toFixed(2)
        : '0';

    const overview = {
      summary: {
        totalConversations,
        activeConversations,
        closedConversations,
        totalMessages,
        avgMessagesPerConversation: parseFloat(avgMessages.toFixed(2)),
        responseRate: parseFloat(responseRate),
      },
      properties: {
        total: totalProperties,
        available: availableProperties,
        sold: totalProperties - availableProperties,
      },
      viewings: {
        total: totalScheduledViewings,
        completed: completedViewings,
        conversionRate: parseFloat(viewingRate),
      },
      leads: {
        distribution: leadDistribution,
        total: Object.values(leadDistribution).reduce((sum, count) => sum + count, 0),
      },
      recentActivity: recentConversations,
    };

    logger.info('Analytics overview retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: { overview },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve analytics overview', 500, { agentId: req.user.id });
  }
};

/**
 * Get conversation analytics
 * GET /api/analytics/conversations
 * As per plan line 742
 */
export const getConversationAnalytics = async (
  req: AuthenticatedRequest<{}, {}, {}, ConversationAnalyticsQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate, groupBy } = req.query;

    logger.info('Conversation analytics request', { agentId, startDate, endDate, groupBy });

    // Build date filter
    const dateFilter: Prisma.ConversationWhereInput = startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {};

    // Get conversations grouped by date
    const conversations = await prisma.conversation.findMany({
      where: { agentId, ...dateFilter },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        leadQuality: true,
        createdAt: true,
        closedAt: true,
      },
    });

    // Get status distribution
    const statusDistribution = await prisma.conversation.groupBy({
      by: ['status'],
      where: { agentId, ...dateFilter },
      _count: true,
    });

    // Calculate average conversation duration
    const closedConversations = conversations.filter(
      (c) => c.status === 'closed' && c.closedAt
    );
    const avgDuration =
      closedConversations.length > 0
        ? closedConversations.reduce((sum, c) => {
            const duration = c.closedAt!.getTime() - c.createdAt.getTime();
            return sum + duration / (1000 * 60); // Convert to minutes
          }, 0) / closedConversations.length
        : 0;

    // Group conversations by time period
    const groupedData = groupConversationsByPeriod(conversations, groupBy);

    const analytics = {
      total: conversations.length,
      byStatus: statusDistribution.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      avgDuration: parseFloat(avgDuration.toFixed(2)), // in minutes
      timeline: groupedData,
    };

    logger.info('Conversation analytics retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve conversation analytics', 500, { agentId: req.user.id });
  }
};

/**
 * Get lead analytics
 * GET /api/analytics/leads
 * As per plan line 743
 */
export const getLeadAnalytics = async (
  req: AuthenticatedRequest<{}, {}, {}, LeadAnalyticsQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    logger.info('Lead analytics request', { agentId, startDate, endDate });

    // Build date filter
    const dateFilter: Prisma.ConversationWhereInput = startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {};

    // Get lead quality distribution
    const qualityDistribution = await prisma.conversation.groupBy({
      by: ['leadQuality'],
      where: { agentId, leadQuality: { not: null }, ...dateFilter },
      _count: true,
      _avg: { leadScore: true },
    });

    // Get lead score ranges
    const allLeads = await prisma.conversation.findMany({
      where: { agentId, ...dateFilter },
      select: { leadScore: true, leadQuality: true },
    });

    // Calculate score ranges
    const scoreRanges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    allLeads.forEach((lead) => {
      if (lead.leadScore >= 0 && lead.leadScore <= 20) scoreRanges['0-20']++;
      else if (lead.leadScore <= 40) scoreRanges['21-40']++;
      else if (lead.leadScore <= 60) scoreRanges['41-60']++;
      else if (lead.leadScore <= 80) scoreRanges['61-80']++;
      else scoreRanges['81-100']++;
    });

    // Format quality data
    const qualityData = qualityDistribution.map((item) => ({
      quality: item.leadQuality,
      count: item._count,
      avgScore: item._avg.leadScore ? parseFloat(item._avg.leadScore.toFixed(2)) : 0,
    }));

    const analytics = {
      total: allLeads.length,
      byQuality: qualityData,
      scoreRanges,
      avgScore:
        allLeads.length > 0
          ? parseFloat(
              (allLeads.reduce((sum, l) => sum + l.leadScore, 0) / allLeads.length).toFixed(2)
            )
          : 0,
    };

    logger.info('Lead analytics retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve lead analytics', 500, { agentId: req.user.id });
  }
};

/**
 * Get property analytics
 * GET /api/analytics/properties
 * As per plan line 744
 */
export const getPropertyAnalytics = async (
  req: AuthenticatedRequest<{}, {}, {}, PropertyAnalyticsQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    logger.info('Property analytics request', { agentId, startDate, endDate });

    // Build date filter
    const dateFilter: Prisma.PropertyWhereInput = startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {};

    // Get property metrics
    const [
      totalProperties,
      propertyTypeDistribution,
      propertyStatusDistribution,
      locationDistribution,
      priceRanges,
      topProperties,
    ] = await Promise.all([
      // Total properties
      prisma.property.count({ where: { agentId, ...dateFilter } }),

      // By type
      prisma.property.groupBy({
        by: ['propertyType'],
        where: { agentId, ...dateFilter },
        _count: true,
      }),

      // By status
      prisma.property.groupBy({
        by: ['status'],
        where: { agentId, ...dateFilter },
        _count: true,
      }),

      // By location
      prisma.property.groupBy({
        by: ['city'],
        where: { agentId, ...dateFilter },
        _count: true,
      }),

      // Get all prices for range calculation
      prisma.property.findMany({
        where: { agentId, ...dateFilter },
        select: { basePrice: true },
      }),

      // Top inquired properties (based on scheduled viewings)
      prisma.property.findMany({
        where: { agentId },
        select: {
          id: true,
          projectName: true,
          propertyType: true,
          city: true,
          basePrice: true,
          _count: {
            select: { scheduledViewings: true },
          },
        },
        orderBy: {
          scheduledViewings: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Calculate price ranges (in millions)
    const ranges = {
      '0-1M': 0,
      '1-2M': 0,
      '2-5M': 0,
      '5-10M': 0,
      '10M+': 0,
    };

    priceRanges.forEach((p) => {
      const price = parseFloat(p.basePrice.toString()) / 1000000;
      if (price < 1) ranges['0-1M']++;
      else if (price < 2) ranges['1-2M']++;
      else if (price < 5) ranges['2-5M']++;
      else if (price < 10) ranges['5-10M']++;
      else ranges['10M+']++;
    });

    const analytics = {
      total: totalProperties,
      byType: propertyTypeDistribution.reduce((acc, item) => {
        acc[item.propertyType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: propertyStatusDistribution.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byLocation: locationDistribution.reduce((acc, item) => {
        acc[item.city] = item._count;
        return acc;
      }, {} as Record<string, number>),
      priceRanges: ranges,
      topPerformers: topProperties.map((p) => ({
        id: p.id,
        name: p.projectName,
        type: p.propertyType,
        city: p.city,
        price: parseFloat(p.basePrice.toString()),
        inquiries: p._count.scheduledViewings,
      })),
    };

    logger.info('Property analytics retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve property analytics', 500, { agentId: req.user.id });
  }
};

/**
 * Get customer inquiry topics
 * GET /api/analytics/topics
 * As per plan Task 3.2 line 818 - "Customer inquiry topics"
 */
export const getInquiryTopics = async (
  req: AuthenticatedRequest<{}, {}, {}, InquiryTopicsQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    logger.info('Inquiry topics analytics request', { agentId, startDate, endDate });

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get all messages with intents within date range
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          agentId,
          ...(startDate || endDate ? { startedAt: dateFilter } : {}),
        },
        role: 'user', // Only customer messages
        intent: {
          not: null,
        },
      },
      select: {
        intent: true,
      },
    });

    // Count intents
    const intentCounts: Record<string, number> = {};
    let totalIntents = 0;

    messages.forEach((message) => {
      if (message.intent) {
        intentCounts[message.intent] = (intentCounts[message.intent] || 0) + 1;
        totalIntents++;
      }
    });

    // Convert to topics array with percentages
    const topics = Object.entries(intentCounts)
      .map(([intent, count]) => ({
        topic: intent,
        label: formatIntentLabel(intent),
        count,
        percentage: totalIntents > 0 ? Math.round((count / totalIntents) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    logger.info('Inquiry topics retrieved', {
      agentId,
      totalTopics: topics.length,
      totalIntents,
    });

    res.status(200).json({
      success: true,
      data: {
        topics,
        totalIntents,
      },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve inquiry topics', 500, { agentId: req.user.id });
  }
};

/**
 * Helper function to format intent labels for display
 */
function formatIntentLabel(intent: string): string {
  const labels: Record<string, string> = {
    PROPERTY_INQUIRY: 'Property Inquiries',
    PRICE_INQUIRY: 'Price Questions',
    PAYMENT_PLANS: 'Payment Plans',
    LOCATION_INFO: 'Location Information',
    SCHEDULE_VIEWING: 'Schedule Viewings',
    COMPARISON: 'Property Comparisons',
    GENERAL_QUESTION: 'General Questions',
    COMPLAINT: 'Complaints',
    AGENT_REQUEST: 'Agent Requests',
    GREETING: 'Greetings',
    GOODBYE: 'Farewells',
  };
  return labels[intent] || intent;
}

/**
 * Helper: Group conversations by time period
 */
function groupConversationsByPeriod(
  conversations: Array<{ createdAt: Date; status: string }>,
  groupBy: 'day' | 'week' | 'month'
): Record<string, number> {
  const grouped: Record<string, number> = {};

  conversations.forEach((conv) => {
    let key: string;
    const date = conv.createdAt;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      // month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    grouped[key] = (grouped[key] || 0) + 1;
  });

  return grouped;
}

/**
 * Get detailed analytics metrics
 * GET /api/analytics/detailed
 * Task 4.4, Subtask 1: Comprehensive metrics (Plan lines 1025-1044)
 * 
 * @swagger
 * /api/analytics/detailed:
 *   get:
 *     summary: Get detailed analytics metrics
 *     description: Returns comprehensive metrics including conversation, lead, property, and customer analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period (ISO 8601)
 *     responses:
 *       200:
 *         description: Detailed analytics retrieved successfully
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
 *                     conversationMetrics:
 *                       type: object
 *                       properties:
 *                         totalConversations:
 *                           type: number
 *                         averageResponseTime:
 *                           type: number
 *                           description: Average response time in seconds
 *                         conversationLength:
 *                           type: number
 *                           description: Average messages per conversation
 *                         resolutionRate:
 *                           type: number
 *                           description: Resolution rate percentage
 *                         escalationRate:
 *                           type: number
 *                           description: Escalation rate percentage
 *                     leadMetrics:
 *                       type: object
 *                     propertyMetrics:
 *                       type: object
 *                     customerMetrics:
 *                       type: object
 *       500:
 *         description: Server error
 */
export const getDetailedAnalytics = async (
  req: AuthenticatedRequest<{}, {}, {}, AnalyticsOverviewQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    logger.info('Detailed analytics request', { agentId, startDate, endDate });

    // Parse date range
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    // Get comprehensive analytics using analytics service
    const analytics = await analyticsService.getComprehensiveAnalytics(agentId, dateRange);

    logger.info('Detailed analytics retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return ErrorResponse.send(
      res,
      error,
      'Failed to retrieve detailed analytics',
      500,
      { agentId: req.user.id }
    );
  }
};

/**
 * Generate report
 * GET /api/analytics/report
 * Task 4.4, Subtask 2: Report Generation (Plan lines 1046-1051)
 * 
 * @swagger
 * /api/analytics/report:
 *   get:
 *     summary: Generate analytics report
 *     description: Generates a comprehensive analytics report for specified period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, custom]
 *         description: Report period type
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, excel, pdf]
 *           default: json
 *         description: Report format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (required for custom period)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (required for custom period)
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
export const generateReport = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { period = 'weekly', format = 'json', startDate, endDate } = req.query;

    logger.info('Report generation request', { agentId, period, format });

    // Validate period
    if (!['daily', 'weekly', 'monthly', 'custom'].includes(period)) {
      return ErrorResponse.send(res, new Error('Invalid period'), 'Invalid period type', 400, { agentId });
    }

    // Validate custom period dates
    if (period === 'custom' && (!startDate || !endDate)) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date required for custom period',
        400,
        { agentId }
      );
    }

    // Generate report
    const reportData = await reportGeneratorService.generateReport({
      agentId,
      period: period as any,
      format: format as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // Return based on format
    // Task 4.4, Moderate Issue #3: Complete format handling
    if (format === 'excel') {
      const excelBuffer = await reportGeneratorService.exportToExcel(reportData);
      
      const filename = `analytics-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      res.send(excelBuffer);
      
      logger.info('Excel report generated', { agentId, filename });
    } else if (format === 'pdf') {
      // PDF format
      const pdfBuffer = await reportGeneratorService.exportToPDF(reportData);
      
      const filename = `analytics-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      
      logger.info('PDF report generated', { agentId, filename });
    } else {
      // JSON format (default)
      res.status(200).json({
        success: true,
        data: reportData,
      });
      
      logger.info('JSON report generated', { agentId });
    }
  } catch (error) {
    return ErrorResponse.send(
      res,
      error,
      'Failed to generate report',
      500,
      { agentId: req.user.id }
    );
  }
};

/**
 * Get report email preview
 * GET /api/analytics/report/email-preview
 * Task 4.4, Subtask 2: Email report generation (Plan line 1047)
 * 
 * @swagger
 * /api/analytics/report/email-preview:
 *   get:
 *     summary: Get email report preview
 *     description: Generates HTML preview of email report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Report period type
 *     responses:
 *       200:
 *         description: Email preview generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Server error
 */
export const getEmailPreview = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { period = 'daily' } = req.query;

    logger.info('Email preview request', { agentId, period });

    // Generate report data
    let reportData;
    if (period === 'daily') {
      reportData = await reportGeneratorService.generateDailySummary(agentId);
    } else if (period === 'weekly') {
      reportData = await reportGeneratorService.generateWeeklyReport(agentId);
    } else {
      reportData = await reportGeneratorService.generateMonthlyReport(agentId);
    }

    // Generate email HTML
    const emailHtml = reportGeneratorService.generateEmailSummary(reportData);

    res.setHeader('Content-Type', 'text/html');
    res.send(emailHtml);

    logger.info('Email preview generated', { agentId, period });
  } catch (error) {
    return ErrorResponse.send(
      res,
      error,
      'Failed to generate email preview',
      500,
      { agentId: req.user.id }
    );
  }
};

/**
 * Get line chart data for conversation trends
 * GET /api/analytics/visualizations/conversation-trends
 * Task 4.4, Subtask 3: Line charts for trends (Plan line 1054)
 * 
 * @swagger
 * /api/analytics/visualizations/conversation-trends:
 *   get:
 *     summary: Get conversation trends line chart data
 *     description: Returns time-series data for conversation trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
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
 *         description: Chart data retrieved successfully
 */
export const getConversationTrendsChart = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getConversationTrendsChart(
      agentId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      groupBy as any
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get line chart data for lead quality trends
 * GET /api/analytics/visualizations/lead-quality-trends
 * Task 4.4, Subtask 3: Line charts for trends (Plan line 1054)
 */
export const getLeadQualityTrendsChart = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getLeadQualityTrendsChart(
      agentId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      groupBy as any
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get bar chart data for property type comparison
 * GET /api/analytics/visualizations/property-type-comparison
 * Task 4.4, Subtask 3: Bar charts for comparisons (Plan line 1055)
 */
export const getPropertyTypeComparisonChart = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;

    const data = await visualizationService.getPropertyTypeComparisonChart(agentId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get bar chart data for location comparison
 * GET /api/analytics/visualizations/location-comparison
 * Task 4.4, Subtask 3: Bar charts for comparisons (Plan line 1055)
 */
export const getLocationComparisonChart = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;

    const data = await visualizationService.getLocationComparisonChart(agentId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get pie chart data for lead quality distribution
 * GET /api/analytics/visualizations/lead-quality-distribution
 * Task 4.4, Subtask 3: Pie charts for distributions (Plan line 1056)
 */
export const getLeadQualityDistributionChart = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getLeadQualityDistributionChart(agentId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get pie chart data for conversation status distribution
 * GET /api/analytics/visualizations/conversation-status
 * Task 4.4, Subtask 3: Pie charts for distributions (Plan line 1056)
 */
export const getConversationStatusChart = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getConversationStatusChart(agentId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve chart data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get funnel data for lead journey
 * GET /api/analytics/visualizations/lead-journey-funnel
 * Task 4.4, Subtask 3: Funnel for lead journey (Plan line 1057)
 */
export const getLeadJourneyFunnel = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getLeadJourneyFunnel(agentId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve funnel data', 500, {
      agentId: req.user.id,
    });
  }
};

/**
 * Get heatmap data for peak hours analysis
 * GET /api/analytics/visualizations/peak-hours-heatmap
 * Task 4.4, Subtask 3: Heatmap for peak hours (Plan line 1058)
 */
export const getPeakHoursHeatmap = async (
  req: AuthenticatedRequest<{}, {}, {}, any>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return ErrorResponse.send(
        res,
        new Error('Missing dates'),
        'Start date and end date are required',
        400,
        { agentId }
      );
    }

    const data = await visualizationService.getPeakHoursHeatmap(agentId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve heatmap data', 500, {
      agentId: req.user.id,
    });
  }
};

