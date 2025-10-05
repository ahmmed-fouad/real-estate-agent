/**
 * Analytics Service
 * Task 4.4, Subtask 1: Metrics to Track (Plan lines 1025-1044)
 * 
 * Calculates detailed analytics metrics:
 * - Conversation metrics (response time, resolution rate, escalation rate)
 * - Lead metrics (conversion rate, source tracking)
 * - Customer metrics (response rate, drop-off points, return customers)
 * - Property metrics (inquiry to viewing ratio)
 */

import { Prisma } from '@prisma/client';
import { createServiceLogger } from '../../utils/logger';
import { prisma } from '../../config/prisma-client';

const logger = createServiceLogger('AnalyticsService');

/**
 * Date range filter type
 */
export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Conversation Metrics (Plan lines 1026-1031)
 */
export interface ConversationMetrics {
  totalConversations: number;
  averageResponseTime: number; // in seconds
  conversationLength: number; // average messages
  resolutionRate: number; // percentage
  escalationRate: number; // percentage
}

/**
 * Lead Metrics (Plan lines 1032-1036)
 */
export interface LeadMetrics {
  newLeads: number;
  leadQualityDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  conversionRate: number; // percentage (leads to viewings)
  leadSource: Record<string, number>; // source: count
}

/**
 * Property Metrics (Plan lines 1037-1040)
 */
export interface PropertyMetrics {
  mostInquiredProperties: Array<{
    propertyId: string;
    propertyName: string;
    inquiryCount: number;
  }>;
  propertiesWithNoInquiries: number;
  inquiryToViewingRatio: number; // percentage
}

/**
 * Customer Metrics (Plan lines 1041-1044)
 */
export interface CustomerMetrics {
  responseRate: number; // percentage (customers who respond)
  dropOffPoints: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  returnCustomers: number;
  uniqueCustomers: number;
}

