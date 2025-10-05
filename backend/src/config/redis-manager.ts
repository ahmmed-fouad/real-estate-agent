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
        ...(redisConfig.tls && {
          tls: {
            rejectUnauthorized: true,
          },
        }),
        lazyConnect: true, // Don't connect immediately
        retryStrategy: (times) => {
          // Stop retrying after 10 attempts
          if (times > 10) {
            logger.error('Redis connection failed after 10 attempts. Giving up.');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 1000, 5000);
          logger.debug('Redis retry attempt', { times, delay });
          return delay;
        },
        reconnectOnError: (err) => {
          // Only reconnect for specific errors
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            logger.warn('Redis READONLY error, attempting reconnect', { error: err.message });
            return true;
          }
          // Don't log here - errors are already logged by the 'error' event handler
          return false;
        },
        maxRetriesPerRequest: 3,
      });

      this.mainClient.on('connect', () => {
        logger.info('Main Redis client connecting...');
      });

      this.mainClient.on('ready', () => {
        logger.info('Main Redis client ready', {
          host: redisConfig.host,
          port: redisConfig.port,
        });
      });

      this.mainClient.on('error', (error) => {
        // Only log non-connection errors (connection errors are handled by retryStrategy)
        if (!error.message.includes('ECONNREFUSED') && !error.message.includes('ETIMEDOUT')) {
          logger.error('Main Redis client error', { error: error.message });
        }
      });

      this.mainClient.on('close', () => {
        logger.warn('Main Redis client connection closed');
      });

      // Attempt to connect
      this.mainClient.connect().catch((err) => {
        logger.error('Failed to connect to Redis. Redis features will be unavailable.', {
          error: err.message,
          host: redisConfig.host,
          port: redisConfig.port,
        });
        logger.warn(
          'Please ensure Redis is installed and running: sudo systemctl start redis-server'
        );
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
      ...(redisConfig.tls && {
        tls: {
          rejectUnauthorized: true,
        },
      }),
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
      ...(redisConfig.tls && {
        tls: {
          rejectUnauthorized: true,
        },
      }),
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 10) {
          return null; // Stop retrying
        }
        return Math.min(times * 1000, 5000);
      },
      maxRetriesPerRequest: 3,
    });

    subscriber.on('connect', () => {
      logger.info('Redis subscriber connected', { name });
    });

    subscriber.on('error', (error) => {
      // Only log non-connection errors
      if (!error.message.includes('ECONNREFUSED') && !error.message.includes('ETIMEDOUT')) {
        logger.error('Redis subscriber error', { name, error: error.message });
      }
    });

    subscriber.connect().catch((err) => {
      logger.error('Failed to connect Redis subscriber', {
        name,
        error: err.message,
      });
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
