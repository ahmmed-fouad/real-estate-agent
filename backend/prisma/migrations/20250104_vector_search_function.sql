-- Migration: Add vector similarity search function
-- This function performs vector similarity search with metadata filtering
-- As per plan lines 484-503: "Retrieval Implementation"

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop function if exists (for re-running migration)
DROP FUNCTION IF EXISTS match_properties;

-- Create vector similarity search function with payment plans
-- This function is called by RAG service to retrieve relevant properties
-- FIXED: Now includes payment plans via JSON aggregation
CREATE OR REPLACE FUNCTION match_properties(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_agent_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  agent_id text,
  project_name text,
  developer_name text,
  property_type text,
  city text,
  district text,
  address text,
  latitude decimal,
  longitude decimal,
  base_price decimal,
  price_per_meter decimal,
  currency text,
  area decimal,
  bedrooms int,
  bathrooms int,
  floors int,
  amenities text[],
  description text,
  delivery_date timestamp,
  images text[],
  documents text[],
  video_url text,
  status text,
  embedding_text text,
  embedding vector(1536),
  created_at timestamp,
  updated_at timestamp,
  payment_plans jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    properties.id,
    properties.agent_id,
    properties.project_name,
    properties.developer_name,
    properties.property_type,
    properties.city,
    properties.district,
    properties.address,
    properties.latitude,
    properties.longitude,
    properties.base_price,
    properties.price_per_meter,
    properties.currency,
    properties.area,
    properties.bedrooms,
    properties.bathrooms,
    properties.floors,
    properties.amenities,
    properties.description,
    properties.delivery_date,
    properties.images,
    properties.documents,
    properties.video_url,
    properties.status,
    properties.embedding_text,
    properties.embedding,
    properties.created_at,
    properties.updated_at,
    -- Aggregate payment plans as JSONB array
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pp.id,
            'planName', pp.plan_name,
            'downPaymentPercentage', pp.down_payment_percentage,
            'installmentYears', pp.installment_years,
            'monthlyPayment', pp.monthly_payment,
            'description', pp.description
          )
        )
        FROM payment_plans pp
        WHERE pp.property_id = properties.id
      ),
      '[]'::jsonb
    ) as payment_plans,
    1 - (properties.embedding <=> query_embedding) as similarity
  FROM properties
  WHERE 
    -- Critical: Multi-tenant isolation (plan line 517)
    (filter_agent_id IS NULL OR properties.agent_id = filter_agent_id)
    -- Similarity threshold filter
    AND 1 - (properties.embedding <=> query_embedding) > match_threshold
  ORDER BY properties.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for vector similarity search (plan line 422)
-- This significantly improves vector search performance
CREATE INDEX IF NOT EXISTS idx_properties_embedding ON properties 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for agent_id filtering (plan line 517)
-- Ensures multi-tenant queries are fast
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);

-- Add comment for documentation
COMMENT ON FUNCTION match_properties IS 'Performs vector similarity search on properties table with multi-tenant isolation';

