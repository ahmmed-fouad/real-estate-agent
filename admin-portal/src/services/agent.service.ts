import apiClient, { handleApiError } from '@/lib/api-client';
import { Agent, AgentSettings, AgentStats } from '@/types';

export const agentService = {
  /**
   * Get agent profile
   */
  async getProfile(): Promise<Agent> {
    try {
      const response = await apiClient.get<{ agent: Agent }>('/agents/profile');
      return response.data.agent;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update agent profile
   */
  async updateProfile(data: Partial<Agent>): Promise<Agent> {
    try {
      const response = await apiClient.put<{ agent: Agent }>('/agents/profile', data);
      return response.data.agent;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get agent statistics
   */
  async getStats(): Promise<AgentStats> {
    try {
      const response = await apiClient.get<AgentStats>('/agents/stats');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update agent settings
   */
  async updateSettings(settings: Partial<AgentSettings>): Promise<AgentSettings> {
    try {
      const response = await apiClient.put<{ settings: AgentSettings }>(
        '/agents/settings',
        settings
      );
      return response.data.settings;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
