/**
 * Visualization Data Service
 * Task 4.4, Subtask 3: Dashboard Visualizations (Plan lines 1053-1058)
 * 
 * Prepares data for various chart types:
 * - Line charts for trends
 * - Bar charts for comparisons
 * - Pie charts for distributions
 * - Funnel for lead journey
 * - Heatmap for peak hours
 */

import { createServiceLogger } from '../../utils/logger';
import { prisma } from '../../config/prisma-client';
import { Prisma } from '@prisma/client';

const logger = createServiceLogger('VisualizationService');

/**
 * Date range for visualizations
 */
export interface VisualizationDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Line chart data point
 */
export interface LineChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Line chart series
 */
export interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
}

/**
 * Bar chart data point
 */
export interface BarChartDataPoint {
  category: string;
  value: number;
  color?: string;
}

/**
 * Pie chart data point
 */
export interface PieChartDataPoint {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

/**
 * Funnel stage data
 */
export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversionRate?: number;
}

/**
 * Heatmap cell data
 */
export interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
  label?: string;
}

export class VisualizationService {
  /**
   * Get line chart data for conversation trends
   * Task 4.4, Subtask 3: Line charts for trends (Plan line 1054)
   */
  async getConversationTrendsChart(
    agentId: string,
    dateRange: VisualizationDateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<LineChartSeries[]> {
    logger.info('Generating conversation trends chart', { agentId, groupBy });

    const conversations = await prisma.conversation.findMany({
      where: {
        agentId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        leadQuality: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group conversations by date
    const groupedData = this.groupByDate(conversations, groupBy, 'createdAt');

    // Create series for different metrics
    const series: LineChartSeries[] = [
      {
        name: 'Total Conversations',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.length,
        })),
        color: '#4F46E5', // Indigo
      },
      {
        name: 'Active Conversations',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.filter((i: any) => i.status === 'active').length,
        })),
        color: '#10B981', // Green
      },
      {
        name: 'Closed Conversations',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.filter((i: any) => i.status === 'closed').length,
        })),
        color: '#6B7280', // Gray
      },
    ];

    logger.info('Conversation trends chart generated', {
      agentId,
      dataPoints: series[0].data.length,
    });

    return series;
  }

  /**
   * Get line chart data for lead quality trends
   * Task 4.4, Subtask 3: Line charts for trends (Plan line 1054)
   */
  async getLeadQualityTrendsChart(
    agentId: string,
    dateRange: VisualizationDateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<LineChartSeries[]> {
    logger.info('Generating lead quality trends chart', { agentId, groupBy });

    const conversations = await prisma.conversation.findMany({
      where: {
        agentId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        leadQuality: { not: null },
      },
      select: {
        createdAt: true,
        leadQuality: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date
    const groupedData = this.groupByDate(conversations, groupBy, 'createdAt');

    // Create series for each quality level
    const series: LineChartSeries[] = [
      {
        name: 'Hot Leads',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.filter((i: any) => i.leadQuality === 'hot').length,
        })),
        color: '#EF4444', // Red
      },
      {
        name: 'Warm Leads',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.filter((i: any) => i.leadQuality === 'warm').length,
        })),
        color: '#F59E0B', // Amber
      },
      {
        name: 'Cold Leads',
        data: Object.entries(groupedData).map(([date, items]) => ({
          date,
          value: items.filter((i: any) => i.leadQuality === 'cold').length,
        })),
        color: '#3B82F6', // Blue
      },
    ];

    return series;
  }

  /**
   * Get bar chart data for property type comparison
   * Task 4.4, Subtask 3: Bar charts for comparisons (Plan line 1055)
   */
  async getPropertyTypeComparisonChart(agentId: string): Promise<BarChartDataPoint[]> {
    logger.info('Generating property type comparison chart', { agentId });

    const propertyTypes = await prisma.property.groupBy({
      by: ['propertyType'],
      where: { agentId },
      _count: true,
    });

    const data: BarChartDataPoint[] = propertyTypes.map((pt) => ({
      category: this.formatPropertyType(pt.propertyType),
      value: pt._count,
      color: this.getPropertyTypeColor(pt.propertyType),
    }));

    // Sort by value descending
    data.sort((a, b) => b.value - a.value);

    return data;
  }

  /**
   * Get bar chart data for location comparison
   * Task 4.4, Subtask 3: Bar charts for comparisons (Plan line 1055)
   */
  async getLocationComparisonChart(agentId: string): Promise<BarChartDataPoint[]> {
    logger.info('Generating location comparison chart', { agentId });

    const locations = await prisma.property.groupBy({
      by: ['city'],
      where: { agentId },
      _count: true,
    });

    const data: BarChartDataPoint[] = locations.map((loc) => ({
      category: loc.city,
      value: loc._count,
    }));

    // Sort by value descending
    data.sort((a, b) => b.value - a.value);

    // Take top 10
    return data.slice(0, 10);
  }

  /**
   * Get pie chart data for lead quality distribution
   * Task 4.4, Subtask 3: Pie charts for distributions (Plan line 1056)
   */
  async getLeadQualityDistributionChart(
    agentId: string,
    dateRange: VisualizationDateRange
  ): Promise<PieChartDataPoint[]> {
    logger.info('Generating lead quality distribution chart', { agentId });

    const leadQuality = await prisma.conversation.groupBy({
      by: ['leadQuality'],
      where: {
        agentId,
        leadQuality: { not: null },
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _count: true,
    });

    const total = leadQuality.reduce((sum, lq) => sum + lq._count, 0);

    const data: PieChartDataPoint[] = leadQuality
      .filter((lq) => lq.leadQuality !== null)
      .map((lq) => ({
        label: this.formatLeadQuality(lq.leadQuality!),
        value: lq._count,
        percentage: total > 0 ? parseFloat(((lq._count / total) * 100).toFixed(1)) : 0,
        color: this.getLeadQualityColor(lq.leadQuality!),
      }));

    return data;
  }

  /**
   * Get pie chart data for conversation status distribution
   * Task 4.4, Subtask 3: Pie charts for distributions (Plan line 1056)
   */
  async getConversationStatusChart(
    agentId: string,
    dateRange: VisualizationDateRange
  ): Promise<PieChartDataPoint[]> {
    logger.info('Generating conversation status chart', { agentId });

    const statuses = await prisma.conversation.groupBy({
      by: ['status'],
      where: {
        agentId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _count: true,
    });

    const total = statuses.reduce((sum, s) => sum + s._count, 0);

    const data: PieChartDataPoint[] = statuses.map((s) => ({
      label: this.formatStatus(s.status),
      value: s._count,
      percentage: total > 0 ? parseFloat(((s._count / total) * 100).toFixed(1)) : 0,
      color: this.getStatusColor(s.status),
    }));

    return data;
  }

  /**
   * Get funnel data for lead journey
   * Task 4.4, Subtask 3: Funnel for lead journey (Plan line 1057)
   */
  async getLeadJourneyFunnel(
    agentId: string,
    dateRange: VisualizationDateRange
  ): Promise<FunnelStage[]> {
    logger.info('Generating lead journey funnel', { agentId });

    const dateFilter: Prisma.ConversationWhereInput = {
      agentId,
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    // Get counts for each stage
    const [
      totalContacts,
      conversationsStarted,
      leadsQualified,
      viewingsScheduled,
      viewingsCompleted,
    ] = await Promise.all([
      // Stage 1: Total contacts (all conversations)
      prisma.conversation.count({
        where: dateFilter,
      }),

      // Stage 2: Conversations started (with at least 1 message exchange)
      prisma.conversation.count({
        where: {
          ...dateFilter,
          messages: {
            some: {},
          },
        },
      }),

      // Stage 3: Leads qualified (has lead quality assigned)
      prisma.conversation.count({
        where: {
          ...dateFilter,
          leadQuality: { not: null },
        },
      }),

      // Stage 4: Viewings scheduled
      prisma.conversation.count({
        where: {
          ...dateFilter,
          scheduledViewings: {
            some: {},
          },
        },
      }),

      // Stage 5: Viewings completed
      prisma.conversation.count({
        where: {
          ...dateFilter,
          scheduledViewings: {
            some: {
              status: 'completed',
            },
          },
        },
      }),
    ]);

    // Build funnel stages
    const stages: FunnelStage[] = [
      {
        stage: 'Total Contacts',
        count: totalContacts,
        percentage: 100,
      },
      {
        stage: 'Conversations Started',
        count: conversationsStarted,
        percentage:
          totalContacts > 0 ? parseFloat(((conversationsStarted / totalContacts) * 100).toFixed(1)) : 0,
        conversionRate:
          totalContacts > 0 ? parseFloat(((conversationsStarted / totalContacts) * 100).toFixed(1)) : 0,
      },
      {
        stage: 'Leads Qualified',
        count: leadsQualified,
        percentage:
          totalContacts > 0 ? parseFloat(((leadsQualified / totalContacts) * 100).toFixed(1)) : 0,
        conversionRate:
          conversationsStarted > 0
            ? parseFloat(((leadsQualified / conversationsStarted) * 100).toFixed(1))
            : 0,
      },
      {
        stage: 'Viewings Scheduled',
        count: viewingsScheduled,
        percentage:
          totalContacts > 0 ? parseFloat(((viewingsScheduled / totalContacts) * 100).toFixed(1)) : 0,
        conversionRate:
          leadsQualified > 0
            ? parseFloat(((viewingsScheduled / leadsQualified) * 100).toFixed(1))
            : 0,
      },
      {
        stage: 'Viewings Completed',
        count: viewingsCompleted,
        percentage:
          totalContacts > 0 ? parseFloat(((viewingsCompleted / totalContacts) * 100).toFixed(1)) : 0,
        conversionRate:
          viewingsScheduled > 0
            ? parseFloat(((viewingsCompleted / viewingsScheduled) * 100).toFixed(1))
            : 0,
      },
    ];

    logger.info('Lead journey funnel generated', { agentId, stages: stages.length });

    return stages;
  }

  /**
   * Get heatmap data for peak hours analysis
   * Task 4.4, Subtask 3: Heatmap for peak hours (Plan line 1058)
   */
  async getPeakHoursHeatmap(
    agentId: string,
    dateRange: VisualizationDateRange
  ): Promise<HeatmapCell[]> {
    logger.info('Generating peak hours heatmap', { agentId });

    // Get all messages in date range
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          agentId,
        },
        role: 'user', // Only customer messages
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Initialize heatmap grid (7 days x 24 hours)
    const heatmapData: Map<string, Map<number, number>> = new Map();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    days.forEach((day) => {
      heatmapData.set(day, new Map());
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.get(day)!.set(hour, 0);
      }
    });

    // Count messages per day/hour
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt);
      const day = days[date.getDay()];
      const hour = date.getHours();

      const dayMap = heatmapData.get(day)!;
      dayMap.set(hour, dayMap.get(hour)! + 1);
    });

    // Convert to array format
    const cells: HeatmapCell[] = [];
    days.forEach((day) => {
      const dayMap = heatmapData.get(day)!;
      for (let hour = 0; hour < 24; hour++) {
        cells.push({
          day,
          hour,
          value: dayMap.get(hour)!,
          label: `${day} ${hour}:00`,
        });
      }
    });

    logger.info('Peak hours heatmap generated', {
      agentId,
      totalCells: cells.length,
      totalMessages: messages.length,
    });

    return cells;
  }

  /**
   * Helper: Group data by date period
   */
  private groupByDate(
    items: Array<any>,
    groupBy: 'day' | 'week' | 'month',
    dateField: string
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    items.forEach((item) => {
      const date = new Date(item[dateField]);
      let key: string;

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

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }

  /**
   * Helper: Format property type
   */
  private formatPropertyType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Helper: Format lead quality
   */
  private formatLeadQuality(quality: string): string {
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  }

  /**
   * Helper: Format status
   */
  private formatStatus(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Helper: Get color for property type
   */
  private getPropertyTypeColor(type: string): string {
    const colors: Record<string, string> = {
      apartment: '#3B82F6',
      villa: '#10B981',
      townhouse: '#F59E0B',
      penthouse: '#8B5CF6',
      studio: '#EC4899',
    };
    return colors[type.toLowerCase()] || '#6B7280';
  }

  /**
   * Helper: Get color for lead quality
   */
  private getLeadQualityColor(quality: string): string {
    const colors: Record<string, string> = {
      hot: '#EF4444',
      warm: '#F59E0B',
      cold: '#3B82F6',
    };
    return colors[quality.toLowerCase()] || '#6B7280';
  }

  /**
   * Helper: Get color for status
   */
  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10B981',
      idle: '#F59E0B',
      closed: '#6B7280',
      waiting_agent: '#EF4444',
    };
    return colors[status] || '#6B7280';
  }
}

// Export singleton instance
export const visualizationService = new VisualizationService();
