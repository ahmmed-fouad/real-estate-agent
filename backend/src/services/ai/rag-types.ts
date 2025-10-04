/**
 * RAG (Retrieval Augmented Generation) Types
 * Type definitions for RAG service
 * As per plan lines 448-482: "Document Schema"
 */

/**
 * Payment Plan Interface
 */
export interface PaymentPlan {
  id: string;
  planName: string;
  downPaymentPercentage: number;
  installmentYears: number;
  monthlyPayment?: number;
  description?: string;
}

/**
 * Location Information
 */
export interface PropertyLocation {
  city: string;
  district: string;
  address?: string;
  coordinates?: [number, number]; // [latitude, longitude]
}

/**
 * Pricing Information
 */
export interface PropertyPricing {
  basePrice: number;
  pricePerMeter: number;
  currency: string;
}

/**
 * Specifications
 */
export interface PropertySpecifications {
  area: number; // in square meters
  bedrooms: number;
  bathrooms: number;
  floors?: number;
}

/**
 * Property Document Interface
 * As per plan lines 449-481
 * 
 * Represents a property with all its details and vector embedding
 */
export interface PropertyDocument {
  id: string;
  agentId: string;
  projectName: string;
  developerName: string; // Required as per plan line 453
  propertyType: string; // apartment, villa, townhouse, etc.
  
  location: PropertyLocation;
  pricing: PropertyPricing;
  specifications: PropertySpecifications;
  
  amenities: string[];
  paymentPlans: PaymentPlan[];
  deliveryDate: Date; // Required as per plan line 474
  description: string; // Required as per plan line 475
  
  // Media
  images: string[];
  documents: string[];
  videoUrl?: string;
  
  // Status
  status: string; // available, sold, reserved
  
  // Metadata for vector search
  embeddingText: string;
  embedding: number[];
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Search Filters Interface
 * As per plan lines 516-521: "Metadata Filtering"
 * 
 * Used to filter vector search results by metadata
 */
export interface SearchFilters {
  // Price filtering
  minPrice?: number;
  maxPrice?: number;
  
  // Location filtering
  city?: string;
  district?: string;
  location?: string; // General location search
  
  // Property type filtering
  propertyType?: string; // apartment, villa, townhouse
  
  // Specifications filtering
  minBedrooms?: number;
  maxBedrooms?: number;
  bedrooms?: number; // Exact match
  
  minBathrooms?: number;
  maxBathrooms?: number;
  
  minArea?: number;
  maxArea?: number;
  
  // Status filtering
  status?: string; // available, sold, reserved
  
  // Amenities filtering (property must have all specified amenities)
  amenities?: string[];
}

/**
 * RAG Retrieval Options
 */
export interface RetrievalOptions {
  topK?: number; // Number of results to return (default: 5)
  filters?: SearchFilters; // Metadata filters
  threshold?: number; // Similarity threshold (0-1)
}

/**
 * RAG Service Interface
 * As per plan lines 486-513
 */
export interface IRAGService {
  /**
   * Retrieve relevant property documents
   * As per plan lines 487-503
   * 
   * @param query - User query text
   * @param agentId - Agent ID for multi-tenant isolation
   * @param options - Retrieval options (filters, topK, threshold)
   * @returns Array of relevant property documents
   */
  retrieveRelevantDocs(
    query: string,
    agentId: string,
    options?: RetrievalOptions
  ): Promise<PropertyDocument[]>;

  /**
   * Augment prompt with retrieved documents
   * As per plan lines 506-512
   * 
   * Formats retrieved properties into context string for LLM
   * 
   * @param userQuery - User's original query
   * @param retrievedDocs - Retrieved property documents
   * @returns Formatted context string
   */
  augmentPrompt(
    userQuery: string,
    retrievedDocs: PropertyDocument[]
  ): Promise<string>;

  /**
   * Ingest property data into vector database
   * As per plan lines 441-445: "Data Ingestion Pipeline"
   * 
   * @param property - Property document to ingest
   * @returns Success status
   */
  ingestProperty(property: PropertyDocument): Promise<{ success: boolean; id: string }>;

  /**
   * Batch ingest multiple properties
   * More efficient for bulk uploads
   * 
   * @param properties - Array of property documents
   * @returns Array of ingestion results
   */
  batchIngestProperties(
    properties: PropertyDocument[]
  ): Promise<Array<{ success: boolean; id: string; error?: string }>>;

  /**
   * Delete property from vector database
   * 
   * @param propertyId - ID of property to delete
   * @returns Success status
   */
  deleteProperty(propertyId: string): Promise<{ success: boolean }>;
}

/**
 * Vector Search Result (internal type)
 */
export interface VectorSearchResult {
  id: string;
  similarity: number;
  document: PropertyDocument;
}

