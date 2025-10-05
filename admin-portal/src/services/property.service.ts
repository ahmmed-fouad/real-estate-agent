import apiClient, { handleApiError } from '@/lib/api-client';
import { Property, PropertyFormData, PaginatedResponse } from '@/types';

export const propertyService = {
  /**
   * Get all properties with pagination and filters
   */
  async getProperties(params?: {
    page?: number;
    limit?: number;
    search?: string;
    propertyType?: string;
    status?: string;
  }): Promise<PaginatedResponse<Property>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Property>>('/properties', {
        params,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get property by ID
   */
  async getProperty(id: string): Promise<Property> {
    try {
      const response = await apiClient.get<{ property: Property }>(`/properties/${id}`);
      return response.data.property;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new property
   */
  async createProperty(data: PropertyFormData): Promise<Property> {
    try {
      const response = await apiClient.post<{ property: Property }>('/properties', data);
      return response.data.property;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update property
   */
  async updateProperty(id: string, data: Partial<PropertyFormData>): Promise<Property> {
    try {
      const response = await apiClient.put<{ property: Property }>(`/properties/${id}`, data);
      return response.data.property;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete property
   */
  async deleteProperty(id: string): Promise<void> {
    try {
      await apiClient.delete(`/properties/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Bulk upload properties
   */
  async bulkUpload(data: PropertyFormData[]): Promise<{
    success: number;
    failed: number;
    errors: { index: number; error: string }[];
  }> {
    try {
      const response = await apiClient.post<{
        success: number;
        failed: number;
        errors: { index: number; error: string }[];
      }>('/properties/bulk-upload', { properties: data });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Upload property images
   */
  async uploadImages(files: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await apiClient.post<{ urls: string[] }>(
        '/properties/upload-images',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.urls;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Upload property documents
   */
  async uploadDocuments(files: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));

      const response = await apiClient.post<{ urls: string[] }>(
        '/properties/upload-documents',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.urls;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
