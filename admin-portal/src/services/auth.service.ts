import apiClient, { handleApiError } from '@/lib/api-client';
import { Agent, AuthResponse, LoginCredentials, RegisterData } from '@/types';

export const authService = {
  /**
   * Register a new agent
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Login agent
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Logout agent
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get current agent
   */
  async getCurrentAgent(): Promise<Agent> {
    try {
      const response = await apiClient.get<{ agent: Agent }>('/auth/me');
      return response.data.agent;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', { oldPassword, newPassword });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const response = await apiClient.post<{ accessToken: string }>('/auth/refresh-token', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
