/**
 * Redis Configuration
 * For session storage and queue management
 */

import { config } from 'dotenv';

config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

/**
 * Get Redis configuration from environment variables
 */
export const getRedisConfig = (): RedisConfig => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  // Enable TLS for Upstash and other cloud Redis providers
  // Upstash uses port 6379 with TLS, or you can set REDIS_TLS=true explicitly
  const tls =
    process.env.REDIS_TLS === 'true' ||
    host.includes('upstash.io') ||
    host.includes('redislabs.com');

  return {
    host,
    port,
    password,
    db,
    tls,
  };
};

export const redisConfig = getRedisConfig();