export class AnalyticsService {
  /**
   * Calculate conversation metrics
   * Plan lines 1027-1031
   */
  async calculateConversationMetrics(
    agentId: string,
    dateRange: DateRange
  ): Promise<ConversationMetrics> {
    logger.info('Calculating conversation metrics', { agentId, dateRange });

    const dateFilter = this.buildDateFilter(dateRange);

    // Get conversations with messages
    const conversations = await prisma.conversation.findMany({
      where: {
        agentId,
        ...dateFilter,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            createdAt: true,
          },
        },
      },
    });

    // Total conversations
    const totalConversations = conversations.length;

    // Calculate average response time (time between customer message and assistant response)
    let totalResponseTime = 0;
    let responseCount = 0;

    conversations.forEach((conv) => {
      for (let i = 0; i < conv.messages.length - 1; i++) {
        if (conv.messages[i].role === 'user' && conv.messages[i + 1].role === 'assistant') {
          const responseTime =
            conv.messages[i + 1].createdAt.getTime() - conv.messages[i].createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });

    const averageResponseTime =
      responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0; // Convert to seconds

    // Calculate conversation length (average messages per conversation)
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const conversationLength = totalConversations > 0 ? totalMessages / totalConversations : 0;

    // Calculate resolution rate (closed conversations / total)
    const closedConversations = conversations.filter((c) => c.status === 'closed').length;
    const resolutionRate =
      totalConversations > 0 ? (closedConversations / totalConversations) * 100 : 0;

    // Calculate escalation rate (waiting_agent conversations / total)
    const escalatedConversations = conversations.filter(
      (c) => c.status === 'waiting_agent'
    ).length;
    const escalationRate =
      totalConversations > 0 ? (escalatedConversations / totalConversations) * 100 : 0;

    logger.info('Conversation metrics calculated', {
      agentId,
      totalConversations,
      averageResponseTime,
    });

    return {
      totalConversations,
      averageResponseTime,
      conversationLength: parseFloat(conversationLength.toFixed(2)),
      resolutionRate: parseFloat(resolutionRate.toFixed(2)),
      escalationRate: parseFloat(escalationRate.toFixed(2)),
    };
  }

  /**
   * Calculate lead metrics
   * Plan lines 1033-1036
   */
  async calculateLeadMetrics(agentId: string, dateRange: DateRange): Promise<LeadMetrics> {
    logger.info('Calculating lead metrics', { agentId, dateRange });

    const dateFilter = this.buildDateFilter(dateRange);

    // Get all leads (conversations) in date range
    const leads = await prisma.conversation.findMany({
      where: {
        agentId,
        ...dateFilter,
      },
      select: {
        id: true,
        leadQuality: true,
        metadata: true,
        scheduledViewings: {
          select: { id: true },
        },
      },
    });

    const newLeads = leads.length;

    // Lead quality distribution
    const leadQualityDistribution = {
      hot: leads.filter((l) => l.leadQuality === 'hot').length,
      warm: leads.filter((l) => l.leadQuality === 'warm').length,
      cold: leads.filter((l) => l.leadQuality === 'cold').length,
    };

    // Conversion rate (leads that scheduled at least one viewing)
    const leadsWithViewings = leads.filter((l) => l.scheduledViewings.length > 0).length;
    const conversionRate = newLeads > 0 ? (leadsWithViewings / newLeads) * 100 : 0;

    // Lead source (from metadata if available)
    const leadSource: Record<string, number> = {};
    leads.forEach((lead) => {
      const metadata = lead.metadata as any;
      const source = metadata?.source || 'direct';
      leadSource[source] = (leadSource[source] || 0) + 1;
    });

    logger.info('Lead metrics calculated', { agentId, newLeads, conversionRate });

    return {
      newLeads,
      leadQualityDistribution,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      leadSource,
    };
  }

  /**
   * Calculate property metrics
   * Plan lines 1038-1040
   */
  async calculatePropertyMetrics(
    agentId: string,
    dateRange: DateRange
  ): Promise<PropertyMetrics> {
    logger.info('Calculating property metrics', { agentId, dateRange });

    // Get properties with inquiry counts (messages mentioning property + scheduled viewings)
    const properties = await prisma.property.findMany({
      where: { agentId },
      select: {
        id: true,
        projectName: true,
        _count: {
          select: {
            scheduledViewings: true,
          },
        },
      },
    });

    // Most inquired properties (based on scheduled viewings as proxy for inquiries)
    const mostInquiredProperties = properties
      .filter((p) => p._count.scheduledViewings > 0)
      .sort((a, b) => b._count.scheduledViewings - a._count.scheduledViewings)
      .slice(0, 10)
      .map((p) => ({
        propertyId: p.id,
        propertyName: p.projectName,
        inquiryCount: p._count.scheduledViewings,
      }));

    // Properties with no inquiries
    const propertiesWithNoInquiries = properties.filter(
      (p) => p._count.scheduledViewings === 0
    ).length;

    // Inquiry to viewing ratio
    // We'll consider total viewings scheduled vs total conversations as inquiry ratio
    const dateFilter = this.buildDateFilter(dateRange);
    const [totalInquiries, totalViewings] = await Promise.all([
      prisma.conversation.count({
        where: { agentId, ...dateFilter },
      }),
      prisma.scheduledViewing.count({
        where: { agentId },
      }),
    ]);

    const inquiryToViewingRatio =
      totalInquiries > 0 ? (totalViewings / totalInquiries) * 100 : 0;

    logger.info('Property metrics calculated', {
      agentId,
      propertiesWithNoInquiries,
      inquiryToViewingRatio,
    });

    return {
      mostInquiredProperties,
      propertiesWithNoInquiries,
      inquiryToViewingRatio: parseFloat(inquiryToViewingRatio.toFixed(2)),
    };
  }

  /**
   * Calculate customer metrics
   * Plan lines 1042-1044
   */
  async calculateCustomerMetrics(
    agentId: string,
    dateRange: DateRange
  ): Promise<CustomerMetrics> {
    logger.info('Calculating customer metrics', { agentId, dateRange });

    const dateFilter = this.buildDateFilter(dateRange);

    // Get all conversations with messages
    const conversations = await prisma.conversation.findMany({
      where: {
        agentId,
        ...dateFilter,
      },
      select: {
        customerPhone: true,
        status: true,
        messages: {
          select: {
            role: true,
          },
        },
      },
    });

    // Unique customers
    const uniqueCustomers = new Set(conversations.map((c) => c.customerPhone)).size;

    // Response rate (conversations where customer sent at least one message)
    const conversationsWithCustomerMessages = conversations.filter((c) =>
      c.messages.some((m) => m.role === 'user')
    ).length;
    const responseRate =
      conversations.length > 0 ? (conversationsWithCustomerMessages / conversations.length) * 100 : 0;

    // Drop-off points (where conversations end based on status)
    const dropOffPoints = [
      {
        stage: 'New (no messages)',
        count: conversations.filter((c) => c.messages.length === 0).length,
        percentage: 0,
      },
      {
        stage: 'Active (1-5 messages)',
        count: conversations.filter((c) => c.messages.length >= 1 && c.messages.length <= 5).length,
        percentage: 0,
      },
      {
        stage: 'Engaged (6-15 messages)',
        count: conversations.filter((c) => c.messages.length >= 6 && c.messages.length <= 15)
          .length,
        percentage: 0,
      },
      {
        stage: 'Deep (16+ messages)',
        count: conversations.filter((c) => c.messages.length >= 16).length,
        percentage: 0,
      },
      {
        stage: 'Idle',
        count: conversations.filter((c) => c.status === 'idle').length,
        percentage: 0,
      },
      {
        stage: 'Closed',
        count: conversations.filter((c) => c.status === 'closed').length,
        percentage: 0,
      },
    ];

    // Calculate percentages
    dropOffPoints.forEach((point) => {
      point.percentage =
        conversations.length > 0
          ? parseFloat(((point.count / conversations.length) * 100).toFixed(2))
          : 0;
    });

    // Return customers (customers who had conversations BEFORE the date range AND within it)
    // Task 4.4: Fixed return customers calculation with performance optimization
    let returnCustomers = 0;
    
    if (dateRange.startDate) {
      // Get unique customer phones from current period
      const currentCustomerPhones = Array.from(new Set(conversations.map((c) => c.customerPhone)));
      
      // Optimized: Single query to find customers with previous conversations
      if (currentCustomerPhones.length > 0) {
        const previousConversations = await prisma.conversation.groupBy({
          by: ['customerPhone'],
          where: {
            agentId,
            customerPhone: { in: currentCustomerPhones },
            createdAt: {
              lt: dateRange.startDate!, // Conversations before the start date
            },
          },
          _count: true,
        });
        
        returnCustomers = previousConversations.length;
      }
    }

    logger.info('Customer metrics calculated', {
      agentId,
      uniqueCustomers,
      returnCustomers,
    });

    return {
      responseRate: parseFloat(responseRate.toFixed(2)),
      dropOffPoints,
      returnCustomers,
      uniqueCustomers,
    };
  }

  /**
   * Get comprehensive analytics (all metrics combined)
   */
  async getComprehensiveAnalytics(agentId: string, dateRange: DateRange) {
    logger.info('Getting comprehensive analytics', { agentId, dateRange });

    const [conversationMetrics, leadMetrics, propertyMetrics, customerMetrics] =
      await Promise.all([
        this.calculateConversationMetrics(agentId, dateRange),
        this.calculateLeadMetrics(agentId, dateRange),
        this.calculatePropertyMetrics(agentId, dateRange),
        this.calculateCustomerMetrics(agentId, dateRange),
      ]);

    return {
      conversationMetrics,
      leadMetrics,
      propertyMetrics,
      customerMetrics,
      dateRange: {
        startDate: dateRange.startDate?.toISOString(),
        endDate: dateRange.endDate?.toISOString(),
      },
    };
  }

  /**
   * Helper: Build Prisma date filter
   */
  private buildDateFilter(dateRange: DateRange): Prisma.ConversationWhereInput {
    if (!dateRange.startDate && !dateRange.endDate) {
      return {};
    }

    return {
      createdAt: {
        ...(dateRange.startDate && { gte: dateRange.startDate }),
        ...(dateRange.endDate && { lte: dateRange.endDate }),
      },
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
