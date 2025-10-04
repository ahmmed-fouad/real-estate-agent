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
}

/**
 * Get Redis configuration from environment variables
 */
export const getRedisConfig = (): RedisConfig => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  return {
    host,
    port,
    password,
    db,
  };
};

export const redisConfig = getRedisConfig();

