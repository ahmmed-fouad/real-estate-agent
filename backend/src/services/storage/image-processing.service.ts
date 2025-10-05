/**
 * Image Processing Service
 * Task 3.3, Subtask 5: Image & Document Handling (lines 893-897)
 * 
 * Features:
 * - Generate thumbnails for images (line 895)
 * - Resize images
 * - Optimize images
 * - Convert formats
 * 
 * Dependencies: npm install sharp
 */

import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('ImageProcessing');

// Dynamic import of sharp (optional dependency)
let sharp: any;
try {
  sharp = require('sharp');
  logger.info('Sharp library loaded successfully');
} catch (error) {
  logger.warn('Sharp library not available. Image processing features will be limited.');
  logger.warn('Install with: npm install sharp');
}

/**
 * Image processing result
 */
export interface ImageProcessingResult {
  success: boolean;
  buffer?: Buffer;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  error?: string;
}

/**
 * Thumbnail options
 */
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Image Processing Service
 * Handles image manipulation and thumbnail generation
 */
export class ImageProcessingService {
  private readonly DEFAULT_THUMBNAIL_WIDTH = 300;
  private readonly DEFAULT_THUMBNAIL_HEIGHT = 300;
  private readonly DEFAULT_QUALITY = 80;

  /**
   * Check if Sharp is available
   */
  isAvailable(): boolean {
    return !!sharp;
  }

  /**
   * Generate thumbnail from image buffer
   * Task 3.3, Subtask 5: Generate thumbnails for images (line 895)
   * 
   * @param imageBuffer - Original image buffer
   * @param options - Thumbnail options
   * @returns Processed image result
   */
  async generateThumbnail(
    imageBuffer: Buffer,
    options?: ThumbnailOptions
  ): Promise<ImageProcessingResult> {
    if (!sharp) {
      return {
        success: false,
        error: 'Sharp library not available. Please install: npm install sharp',
      };
    }

    try {
      const width = options?.width || this.DEFAULT_THUMBNAIL_WIDTH;
      const height = options?.height || this.DEFAULT_THUMBNAIL_HEIGHT;
      const quality = options?.quality || this.DEFAULT_QUALITY;
      const fit = options?.fit || 'cover';
      const format = options?.format || 'jpeg';

      logger.debug('Generating thumbnail', {
        width,
        height,
        format,
        originalSize: imageBuffer.length,
      });

      let processor = sharp(imageBuffer)
        .resize(width, height, {
          fit,
          withoutEnlargement: true,
        });

      // Apply format-specific processing
      switch (format) {
        case 'jpeg':
          processor = processor.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          processor = processor.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
      }

      const buffer = await processor.toBuffer();
      const metadata = await sharp(buffer).metadata();

      logger.info('Thumbnail generated successfully', {
        originalSize: imageBuffer.length,
        thumbnailSize: buffer.length,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        reduction: `${((1 - buffer.length / imageBuffer.length) * 100).toFixed(1)}%`,
      });

      return {
        success: true,
        buffer,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Error generating thumbnail', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate multiple thumbnail sizes
   * 
   * @param imageBuffer - Original image buffer
   * @param sizes - Array of thumbnail sizes
   * @returns Array of processed images
   */
  async generateMultipleThumbnails(
    imageBuffer: Buffer,
    sizes: Array<{ name: string; width: number; height: number }>
  ): Promise<Array<{ name: string; result: ImageProcessingResult }>> {
    if (!sharp) {
      return sizes.map((size) => ({
        name: size.name,
        result: {
          success: false,
          error: 'Sharp library not available',
        },
      }));
    }

    logger.info('Generating multiple thumbnails', {
      count: sizes.length,
      sizes: sizes.map((s) => `${s.name} (${s.width}x${s.height})`),
    });

    const results = await Promise.all(
      sizes.map(async (size) => ({
        name: size.name,
        result: await this.generateThumbnail(imageBuffer, {
          width: size.width,
          height: size.height,
        }),
      }))
    );

    const successful = results.filter((r) => r.result.success).length;
    logger.info('Multiple thumbnails generated', {
      total: sizes.length,
      successful,
      failed: sizes.length - successful,
    });

    return results;
  }

  /**
   * Optimize image without resizing
   * 
   * @param imageBuffer - Original image buffer
   * @param quality - Quality (0-100)
   * @returns Optimized image result
   */
  async optimizeImage(imageBuffer: Buffer, quality: number = 85): Promise<ImageProcessingResult> {
    if (!sharp) {
      return {
        success: false,
        error: 'Sharp library not available',
      };
    }

    try {
      logger.debug('Optimizing image', {
        originalSize: imageBuffer.length,
        quality,
      });

      const metadata = await sharp(imageBuffer).metadata();
      let processor = sharp(imageBuffer);

      // Apply format-specific optimization
      switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
          processor = processor.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          processor = processor.png({ quality: Math.round((quality / 100) * 9), compressionLevel: 9 });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
        default:
          // Keep original format
          break;
      }

      const buffer = await processor.toBuffer();
      const newMetadata = await sharp(buffer).metadata();

      logger.info('Image optimized successfully', {
        originalSize: imageBuffer.length,
        optimizedSize: buffer.length,
        reduction: `${((1 - buffer.length / imageBuffer.length) * 100).toFixed(1)}%`,
      });

      return {
        success: true,
        buffer,
        width: newMetadata.width,
        height: newMetadata.height,
        format: newMetadata.format,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Error optimizing image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert image format
   * 
   * @param imageBuffer - Original image buffer
   * @param targetFormat - Target format
   * @param quality - Quality (0-100)
   * @returns Converted image result
   */
  async convertFormat(
    imageBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<ImageProcessingResult> {
    if (!sharp) {
      return {
        success: false,
        error: 'Sharp library not available',
      };
    }

    try {
      logger.debug('Converting image format', {
        targetFormat,
        quality,
      });

      let processor = sharp(imageBuffer);

      switch (targetFormat) {
        case 'jpeg':
          processor = processor.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          processor = processor.png({ quality: Math.round((quality / 100) * 9) });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
      }

      const buffer = await processor.toBuffer();
      const metadata = await sharp(buffer).metadata();

      logger.info('Image format converted successfully', {
        targetFormat,
        size: buffer.length,
      });

      return {
        success: true,
        buffer,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Error converting image format', {
        error: error instanceof Error ? error.message : 'Unknown error',
        targetFormat,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get image metadata
   * 
   * @param imageBuffer - Image buffer
   * @returns Image metadata
   */
  async getMetadata(imageBuffer: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
    size: number;
    space?: string;
    channels?: number;
    hasAlpha?: boolean;
  } | null> {
    if (!sharp) {
      logger.warn('Sharp not available, cannot get metadata');
      return null;
    }

    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        space: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
      };
    } catch (error) {
      logger.error('Error getting image metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();
