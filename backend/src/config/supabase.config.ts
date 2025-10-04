/**
 * Supabase Configuration
 * Configuration for Supabase Vector Database
 * As per plan lines 76-77, 81-84: "Supabase Vector (pgvector extension)"
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createServiceLogger } from '../utils/logger';

config();

const logger = createServiceLogger('SupabaseConfig');

/**
 * Supabase Configuration Interface
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

/**
 * Get Supabase configuration from environment variables
 * Validates required settings as per plan requirements
 */
export const getSupabaseConfig = (): SupabaseConfig => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Supabase configuration is incomplete. Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
};

/**
 * Create Supabase client
 * Uses service role key for admin operations (bypasses RLS)
 */
export const createSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info('Supabase client created', {
    url: config.url,
    useServiceRole: true,
  });

  return client;
};

/**
 * Export singleton config and client
 */
export const supabaseConfig = getSupabaseConfig();
export const supabase = createSupabaseClient();

