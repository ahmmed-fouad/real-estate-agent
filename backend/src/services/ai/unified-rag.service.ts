/**
 * Unified RAG Service
 * Integrates property search with document knowledge base
 * Enables AI to answer questions using both property data and general knowledge
 */

import { createServiceLogger } from '../../utils/logger';
import { ragService } from './rag.service';
import { documentService } from '../document';
import { PropertyDocument, RetrievalOptions } from './rag-types';

const logger = createServiceLogger('UnifiedRAGService');

/**
 * Types of knowledge sources
 */
export enum KnowledgeSource {
  PROPERTIES = 'properties',
  DOCUMENTS = 'documents',
  BOTH = 'both',
}

/**
 * Unified retrieval result
 */
export interface UnifiedRetrievalResult {
  properties: PropertyDocument[];
  documents: any[];
  combinedContext: string;
  sources: {
    propertyCount: number;
    documentCount: number;
  };
}

/**
 * Unified RAG options
 */
export interface UnifiedRAGOptions extends RetrievalOptions {
  source?: KnowledgeSource;
  includeDocuments?: boolean;
  documentTypes?: string[];
  documentCategories?: string[];
}

/**
 * Unified RAG Service
 * Combines property search with document knowledge base
 */
export class UnifiedRAGService {
  private readonly defaultTopK = 5;
  private readonly defaultThreshold = 0.2; // Lowered from 0.7 to match actual similarity scores

  constructor() {
    logger.info('Unified RAG Service initialized', {
      sources: ['properties', 'documents'],
    });
  }

