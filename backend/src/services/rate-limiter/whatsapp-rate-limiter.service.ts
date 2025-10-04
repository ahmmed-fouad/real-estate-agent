/**
 * WhatsApp Rate Limiter Service
 * Implements Redis-based distributed rate limiting for outgoing WhatsApp messages
 * As per plan line 240: "Handle rate limiting"
 * 
 * WhatsApp Business API has tiered rate limits:
 * - Tier 1: 1,000 business-initiated conversations in 24h, 80 messages/second
 * - Tier 2: 10,000 business-initiated conversations in 24h, 200 messages/second
 * - Tier 3+: Higher limits
 */

import Redis from 'ioredis';
import { redisManager } from '../../config/redis-manager';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('WhatsAppRateLimiter');

interface RateLimitConfig {
  maxMessagesPerSecond: number;
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  limit: number;
}

export class WhatsAppRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private keyPrefix = 'whatsapp:ratelimit';

  constructor() {
    // Use shared Redis connection from manager (FIXED: Issue #1)
    this.redis = redisManager.getMainClient();

    // Configure rate limits based on environment
    // Default to conservative Tier 1 limits
    this.config = {
      maxMessagesPerSecond: parseInt(
        process.env.WHATSAPP_MAX_MESSAGES_PER_SECOND || '80',
        10
      ),
      maxMessagesPerMinute: parseInt(
        process.env.WHATSAPP_MAX_MESSAGES_PER_MINUTE || '600',
        10
      ),
      maxMessagesPerHour: parseInt(
        process.env.WHATSAPP_MAX_MESSAGES_PER_HOUR || '10000',
        10
      ),
    };

    logger.info('WhatsApp Rate Limiter initialized', {
      maxPerSecond: this.config.maxMessagesPerSecond,
      maxPerMinute: this.config.maxMessagesPerMinute,
      maxPerHour: this.config.maxMessagesPerHour,
      usingSharedRedis: true,
    });
  }

  /**
   * Check if a message can be sent (sliding window algorithm)
   * Returns rate limit result
   */
  async checkLimit(identifier: string = 'default'): Promise<RateLimitResult> {
    try {
      // Check all time windows
      const secondCheck = await this.checkWindow(
        identifier,
        'second',
        1,
        this.config.maxMessagesPerSecond
      );

      if (!secondCheck.allowed) {
        logger.warn('Rate limit exceeded (per second)', {
          identifier,
          limit: this.config.maxMessagesPerSecond,
        });
        return secondCheck;
      }

      const minuteCheck = await this.checkWindow(
        identifier,
        'minute',
        60,
        this.config.maxMessagesPerMinute
      );

      if (!minuteCheck.allowed) {
        logger.warn('Rate limit exceeded (per minute)', {
          identifier,
          limit: this.config.maxMessagesPerMinute,
        });
        return minuteCheck;
      }

      const hourCheck = await this.checkWindow(
        identifier,
        'hour',
        3600,
        this.config.maxMessagesPerHour
      );

      if (!hourCheck.allowed) {
        logger.warn('Rate limit exceeded (per hour)', {
          identifier,
          limit: this.config.maxMessagesPerHour,
        });
        return hourCheck;
      }

      // All checks passed
      return secondCheck; // Return the most restrictive (seconds)
    } catch (error) {
      // If Redis fails, log error but allow the message (fail open)
      logger.error('Rate limit check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return allowed to prevent blocking messages due to infrastructure issues
      return {
        allowed: true,
        remaining: 0,
        resetIn: 0,
        limit: 0,
      };
    }
  }

  /**
   * Increment the message count after successful send
   */
  async increment(identifier: string = 'default'): Promise<void> {
    try {
      const now = Date.now();

      // Increment all time windows
      await Promise.all([
        this.incrementWindow(identifier, 'second', now, 1),
        this.incrementWindow(identifier, 'minute', now, 60),
        this.incrementWindow(identifier, 'hour', now, 3600),
      ]);

      logger.debug('Rate limit counters incremented', { identifier });
    } catch (error) {
      logger.error('Failed to increment rate limit counters', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check a specific time window using sliding window algorithm
   */
  private async checkWindow(
    identifier: string,
    window: string,
    windowSeconds: number,
    maxCount: number
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}:${identifier}:${window}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Use Redis sorted set with timestamps as scores
    // Remove old entries outside the window
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count entries in current window
    const count = await this.redis.zcard(key);

    const allowed = count < maxCount;
    const remaining = Math.max(0, maxCount - count);
    const resetIn = windowMs;

    return {
      allowed,
      remaining,
      resetIn,
      limit: maxCount,
    };
  }

  /**
   * Increment counter for a specific window
   */
  private async incrementWindow(
    identifier: string,
    window: string,
    timestamp: number,
    windowSeconds: number
  ): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}:${window}`;
    const windowMs = windowSeconds * 1000;

    // Add current timestamp to sorted set
    await this.redis.zadd(key, timestamp, `${timestamp}`);

    // Set expiry to window size + buffer
    await this.redis.expire(key, windowSeconds + 10);
  }

  /**
   * Reset rate limits for an identifier (useful for testing or admin override)
   */
  async reset(identifier: string = 'default'): Promise<void> {
    try {
      const keys = [
        `${this.keyPrefix}:${identifier}:second`,
        `${this.keyPrefix}:${identifier}:minute`,
        `${this.keyPrefix}:${identifier}:hour`,
      ];

      await this.redis.del(...keys);

      logger.info('Rate limits reset', { identifier });
    } catch (error) {
      logger.error('Failed to reset rate limits', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current usage statistics
   */
  async getStats(identifier: string = 'default'): Promise<{
    perSecond: number;
    perMinute: number;
    perHour: number;
  }> {
    try {
      const now = Date.now();

      const [perSecond, perMinute, perHour] = await Promise.all([
        this.getWindowCount(identifier, 'second', now, 1),
        this.getWindowCount(identifier, 'minute', now, 60),
        this.getWindowCount(identifier, 'hour', now, 3600),
      ]);

      return { perSecond, perMinute, perHour };
    } catch (error) {
      logger.error('Failed to get rate limit stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { perSecond: 0, perMinute: 0, perHour: 0 };
    }
  }

  /**
   * Get count for a specific window
   */
  private async getWindowCount(
    identifier: string,
    window: string,
    now: number,
    windowSeconds: number
  ): Promise<number> {
    const key = `${this.keyPrefix}:${identifier}:${window}`;
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count entries in current window
    return await this.redis.zcard(key);
  }

  /**
   * Close method for graceful shutdown
   * Note: Redis connection is managed by RedisManager, not closed here
   */
  async close(): Promise<void> {
    logger.info('WhatsApp Rate Limiter cleanup completed');
    // Redis connection managed by RedisManager - no need to close
  }
}

// Export singleton instance
export const whatsappRateLimiter = new WhatsAppRateLimiter();

