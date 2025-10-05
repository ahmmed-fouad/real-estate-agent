import apiClient, { handleApiError } from '@/lib/api-client';
import {
  AnalyticsOverview,
  ConversationMetrics,
  LeadMetrics,
  PropertyMetrics,
} from '@/types';

export const analyticsService = {
  /**
   * Get analytics overview
   */
  async getOverview(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsOverview> {
    try {
      const response = await apiClient.get<AnalyticsOverview>('/analytics/overview', {
        params,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get conversation metrics
   */
  async getConversationMetrics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ConversationMetrics[]> {
    try {
      const response = await apiClient.get<{ metrics: ConversationMetrics[] }>(
        '/analytics/conversations',
        { params }
      );
      return response.data.metrics;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get lead metrics
   */
  async getLeadMetrics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<LeadMetrics[]> {
    try {
      const response = await apiClient.get<{ metrics: LeadMetrics[] }>('/analytics/leads', {
        params,
      });
      return response.data.metrics;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get property performance metrics
   */
  async getPropertyMetrics(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<PropertyMetrics[]> {
    try {
      const response = await apiClient.get<{ metrics: PropertyMetrics[] }>(
        '/analytics/properties',
        { params }
      );
      return response.data.metrics;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get customer inquiry topics
   */
  async getInquiryTopics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ topics: import('@/types').InquiryTopic[]; totalIntents: number }> {
    try {
      const response = await apiClient.get<{
        topics: import('@/types').InquiryTopic[];
        totalIntents: number;
      }>('/analytics/topics', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Export analytics report
   */
  async exportReport(params: {
    startDate: string;
    endDate: string;
    format: 'pdf' | 'excel';
  }): Promise<Blob> {
    try {
      const response = await apiClient.get('/analytics/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