  /**
   * Retrieve relevant context from all knowledge sources
   * Main entry point for RAG retrieval
   */
  async retrieveContext(
    query: string,
    agentId: string,
    options?: UnifiedRAGOptions
  ): Promise<UnifiedRetrievalResult> {
    const startTime = Date.now();
    const source = options?.source || KnowledgeSource.BOTH;

    try {
      logger.info('Retrieving unified context', {
        query: query.substring(0, 100),
        agentId,
        source,
        topK: options?.topK,
      });

      let properties: PropertyDocument[] = [];
      let documents: any[] = [];

      // Retrieve properties if needed
      if (source === KnowledgeSource.PROPERTIES || source === KnowledgeSource.BOTH) {
        try {
          properties = await ragService.retrieveRelevantDocs(query, agentId, {
            topK: options?.topK || this.defaultTopK,
            threshold: options?.threshold || this.defaultThreshold,
            filters: options?.filters,
          });

          logger.debug('Properties retrieved', {
            count: properties.length,
          });
        } catch (error) {
          logger.error('Failed to retrieve properties', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with documents even if properties fail
        }
      }

      // Retrieve documents if needed
      if (source === KnowledgeSource.DOCUMENTS || source === KnowledgeSource.BOTH) {
        try {
          documents = await documentService.searchDocuments({
            agentId,
            query,
            topK: options?.topK || this.defaultTopK,
            threshold: options?.threshold || this.defaultThreshold,
            documentType: options?.documentTypes?.[0],
            category: options?.documentCategories?.[0],
          });

          logger.debug('Documents retrieved', {
            count: documents.length,
          });
        } catch (error) {
          logger.error('Failed to retrieve documents', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with properties even if documents fail
        }
      }

      // Combine contexts
      const combinedContext = this.buildCombinedContext(query, properties, documents);

      const duration = Date.now() - startTime;
      logger.info('Context retrieval completed', {
        propertyCount: properties.length,
        documentCount: documents.length,
        contextLength: combinedContext.length,
        duration,
      });

      return {
        properties,
        documents,
        combinedContext,
        sources: {
          propertyCount: properties.length,
          documentCount: documents.length,
        },
      };
    } catch (error) {
      logger.error('Unified context retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Build combined context from properties and documents
   */
  private buildCombinedContext(
    query: string,
    properties: PropertyDocument[],
    documents: any[]
  ): string {
    const contextParts: string[] = [];

    // Add document context first (general knowledge)
    if (documents.length > 0) {
      contextParts.push('=== KNOWLEDGE BASE ===\n');
      
      documents.forEach((doc, index) => {
        const docContext = `
Document ${index + 1}: ${doc.title}
Type: ${doc.document_type || doc.documentType}
Category: ${doc.category || 'General'}

${this.extractDocumentContent(doc)}
`;
        contextParts.push(docContext.trim());
      });
      
      contextParts.push('\n');
    }

    // Add property context (specific listings)
    if (properties.length > 0) {
      contextParts.push('=== AVAILABLE PROPERTIES ===\n');
      
      // Use existing RAG service to format property context
      const propertyContext = properties.map((prop, index) => {
        return `
Property ${index + 1}: ${prop.projectName}
- Location: ${prop.location.district}, ${prop.location.city}
- Type: ${prop.propertyType}
- Price: ${prop.pricing.basePrice} ${prop.pricing.currency}
- Area: ${prop.specifications.area} sqm
- Bedrooms: ${prop.specifications.bedrooms}
- Description: ${prop.description || 'N/A'}
`;
      }).join('\n');
      
      contextParts.push(propertyContext);
    }

    // Add query context
    if (contextParts.length > 0) {
      contextParts.unshift(`Based on the query: "${query}"\n`);
    } else {
      return `No relevant information found for query: "${query}"`;
    }

    return contextParts.join('\n');
  }

  /**
   * Extract relevant content from document
   */
  private extractDocumentContent(doc: any): string {
    // If document has chunks, use first few chunks
    if (doc.content_chunks || doc.contentChunks) {
      const chunks = doc.content_chunks || doc.contentChunks;
      if (Array.isArray(chunks) && chunks.length > 0) {
        // Take first 2-3 chunks (most relevant due to vector search)
        return chunks
          .slice(0, 3)
          .map((chunk: any) => chunk.content || chunk)
          .join('\n\n');
      }
    }

    // Otherwise use content_text
    const contentText = doc.content_text || doc.contentText || '';
    
    // Limit to ~1000 characters to avoid token overflow
    if (contentText.length > 1000) {
      return contentText.substring(0, 1000) + '...';
    }
    
    return contentText;
  }

  /**
   * Search only documents (shortcut method)
   */
  async searchDocuments(
    query: string,
    agentId: string,
    options?: {
      topK?: number;
      threshold?: number;
      documentTypes?: string[];
      categories?: string[];
    }
  ): Promise<any[]> {
    const result = await this.retrieveContext(query, agentId, {
      source: KnowledgeSource.DOCUMENTS,
      topK: options?.topK,
      threshold: options?.threshold,
      documentTypes: options?.documentTypes,
      documentCategories: options?.categories,
    });

    return result.documents;
  }

  /**
   * Search only properties (shortcut method)
   */
  async searchProperties(
    query: string,
    agentId: string,
    options?: RetrievalOptions
  ): Promise<PropertyDocument[]> {
    const result = await this.retrieveContext(query, agentId, {
      source: KnowledgeSource.PROPERTIES,
      ...options,
    });

    return result.properties;
  }

  /**
   * Augment prompt with retrieved context
   * Similar to RAG service but handles both sources
   */
  async augmentPrompt(
    systemPrompt: string,
    userQuery: string,
    agentId: string,
    options?: UnifiedRAGOptions
  ): Promise<string> {
    try {
      const result = await this.retrieveContext(userQuery, agentId, options);

      if (result.sources.propertyCount === 0 && result.sources.documentCount === 0) {
        logger.warn('No context found for prompt augmentation', {
          query: userQuery.substring(0, 100),
        });
        return systemPrompt;
      }

      // Augment system prompt with context
      const augmentedPrompt = `${systemPrompt}

## RETRIEVED CONTEXT
Use the following information to answer the customer's question accurately:

${result.combinedContext}

## IMPORTANT INSTRUCTIONS
- Use the context above to provide accurate, specific answers
- If asked about properties, reference the property listings provided
- If asked general questions, use the knowledge base information
- If the context doesn't contain the answer, say so politely
- Always provide information in the customer's preferred language
- Be helpful, professional, and accurate
`;

      logger.debug('Prompt augmented successfully', {
        originalLength: systemPrompt.length,
        augmentedLength: augmentedPrompt.length,
        propertiesUsed: result.sources.propertyCount,
        documentsUsed: result.sources.documentCount,
      });

      return augmentedPrompt;
    } catch (error) {
      logger.error('Failed to augment prompt', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return original prompt if augmentation fails
      return systemPrompt;
    }
  }

  /**
   * Detect query intent to determine best knowledge source
   */
  async detectKnowledgeSource(query: string): Promise<KnowledgeSource> {
    const queryLower = query.toLowerCase();

    // Keywords for property-specific queries
    const propertyKeywords = [
      'property', 'apartment', 'villa', 'unit', 'bedroom', 'bathroom',
      'price', 'sqm', 'available', 'listing', 'buy', 'purchase',
      'عقار', 'شقة', 'فيلا', 'غرفة', 'سعر', 'متر',
    ];

    // Keywords for general knowledge queries
    const documentKeywords = [
      'how', 'what', 'why', 'payment plan', 'contract', 'process',
      'company', 'service', 'faq', 'policy', 'guide', 'help',
      'كيف', 'ماذا', 'لماذا', 'خطة', 'عقد', 'شركة', 'خدمة',
    ];

    const hasPropertyKeywords = propertyKeywords.some(kw => queryLower.includes(kw));
    const hasDocumentKeywords = documentKeywords.some(kw => queryLower.includes(kw));

    if (hasPropertyKeywords && !hasDocumentKeywords) {
      return KnowledgeSource.PROPERTIES;
    } else if (hasDocumentKeywords && !hasPropertyKeywords) {
      return KnowledgeSource.DOCUMENTS;
    } else {
      // If unclear or both, search both sources
      return KnowledgeSource.BOTH;
    }
  }

  /**
   * Smart retrieval with automatic source detection
   */
  async smartRetrieve(
    query: string,
    agentId: string,
    options?: UnifiedRAGOptions
  ): Promise<UnifiedRetrievalResult> {
    // Detect best knowledge source if not specified
    if (!options?.source) {
      const detectedSource = await this.detectKnowledgeSource(query);
      logger.debug('Knowledge source detected', {
        query: query.substring(0, 50),
        source: detectedSource,
      });

      return this.retrieveContext(query, agentId, {
        ...options,
        source: detectedSource,
      });
    }

    return this.retrieveContext(query, agentId, options);
  }
}

// Export singleton instance
export const unifiedRAGService = new UnifiedRAGService();

