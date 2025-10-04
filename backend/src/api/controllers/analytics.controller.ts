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
} from '../validators/analytics.validators';

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

