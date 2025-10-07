/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles vector database operations and retrieval
 * As per plan lines 484-542: "Retrieval Implementation" and "RAG Flow"
 * 
 * Features:
 * - Vector search with pgvector (line 420)
 * - Metadata filtering (lines 516-521)
 * - Multi-tenant isolation (line 517)
 * - Context augmentation (lines 506-512)
 */

import { supabase } from '../../config/supabase.config';
import { embeddingService } from './embedding.service';
import { textChunker } from './text-chunker.service';
import { createServiceLogger } from '../../utils/logger';
import { PriceFormatter } from '../../utils/price-formatter';
import { arabicFormatterService } from '../language/arabic-formatter.service';
import {
  IRAGService,
  PropertyDocument,
  SearchFilters,
  RetrievalOptions,
} from './rag-types';

const logger = createServiceLogger('RAGService');

/**
 * RAG Service Implementation
 * Implements vector search and retrieval as per plan
 */
export class RAGService implements IRAGService {
  private readonly tableName = 'properties';
  private readonly defaultTopK = 5;
  private readonly defaultThreshold = 0.7; // 70% similarity

  constructor() {
    logger.info('RAG Service initialized', {
      table: this.tableName,
      defaultTopK: this.defaultTopK,
      defaultThreshold: this.defaultThreshold,
    });
  }

