/**
 * Redis Connection Manager
 * Provides shared Redis connections to avoid resource leaks
 * Implements connection pooling for all services
 */

import Redis from 'ioredis';
import { redisConfig } from './redis.config';
import { createServiceLogger } from '../utils/logger';

const logger = createServiceLogger('RedisManager');

/**
 * Redis Connection Manager
 * Single source of truth for Redis connections
 */
class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private mainClient: Redis | null = null;
  private subscribers: Map<string, Redis> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  /**
   * Get main Redis client (for general use)
   * Shared by SessionManager, WhatsAppRateLimiter, etc.
   */
  getMainClient(): Redis {
    if (!this.mainClient) {
      logger.info('Creating main Redis client', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db,
      });

      this.mainClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.debug('Redis retry attempt', { times, delay });
          return delay;
        },
        reconnectOnError: (err) => {
          logger.error('Redis connection error', { error: err.message });
          return true; // Always reconnect
        },
      });

      this.mainClient.on('connect', () => {
        logger.info('Main Redis client connected');
      });

      this.mainClient.on('error', (error) => {
        logger.error('Main Redis client error', { error: error.message });
      });

      this.mainClient.on('close', () => {
        logger.warn('Main Redis client connection closed');
      });
    }

    return this.mainClient;
  }

  /**
   * Get Redis config for Bull queues
   * Bull manages its own connections internally
   */
  getBullRedisConfig() {
    return {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: null, // Required for Bull
      enableReadyCheck: false, // Required for Bull
    };
  }

  /**
   * Create a subscriber client (for pub/sub if needed)
   * Each subscriber needs its own connection
   */
  createSubscriber(name: string): Redis {
    if (this.subscribers.has(name)) {
      return this.subscribers.get(name)!;
    }

    logger.info('Creating Redis subscriber', { name });

    const subscriber = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
    });

    subscriber.on('connect', () => {
      logger.info('Redis subscriber connected', { name });
    });

    subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { name, error: error.message });
    });

    this.subscribers.set(name, subscriber);
    return subscriber;
  }

  /**
   * Close all Redis connections (graceful shutdown)
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all Redis connections...');

    const closePromises: Promise<void>[] = [];

    // Close main client
    if (this.mainClient) {
      closePromises.push(
        this.mainClient.quit().catch((err) => {
          logger.error('Error closing main Redis client', { error: err.message });
        })
      );
    }

    // Close all subscribers
    for (const [name, subscriber] of this.subscribers) {
      closePromises.push(
        subscriber.quit().catch((err) => {
          logger.error('Error closing Redis subscriber', { name, error: err.message });
        })
      );
    }

    await Promise.all(closePromises);

    this.mainClient = null;
    this.subscribers.clear();

    logger.info('All Redis connections closed');
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.mainClient?.status === 'ready';
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.mainClient) {
        return false;
      }
      const response = await this.mainClient.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Export singleton instance
export const redisManager = RedisConnectionManager.getInstance();

