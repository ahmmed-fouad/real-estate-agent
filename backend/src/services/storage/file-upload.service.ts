/**
 * File Upload Service
 * Handles file uploads to Supabase Storage
 * Fixes critical issue: Missing image/document upload endpoints
 */

import { supabase } from '../../config/supabase.config';
import { createServiceLogger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const logger = createServiceLogger('FileUploadService');

/**
 * Supabase Storage Configuration
 */
const STORAGE_CONFIG = {
  bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'real-estate-files',
  imagesBucket: process.env.SUPABASE_IMAGES_BUCKET || 'property-images',
  documentsBucket: process.env.SUPABASE_DOCUMENTS_BUCKET || 'property-documents',
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxDocumentSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export class FileUploadService {
  /**
   * Upload property images to Supabase Storage
   * 
   * @param files - Array of image file buffers
   * @param agentId - Agent ID for organizing files
   * @returns Array of public URLs
   */
  async uploadImages(
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string; size: number }>,
    agentId: string
  ): Promise<UploadResult[]> {
    try {
      logger.info('Uploading images', {
        agentId,
        count: files.length,
      });

      // Validate files
      for (const file of files) {
        if (!STORAGE_CONFIG.allowedImageTypes.includes(file.mimetype)) {
          throw new Error(`Invalid image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`);
        }

        if (file.size > STORAGE_CONFIG.maxImageSize) {
          throw new Error(`Image too large: ${file.originalname}. Max size: 5MB`);
        }
      }

      // Upload files
      const uploadResults: UploadResult[] = [];

      for (const file of files) {
        const fileExt = path.extname(file.originalname);
        const fileName = `${agentId}/${uuidv4()}${fileExt}`;

        const { data, error } = await supabase.storage
          .from(STORAGE_CONFIG.imagesBucket)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          logger.error('Image upload failed', {
            fileName,
            error: error.message,
          });
          throw new Error(`Failed to upload ${file.originalname}: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_CONFIG.imagesBucket)
          .getPublicUrl(data.path);

        uploadResults.push({
          url: urlData.publicUrl,
          path: data.path,
          size: file.size,
          mimeType: file.mimetype,
        });

        logger.info('Image uploaded successfully', {
          fileName,
          url: urlData.publicUrl,
        });
      }

      logger.info('All images uploaded successfully', {
        agentId,
        count: uploadResults.length,
      });

      return uploadResults;
    } catch (error) {
      logger.error('Image upload service error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Upload property documents to Supabase Storage
   * 
   * @param files - Array of document file buffers
   * @param agentId - Agent ID for organizing files
   * @returns Array of public URLs
   */
  async uploadDocuments(
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string; size: number }>,
    agentId: string
  ): Promise<UploadResult[]> {
    try {
      logger.info('Uploading documents', {
        agentId,
        count: files.length,
      });

      // Validate files
      for (const file of files) {
        if (!STORAGE_CONFIG.allowedDocumentTypes.includes(file.mimetype)) {
          throw new Error(
            `Invalid document type: ${file.mimetype}. Allowed: PDF, DOC, DOCX`
          );
        }

        if (file.size > STORAGE_CONFIG.maxDocumentSize) {
          throw new Error(`Document too large: ${file.originalname}. Max size: 10MB`);
        }
      }

      // Upload files
      const uploadResults: UploadResult[] = [];

      for (const file of files) {
        const fileExt = path.extname(file.originalname);
        const fileName = `${agentId}/${uuidv4()}${fileExt}`;

        const { data, error } = await supabase.storage
          .from(STORAGE_CONFIG.documentsBucket)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          logger.error('Document upload failed', {
            fileName,
            error: error.message,
          });
          throw new Error(`Failed to upload ${file.originalname}: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_CONFIG.documentsBucket)
          .getPublicUrl(data.path);

        uploadResults.push({
          url: urlData.publicUrl,
          path: data.path,
          size: file.size,
          mimeType: file.mimetype,
        });

        logger.info('Document uploaded successfully', {
          fileName,
          url: urlData.publicUrl,
        });
      }

      logger.info('All documents uploaded successfully', {
        agentId,
        count: uploadResults.length,
      });

      return uploadResults;
    } catch (error) {
      logger.error('Document upload service error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   * 
   * @param filePath - File path in storage
   * @param bucket - Bucket name
   */
  async deleteFile(filePath: string, bucket: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        logger.error('File deletion failed', {
          filePath,
          bucket,
          error: error.message,
        });
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      logger.info('File deleted successfully', { filePath, bucket });
    } catch (error) {
      logger.error('Delete file service error', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Ensure storage buckets exist
   * Should be called on application startup
   */
  async ensureBucketsExist(): Promise<void> {
    try {
      const buckets = [STORAGE_CONFIG.imagesBucket, STORAGE_CONFIG.documentsBucket];

      for (const bucketName of buckets) {
        const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
          logger.warn('Could not list buckets', { error: listError.message });
          continue;
        }

        const bucketExists = existingBuckets?.some((b) => b.name === bucketName);

        if (!bucketExists) {
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: bucketName === STORAGE_CONFIG.imagesBucket ? 5242880 : 10485760,
          });

          if (createError) {
            logger.error('Failed to create bucket', {
              bucketName,
              error: createError.message,
            });
          } else {
            logger.info('Bucket created successfully', { bucketName });
          }
        } else {
          logger.info('Bucket already exists', { bucketName });
        }
      }
    } catch (error) {
      logger.error('Bucket setup error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