  /**
   * Retrieve relevant documents using vector similarity search
   * As per plan lines 487-503: "retrieveRelevantDocs"
   * 
   * RAG Flow (lines 524-535):
   * 1. Generate embedding for the query
   * 2. Search vector DB with query embedding
   * 3. Apply metadata filters (agentId, price, location, etc.)
   * 4. Return top K relevant properties
   */
  async retrieveRelevantDocs(
    query: string,
    agentId: string,
    options?: RetrievalOptions
  ): Promise<PropertyDocument[]> {
    const startTime = Date.now();
    const topK = options?.topK || this.defaultTopK;
    const threshold = options?.threshold || this.defaultThreshold;
    const filters = options?.filters;

    try {
      logger.info('Retrieving relevant documents', {
        query: query.substring(0, 100),
        agentId,
        topK,
        filters,
      });

      // Step 1: Generate query embedding (plan line 527)
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      logger.debug('Query embedding generated', {
        dimensions: queryEmbedding.length,
      });

      // Step 2: Build query with filters (plan lines 528-530)
      let dbQuery = supabase
        .rpc('match_properties', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: topK,
          filter_agent_id: agentId, // Critical: Multi-tenant isolation (line 517)
        });

      // Note: match_properties is a custom PostgreSQL function that performs vector similarity search
      // It will be created in the database migration

      const { data, error } = await dbQuery;

      if (error) {
        logger.error('Vector search failed', {
          error: error.message,
          agentId,
          query: query.substring(0, 100),
        });
        throw new Error(`Vector search failed: ${error.message}`);
      }

      // Apply additional metadata filters (plan lines 516-521)
      let results = data || [];
      if (filters) {
        results = this.applyMetadataFilters(results, filters);
      }

      const responseTime = Date.now() - startTime;

      logger.info('Documents retrieved successfully', {
        count: results.length,
        responseTime,
        agentId,
      });

      // Convert database results to PropertyDocument format
      return results.map((row: any) => this.mapRowToPropertyDocument(row));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error retrieving documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        agentId,
        query: query.substring(0, 100),
        responseTime,
      });
      throw error;
    }
  }

  /**
   * Apply metadata filters to search results
   * As per plan lines 516-521: "Metadata Filtering"
   */
  private applyMetadataFilters(
    results: any[],
    filters: SearchFilters
  ): any[] {
    return results.filter((property) => {
      // Price filtering
      if (filters.minPrice !== undefined && property.base_price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && property.base_price > filters.maxPrice) {
        return false;
      }

      // Location filtering
      if (filters.city && !property.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      if (filters.district && !property.district?.toLowerCase().includes(filters.district.toLowerCase())) {
        return false;
      }
      if (filters.location) {
        const locationStr = `${property.city} ${property.district} ${property.address || ''}`.toLowerCase();
        if (!locationStr.includes(filters.location.toLowerCase())) {
          return false;
        }
      }

      // Property type filtering
      if (filters.propertyType && property.property_type !== filters.propertyType) {
        return false;
      }

      // Bedrooms filtering
      if (filters.bedrooms !== undefined && property.bedrooms !== filters.bedrooms) {
        return false;
      }
      if (filters.minBedrooms !== undefined && property.bedrooms < filters.minBedrooms) {
        return false;
      }
      if (filters.maxBedrooms !== undefined && property.bedrooms > filters.maxBedrooms) {
        return false;
      }

      // Bathrooms filtering
      if (filters.minBathrooms !== undefined && property.bathrooms < filters.minBathrooms) {
        return false;
      }
      if (filters.maxBathrooms !== undefined && property.bathrooms > filters.maxBathrooms) {
        return false;
      }

      // Area filtering
      if (filters.minArea !== undefined && parseFloat(property.area) < filters.minArea) {
        return false;
      }
      if (filters.maxArea !== undefined && parseFloat(property.area) > filters.maxArea) {
        return false;
      }

      // Status filtering
      if (filters.status && property.status !== filters.status) {
        return false;
      }

      // Amenities filtering (property must have all specified amenities)
      if (filters.amenities && filters.amenities.length > 0) {
        const propertyAmenities = property.amenities || [];
        const hasAllAmenities = filters.amenities.every((amenity) =>
          propertyAmenities.some((pa: string) => pa.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAllAmenities) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Augment prompt with retrieved documents
   * As per plan lines 506-512 and 532: "Format properties into context string"
   * 
   * Converts property documents into natural language context for the LLM
   */
  async augmentPrompt(
    userQuery: string,
    retrievedDocs: PropertyDocument[]
  ): Promise<string> {
    try {
      if (retrievedDocs.length === 0) {
        logger.info('No documents to augment prompt with');
        return 'No matching properties found in the database.';
      }

      logger.info('Augmenting prompt with retrieved docs', {
        count: retrievedDocs.length,
      });

      // Format each property into a structured context block
      const contextBlocks = retrievedDocs.map((prop, index) => {
        const paymentPlansText = prop.paymentPlans
          .map((plan) => {
            return `${plan.planName}: ${plan.downPaymentPercentage}% down payment, ${plan.installmentYears} years installment`;
          })
          .join(', ');

        // Format prices using centralized utility for consistency
        const formattedBasePrice = PriceFormatter.formatForContext(
          prop.pricing.basePrice,
          prop.pricing.currency
        );
        const formattedPricePerMeter = PriceFormatter.formatPricePerMeter(
          prop.pricing.pricePerMeter,
          prop.pricing.currency
        );

        // FIX: Use arabicFormatterService for bilingual date formatting
        const formattedDeliveryDate = prop.deliveryDate
          ? arabicFormatterService.formatDate(new Date(prop.deliveryDate), 'mixed', 'long')
          : 'Available now';

        return `
Property ${index + 1}: ${prop.projectName}
- Developer: ${prop.developerName || 'N/A'}
- Type: ${prop.propertyType}
- Location: ${prop.location.district}, ${prop.location.city}
- Price: ${formattedBasePrice} (${formattedPricePerMeter})
- Specifications: ${prop.specifications.area} sqm, ${prop.specifications.bedrooms} bedrooms, ${prop.specifications.bathrooms} bathrooms
- Amenities: ${prop.amenities.join(', ') || 'N/A'}
- Payment Plans: ${paymentPlansText || 'Cash only'}
- Delivery: ${formattedDeliveryDate}
- Description: ${prop.description || 'No description available'}
- Status: ${prop.status}`.trim();
      });

      const context = `Based on the query "${userQuery}", here are the most relevant properties available:\n\n${contextBlocks.join('\n\n')}`;

      logger.debug('Prompt augmented successfully', {
        contextLength: context.length,
        propertiesIncluded: retrievedDocs.length,
      });

      return context;
    } catch (error) {
      logger.error('Error augmenting prompt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        docCount: retrievedDocs.length,
      });
      throw error;
    }
  }

  /**
   * Ingest a single property into the vector database
   * As per plan lines 441-445: "Data Ingestion Pipeline"
   * 
   * Implements:
   * - Text chunking (line 443)
   * - Generate embeddings for each chunk (line 444)
   */
  async ingestProperty(property: PropertyDocument): Promise<{ success: boolean; id: string }> {
    try {
      logger.info('Ingesting property', {
        propertyId: property.id,
        agentId: property.agentId,
        projectName: property.projectName,
      });

      // Generate embedding text if not provided
      const embeddingText = property.embeddingText || this.generateEmbeddingText(property);

      // Generate embedding if not provided
      let embedding = property.embedding;
      if (!embedding || embedding.length === 0) {
        // Plan line 443-444: Chunk text and generate embeddings for each chunk
        logger.debug('Chunking and generating embedding for property', {
          propertyId: property.id,
          textLength: embeddingText.length,
        });

        // Chunk text if it's long (as per plan line 443)
        const chunks = await textChunker.chunkText(embeddingText, 500);
        
        logger.info('Text chunked', {
          propertyId: property.id,
          originalLength: embeddingText.length,
          chunks: chunks.length,
        });

        if (chunks.length === 1) {
          // Single chunk - generate one embedding
          embedding = await embeddingService.generateEmbedding(chunks[0].content);
        } else {
          // Multiple chunks - generate embeddings and combine
          // As per plan line 444: "Generate embeddings for each chunk"
          logger.info('Generating embeddings for multiple chunks', {
            propertyId: property.id,
            chunkCount: chunks.length,
          });

          const chunkTexts = chunks.map(chunk => chunk.content);
          const chunkEmbeddings = await embeddingService.batchEmbeddings(chunkTexts);

          // Average the chunk embeddings to create a single property embedding
          // This preserves semantic information from all chunks
          embedding = this.averageEmbeddings(chunkEmbeddings);

          logger.info('Chunk embeddings combined', {
            propertyId: property.id,
            chunksProcessed: chunkEmbeddings.length,
            finalDimensions: embedding.length,
          });
        }
      }

      // Insert/update property in database
      const { data, error } = await supabase
        .from(this.tableName)
        .upsert({
          id: property.id,
          agent_id: property.agentId,
          project_name: property.projectName,
          developer_name: property.developerName,
          property_type: property.propertyType,
          city: property.location.city,
          district: property.location.district,
          address: property.location.address,
          latitude: property.location.coordinates?.[0],
          longitude: property.location.coordinates?.[1],
          base_price: property.pricing.basePrice,
          price_per_meter: property.pricing.pricePerMeter,
          currency: property.pricing.currency,
          area: property.specifications.area,
          bedrooms: property.specifications.bedrooms,
          bathrooms: property.specifications.bathrooms,
          floors: property.specifications.floors,
          amenities: property.amenities,
          description: property.description,
          delivery_date: property.deliveryDate,
          images: property.images,
          documents: property.documents,
          video_url: property.videoUrl,
          status: property.status,
          embedding_text: property.embeddingText || this.generateEmbeddingText(property),
          embedding: embedding, // Supabase client handles pgvector format automatically
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to ingest property', {
          error: error.message,
          propertyId: property.id,
        });
        throw new Error(`Failed to ingest property: ${error.message}`);
      }

      logger.info('Property ingested successfully', {
        propertyId: data.id,
        agentId: property.agentId,
      });

      return { success: true, id: data.id };
    } catch (error) {
      logger.error('Error ingesting property', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        propertyId: property.id,
      });
      return { success: false, id: property.id };
    }
  }

  /**
   * Batch ingest multiple properties
   * More efficient for bulk uploads
   */
  async batchIngestProperties(
    properties: PropertyDocument[]
  ): Promise<Array<{ success: boolean; id: string; error?: string }>> {
    logger.info('Batch ingesting properties', {
      count: properties.length,
    });

    const results = await Promise.all(
      properties.map(async (property) => {
        try {
          const result = await this.ingestProperty(property);
          return result;
        } catch (error) {
          return {
            success: false,
            id: property.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    logger.info('Batch ingestion completed', {
      total: properties.length,
      success: successCount,
      failed: properties.length - successCount,
    });

    return results;
  }

  /**
   * Delete property from vector database
   */
  async deleteProperty(propertyId: string): Promise<{ success: boolean }> {
    try {
      logger.info('Deleting property', { propertyId });

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', propertyId);

      if (error) {
        logger.error('Failed to delete property', {
          error: error.message,
          propertyId,
        });
        throw new Error(`Failed to delete property: ${error.message}`);
      }

      logger.info('Property deleted successfully', { propertyId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting property', {
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId,
      });
      return { success: false };
    }
  }

  /**
   * Average multiple embeddings into a single embedding
   * Used when property text is chunked into multiple pieces
   * 
   * Important: Normalizes the result to unit length to maintain
   * proper cosine similarity semantics
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

    // Divide by count to get average
    for (let i = 0; i < dimensions; i++) {
      averaged[i] /= embeddings.length;
    }

    // Normalize to unit length (critical for cosine similarity)
    // Calculate magnitude: sqrt(sum of squared components)
    let magnitude = 0;
    for (let i = 0; i < dimensions; i++) {
      magnitude += averaged[i] * averaged[i];
    }
    magnitude = Math.sqrt(magnitude);

    // Normalize each component
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        averaged[i] /= magnitude;
      }
    }

    logger.debug('Embeddings averaged and normalized', {
      inputCount: embeddings.length,
      dimensions,
      magnitude: magnitude.toFixed(6),
    });

    return averaged;
  }

  /**
   * Generate embedding text from property data
   * Creates a comprehensive text representation for embedding generation
   */
  private generateEmbeddingText(property: PropertyDocument): string {
    const parts = [
      `${property.projectName} by ${property.developerName}`,
      `${property.propertyType} in ${property.location.district}, ${property.location.city}`,
      `${property.specifications.bedrooms} bedrooms, ${property.specifications.bathrooms} bathrooms`,
      `${property.specifications.area} square meters`,
      `Price: ${property.pricing.basePrice} ${property.pricing.currency}`,
      `Amenities: ${property.amenities.join(', ')}`,
      property.description,
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Map database row to PropertyDocument
   * Converts snake_case DB columns to camelCase TypeScript interface
   */
  private mapRowToPropertyDocument(row: any): PropertyDocument {
    return {
      id: row.id,
      agentId: row.agent_id,
      projectName: row.project_name,
      propertyType: row.property_type,
      location: {
        city: row.city,
        district: row.district,
        address: row.address,
        coordinates: row.latitude && row.longitude ? [parseFloat(row.latitude), parseFloat(row.longitude)] : undefined,
      },
      pricing: {
        basePrice: parseFloat(row.base_price),
        pricePerMeter: parseFloat(row.price_per_meter),
        currency: row.currency,
      },
      specifications: {
        area: parseFloat(row.area),
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        floors: row.floors,
      },
      amenities: row.amenities || [],
      paymentPlans: Array.isArray(row.payment_plans) 
        ? row.payment_plans 
        : (row.payment_plans ? JSON.parse(row.payment_plans) : []),
      deliveryDate: row.delivery_date ? new Date(row.delivery_date) : new Date(), // Required field, default to current date
      description: row.description || '', // Required field, default to empty string if null
      developerName: row.developer_name || '', // Required field, default to empty string if null
      images: row.images || [],
      documents: row.documents || [],
      videoUrl: row.video_url,
      status: row.status,
      embeddingText: row.embedding_text,
      embedding: row.embedding || [],
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();

