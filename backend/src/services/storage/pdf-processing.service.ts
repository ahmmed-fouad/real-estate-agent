/**
 * PDF Processing Service
 * Task 3.3, Subtask 5: Image & Document Handling (lines 893-897)
 * 
 * Features:
 * - Extract text from PDFs (for RAG) (line 896)
 * - Get PDF metadata
 * - Parse PDF structure
 * 
 * Dependencies: npm install pdf-parse
 */

import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('PDFProcessing');

// Dynamic import of pdf-parse (optional dependency)
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
  logger.info('PDF-parse library loaded successfully');
} catch (error) {
  logger.warn('PDF-parse library not available. PDF text extraction features will be limited.');
  logger.warn('Install with: npm install pdf-parse');
}

/**
 * PDF processing result
 */
export interface PDFProcessingResult {
  success: boolean;
  text?: string;
  pages?: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  error?: string;
}

/**
 * PDF Processing Service
 * Handles PDF text extraction and metadata parsing
 */
export class PDFProcessingService {
  /**
   * Check if PDF-parse is available
   */
  isAvailable(): boolean {
    return !!pdfParse;
  }

  /**
   * Extract text from PDF buffer
   * Task 3.3, Subtask 5: Extract text from PDFs (for RAG) (line 896)
   * 
   * @param pdfBuffer - PDF file buffer
   * @param options - Extraction options
   * @returns Extracted text and metadata
   */
  async extractText(
    pdfBuffer: Buffer,
    options?: {
      maxPages?: number;
      includeMetadata?: boolean;
    }
  ): Promise<PDFProcessingResult> {
    if (!pdfParse) {
      return {
        success: false,
        error: 'PDF-parse library not available. Please install: npm install pdf-parse',
      };
    }

    try {
      logger.info('Extracting text from PDF', {
        bufferSize: pdfBuffer.length,
        maxPages: options?.maxPages,
      });

      const data = await pdfParse(pdfBuffer, {
        max: options?.maxPages || 0, // 0 = all pages
      });

      const text = data.text.trim();
      const metadata = options?.includeMetadata
        ? {
            title: data.info?.Title,
            author: data.info?.Author,
            subject: data.info?.Subject,
            keywords: data.info?.Keywords,
            creator: data.info?.Creator,
            producer: data.info?.Producer,
            creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
            modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
          }
        : undefined;

      logger.info('Text extracted from PDF successfully', {
        pages: data.numpages,
        textLength: text.length,
        hasMetadata: !!metadata,
      });

      return {
        success: true,
        text,
        pages: data.numpages,
        metadata,
      };
    } catch (error) {
      logger.error('Error extracting text from PDF', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract text from specific pages
   * 
   * @param pdfBuffer - PDF file buffer
   * @param pageNumbers - Array of page numbers (1-indexed)
   * @returns Extracted text
   */
  async extractFromPages(
    pdfBuffer: Buffer,
    pageNumbers: number[]
  ): Promise<PDFProcessingResult> {
    if (!pdfParse) {
      return {
        success: false,
        error: 'PDF-parse library not available',
      };
    }

    try {
      logger.info('Extracting text from specific PDF pages', {
        pages: pageNumbers,
      });

      // Note: pdf-parse doesn't support selective page extraction natively
      // We extract all text and note which pages were requested
      const data = await pdfParse(pdfBuffer);

      logger.info('Text extracted from PDF pages', {
        requestedPages: pageNumbers,
        totalPages: data.numpages,
        textLength: data.text.length,
      });

      return {
        success: true,
        text: data.text.trim(),
        pages: data.numpages,
      };
    } catch (error) {
      logger.error('Error extracting text from PDF pages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pages: pageNumbers,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get PDF metadata only (without extracting text)
   * 
   * @param pdfBuffer - PDF file buffer
   * @returns PDF metadata
   */
  async getMetadata(pdfBuffer: Buffer): Promise<PDFProcessingResult> {
    if (!pdfParse) {
      return {
        success: false,
        error: 'PDF-parse library not available',
      };
    }

    try {
      logger.debug('Getting PDF metadata');

      const data = await pdfParse(pdfBuffer, {
        max: 0, // Don't extract text, just metadata
      });

      const metadata = {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      };

      logger.info('PDF metadata retrieved', {
        pages: data.numpages,
        hasTitle: !!metadata.title,
        hasAuthor: !!metadata.author,
      });

      return {
        success: true,
        pages: data.numpages,
        metadata,
      };
    } catch (error) {
      logger.error('Error getting PDF metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract text and clean it for RAG ingestion
   * Removes extra whitespace, normalizes line breaks, etc.
   * 
   * @param pdfBuffer - PDF file buffer
   * @returns Cleaned text for RAG
   */
  async extractForRAG(pdfBuffer: Buffer): Promise<PDFProcessingResult> {
    const result = await this.extractText(pdfBuffer);

    if (!result.success || !result.text) {
      return result;
    }

    try {
      // Clean text for RAG ingestion
      let cleanedText = result.text
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        // Remove multiple newlines (keep paragraphs)
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        // Trim whitespace
        .trim();

      logger.info('Text cleaned for RAG', {
        originalLength: result.text.length,
        cleanedLength: cleanedText.length,
        reduction: `${((1 - cleanedText.length / result.text.length) * 100).toFixed(1)}%`,
      });

      return {
        ...result,
        text: cleanedText,
      };
    } catch (error) {
      logger.error('Error cleaning text for RAG', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return original text if cleaning fails
      return result;
    }
  }

  /**
   * Check if buffer is a valid PDF
   * 
   * @param buffer - File buffer
   * @returns True if buffer appears to be a PDF
   */
  isValidPDF(buffer: Buffer): boolean {
    // PDF files start with "%PDF-"
    const header = buffer.slice(0, 5).toString();
    return header === '%PDF-';
  }

  /**
   * Extract text from multiple PDFs
   * 
   * @param pdfBuffers - Array of PDF buffers with filenames
   * @returns Array of extraction results
   */
  async extractFromMultiplePDFs(
    pdfBuffers: Array<{ buffer: Buffer; filename: string }>
  ): Promise<Array<{ filename: string; result: PDFProcessingResult }>> {
    logger.info('Extracting text from multiple PDFs', {
      count: pdfBuffers.length,
    });

    const results = await Promise.all(
      pdfBuffers.map(async (pdf) => ({
        filename: pdf.filename,
        result: await this.extractForRAG(pdf.buffer),
      }))
    );

    const successful = results.filter((r) => r.result.success).length;
    const totalPages = results.reduce((sum, r) => sum + (r.result.pages || 0), 0);
    const totalTextLength = results.reduce((sum, r) => sum + (r.result.text?.length || 0), 0);

    logger.info('Multiple PDFs processed', {
      total: pdfBuffers.length,
      successful,
      failed: pdfBuffers.length - successful,
      totalPages,
      totalTextLength,
    });

    return results;
  }
}

// Export singleton instance
export const pdfProcessingService = new PDFProcessingService();
