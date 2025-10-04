/**
 * Shared Prisma Client
 * Singleton PrismaClient to avoid multiple connection pools
 * 
 * Issue Fix: Multiple PrismaClient instances were creating separate connection pools
 * Solution: Centralized singleton pattern (consistent with redisManager, openaiClient)
 */

import { PrismaClient } from '@prisma/client';
import { createServiceLogger } from '../utils/logger';

const logger = createServiceLogger('PrismaClient');

/**
 * Singleton Prisma client instance
 * Shared across all controllers to prevent connection pool exhaustion
 */
class PrismaClientManager {
  private static instance: PrismaClient | null = null;

  /**
   * Get shared Prisma client instance
   * Creates client on first call, returns same instance on subsequent calls
   */
  static getClient(): PrismaClient {
    if (!PrismaClientManager.instance) {
      logger.info('Initializing shared Prisma client', {
        environment: process.env.NODE_ENV || 'development',
      });

      PrismaClientManager.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
      });

      logger.info('Shared Prisma client initialized successfully');
    }

    return PrismaClientManager.instance;
  }

  /**
   * Disconnect Prisma client
   * Used during graceful shutdown
   */
  static async disconnect(): Promise<void> {
    if (PrismaClientManager.instance) {
      logger.info('Disconnecting Prisma client...');
      await PrismaClientManager.instance.$disconnect();
      PrismaClientManager.instance = null;
      logger.info('Prisma client disconnected successfully');
    }
  }

  /**
   * Reset client instance (useful for testing)
   */
  static resetClient(): void {
    PrismaClientManager.instance = null;
    logger.info('Prisma client instance reset');
  }
}

/**
 * Export getter function for the shared client
 */
export const getPrismaClient = (): PrismaClient => {
  return PrismaClientManager.getClient();
};

/**
 * Export disconnect function for graceful shutdown
 */
export const disconnectPrisma = async (): Promise<void> => {
  await PrismaClientManager.disconnect();
};

/**
 * Export reset function for testing
 */
export const resetPrismaClient = (): void => {
  PrismaClientManager.resetClient();
};

/**
 * Export singleton instance (recommended way to use)
 */
export const prisma = getPrismaClient();


