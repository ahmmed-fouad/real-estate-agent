/**
 * Document Service
 * Manages knowledge base documents for RAG system
 * Handles document ingestion, vector embedding, and retrieval
 */

import { prisma } from '../../config/prisma-client';
import { supabase } from '../../config/supabase.config';
import { embeddingService } from '../ai/embedding.service';
import { textChunker } from '../ai/text-chunker.service';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('DocumentService');

export interface DocumentMetadata {
  id?: string;
  agentId: string;
  propertyId?: string;
  title: string;
  description?: string;
  documentType: 'brochure' | 'floor_plan' | 'contract' | 'policy' | 'faq' | 'guide';
  category?: 'property_info' | 'legal' | 'financial' | 'company_info';
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentText?: string;
  tags?: string[];
  language?: 'en' | 'ar' | 'mixed';
}

export interface DocumentSearchOptions {
  agentId: string;
  query?: string;
  documentType?: string;
  category?: string;
  propertyId?: string;
  topK?: number;
  threshold?: number;
}

export class DocumentService {
  /**
   * Ingest a document into the knowledge base
   * Extracts text, generates embeddings, and stores in database
   */
  async ingestDocument(documentData: DocumentMetadata): Promise<{ success: boolean; id: string }> {
    try {
      logger.info('Ingesting document', {
        title: documentData.title,
        type: documentData.documentType,
        agentId: documentData.agentId,
      });

      // Chunk the content text if provided
      let contentChunks: Array<{ content: string; index: number }> = [];
      let embedding: number[] | undefined;

      if (documentData.contentText) {
        // Split into chunks for better RAG performance
        contentChunks = await textChunker.chunkText(documentData.contentText, 500);

        logger.info('Document chunked', {
          title: documentData.title,
          chunkCount: contentChunks.length,
          contentLength: documentData.contentText.length,
        });

        // Generate embedding for the full document
        // For multiple chunks, we'll average their embeddings
        if (contentChunks.length === 1) {
          embedding = await embeddingService.generateEmbedding(contentChunks[0].content);
        } else {
          const chunkTexts = contentChunks.map(c => c.content);
          const chunkEmbeddings = await embeddingService.batchEmbeddings(chunkTexts);
          embedding = this.averageEmbeddings(chunkEmbeddings);
        }

        logger.info('Document embedding generated', {
          title: documentData.title,
          dimensions: embedding?.length,
        });
      }

      // Create document in database
      const document = await prisma.document.create({
        data: {
          agentId: documentData.agentId,
          propertyId: documentData.propertyId,
          title: documentData.title,
          description: documentData.description,
          documentType: documentData.documentType,
          category: documentData.category,
          fileUrl: documentData.fileUrl,
          fileName: documentData.fileName,
          fileType: documentData.fileType,
          fileSize: documentData.fileSize,
          contentText: documentData.contentText,
          contentChunks: contentChunks as any,
          embeddingText: documentData.contentText,
          tags: documentData.tags || [],
          language: documentData.language || 'en',
        },
      });

      // Store embedding in Supabase vector store (separate from Prisma)
      if (embedding) {
        await supabase
          .from('documents')
          .update({ embedding })
          .eq('id', document.id);
      }

      logger.info('Document ingested successfully', {
        id: document.id,
        title: document.title,
      });

      return { success: true, id: document.id };
    } catch (error) {
      logger.error('Failed to ingest document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: documentData.title,
      });
      throw error;
    }
  }

  /**
   * Batch ingest multiple documents
   */
  async batchIngestDocuments(
    documents: DocumentMetadata[]
  ): Promise<Array<{ success: boolean; id?: string; error?: string }>> {
    logger.info('Batch ingesting documents', { count: documents.length });

    const results = await Promise.allSettled(
      documents.map(doc => this.ingestDocument(doc))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return { success: true, id: result.value.id };
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * Search documents using vector similarity
   */
  async searchDocuments(options: DocumentSearchOptions): Promise<any[]> {
    try {
      logger.info('Searching documents', {
        agentId: options.agentId,
        query: options.query?.substring(0, 50),
        documentType: options.documentType,
      });

      // If query provided, use vector search
      if (options.query) {
        const queryEmbedding = await embeddingService.generateEmbedding(options.query);

        const { data, error } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: options.threshold || 0.7,
          match_count: options.topK || 5,
          filter_agent_id: options.agentId,
          filter_document_type: options.documentType,
          filter_property_id: options.propertyId,
        });

        if (error) {
          logger.error('Vector search failed', { error: error.message });
          throw new Error(`Vector search failed: ${error.message}`);
        }

        return data || [];
      }

      // Otherwise, use regular database query
      const documents = await prisma.document.findMany({
        where: {
          agentId: options.agentId,
          documentType: options.documentType,
          category: options.category,
          propertyId: options.propertyId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options.topK || 10,
      });

      return documents;
    } catch (error) {
      logger.error('Document search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<any> {
    return prisma.document.findUnique({
      where: { id: documentId },
      include: {
        agent: {
          select: { id: true, fullName: true, email: true },
        },
        property: {
          select: { id: true, projectName: true, propertyType: true },
        },
      },
    });
  }

  /**
   * Update document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<DocumentMetadata>
  ): Promise<{ success: boolean }> {
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: updates as any,
      });

      logger.info('Document updated', { documentId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to update document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    try {
      await prisma.document.delete({
        where: { id: documentId },
      });

      logger.info('Document deleted', { documentId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Get documents by agent
   */
  async getDocumentsByAgent(agentId: string, filters?: {
    documentType?: string;
    category?: string;
    propertyId?: string;
  }): Promise<any[]> {
    return prisma.document.findMany({
      where: {
        agentId,
        documentType: filters?.documentType,
        category: filters?.category,
        propertyId: filters?.propertyId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, projectName: true },
        },
      },
    });
  }

  /**
   * Average multiple embeddings into a single embedding
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot average zero embeddings');
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const dimensions = embeddings[0].length;
    const averaged = new Array(dimensions).fill(0);

    // Sum all embeddings
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        averaged[i] += embedding[i];
      }
    }

    // Divide by count and normalize
    for (let i = 0; i < dimensions; i++) {
      averaged[i] /= embeddings.length;
    }

    // Normalize to unit length
    const magnitude = Math.sqrt(averaged.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < dimensions; i++) {
      averaged[i] /= magnitude;
    }

    return averaged;
  }
}

// Export singleton instance
export const documentService = new DocumentService();

