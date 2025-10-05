import apiClient, { handleApiError } from '@/lib/api-client';
import { Conversation, ConversationWithMessages, PaginatedResponse } from '@/types';

export const conversationService = {
  /**
   * Get all conversations with pagination and filters
   */
  async getConversations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    leadQuality?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Conversation>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Conversation>>('/conversations', {
        params,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get conversation by ID with messages
   */
  async getConversation(id: string): Promise<ConversationWithMessages> {
    try {
      const response = await apiClient.get<{ conversation: ConversationWithMessages }>(
        `/conversations/${id}`
      );
      return response.data.conversation;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Takeover conversation (agent takes control)
   */
  async takeoverConversation(id: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${id}/takeover`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Close conversation
   */
  async closeConversation(id: string, notes?: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${id}/close`, { notes });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Export conversation transcript
   */
  async exportConversation(
    id: string,
    format: 'json' | 'text' | 'csv' = 'json'
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(`/conversations/${id}/export`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Send message as agent (during takeover)
   */
  async sendMessage(conversationId: string, content: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${conversationId}/messages`, { content });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
