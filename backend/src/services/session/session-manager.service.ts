/**
 * Session Manager Service
 * Implements session storage and management using Redis
 * As per plan lines 289-337
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { redisManager } from '../../config/redis-manager';
import { createServiceLogger } from '../../utils/logger';
import {
  ConversationSession,
  ConversationState,
  ISessionManager,
  Message,
  ExtractedInfo,
} from './types';
import { Intent } from '../ai/intent-types';
import { prisma } from '../../config/prisma-client';

const logger = createServiceLogger('SessionManager');

export class SessionManager implements ISessionManager {
  private redis: Redis;
  private sessionTimeoutMinutes: number;
  private maxMessageHistory: number;

  constructor() {
    // Use shared Redis connection from manager (FIXED: Issue #1)
    this.redis = redisManager.getMainClient();

    // Session configuration from environment
    this.sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10);
    this.maxMessageHistory = parseInt(process.env.MAX_MESSAGE_HISTORY || '20', 10);

    logger.info('SessionManager initialized', {
      sessionTimeoutMinutes: this.sessionTimeoutMinutes,
      maxMessageHistory: this.maxMessageHistory,
      usingSharedRedis: true,
    });
  }

  /**
   * Get session by customer ID
   * Implements plan line 334: async getSession(customerId: string)
   * 
   * If session doesn't exist, creates a new one in NEW state
   */
  async getSession(customerId: string): Promise<ConversationSession> {
    try {
      const sessionKey = this.getSessionKey(customerId);

      // Try to get existing session from Redis
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        // Deserialize session using helper method
        const session = this.deserializeSession(sessionData);

        logger.info('Session retrieved from Redis', {
          customerId,
          sessionId: session.id,
          state: session.state,
          messageCount: session.context.messageHistory.length,
          startTime: session.startTime,
          currentIntent: session.context.currentIntent,
          currentTopic: session.context.currentTopic,
        });

        // FIXED: Removed automatic update on read (performance issue)
        // lastActivity should only update on actual activity, not on reads

        return session;
      }

      // Create new session if doesn't exist
      logger.info('Creating new session', { customerId });
      return await this.createNewSession(customerId);
    } catch (error) {
      logger.error('Error getting session', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update existing session
   * Implements plan line 335: async updateSession(session: ConversationSession)
   * 
   * Persists session to Redis with timeout
   * FIXED: Now maintains reverse mapping (sessionId → customerId) for O(1) lookups
   */
  async updateSession(session: ConversationSession): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(session.customerId);

      // Trim message history to max length (as per plan line 296)
      if (session.context.messageHistory.length > this.maxMessageHistory) {
        session.context.messageHistory = session.context.messageHistory.slice(
          -this.maxMessageHistory
        );
      }

      // Update last activity
      session.context.lastActivity = new Date();

      // Serialize and save to Redis
      const sessionData = JSON.stringify(session);
      const ttlSeconds = this.sessionTimeoutMinutes * 60;

      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // 1. Save session data
      pipeline.setex(sessionKey, ttlSeconds, sessionData);
      
      // 2. Maintain reverse mapping (sessionId → customerId) for O(1) lookup
      const reverseKey = this.getSessionIdMappingKey(session.id);
      pipeline.setex(reverseKey, ttlSeconds, session.customerId);
      
      await pipeline.exec();

      logger.debug('Session updated in Redis', {
        sessionId: session.id,
        customerId: session.customerId,
        state: session.state,
        messageCount: session.context.messageHistory.length,
        ttl: `${this.sessionTimeoutMinutes} minutes`,
      });
    } catch (error) {
      logger.error('Error updating session', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Close session
   * Implements plan line 336: async closeSession(sessionId: string)
   * 
   * Marks session as CLOSED and removes from Redis
   * FIXED: Now uses O(1) lookup via reverse mapping instead of scanning all sessions
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      // Use reverse mapping for O(1) lookup
      const customerId = await this.getCustomerIdBySessionId(sessionId);

      if (!customerId) {
        logger.warn('Session not found for closing', { sessionId });
        return;
      }

      // Get the session
      const session = await this.getSession(customerId);

      if (session.id !== sessionId) {
        logger.warn('Session ID mismatch', { 
          requestedSessionId: sessionId, 
          actualSessionId: session.id 
        });
        return;
      }

      // Validate state transition (consistent with updateState behavior)
      if (!this.isValidStateTransition(session.state, ConversationState.CLOSED)) {
        logger.error('Invalid state transition attempted', {
          sessionId,
          from: session.state,
          to: ConversationState.CLOSED,
        });
        throw new Error(
          `Cannot close session: Invalid transition from ${session.state} to CLOSED`
        );
      }

      // Update state to CLOSED
      session.state = ConversationState.CLOSED;
      await this.updateSession(session);

      logger.info('Session closed', {
        sessionId,
        customerId: session.customerId,
      });
    } catch (error) {
      logger.error('Error closing session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a new session for a customer
   * Initial state is NEW as per plan line 306
   */
  private async createNewSession(customerId: string): Promise<ConversationSession> {
    // FIX: Get the first active agent from the database instead of hardcoded ID
    // In a multi-agent setup, this could use routing logic (round-robin, load balancing, etc.)
    let agentId: string;
    
    try {
      const agent = await prisma.agent.findFirst({
        where: {
          status: 'active',
        },
        select: {
          id: true,
        },
      });
      
      if (!agent) {
        throw new Error('No active agents found in database');
      }
      
      agentId = agent.id;
      logger.info('Agent assigned to session', {
        agentId,
        customerId,
      });
    } catch (error) {
      logger.error('Failed to fetch agent, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
      });
      // Fallback to environment variable or error
      agentId = process.env.DEFAULT_AGENT_ID || '';
      if (!agentId) {
        throw new Error('No agent ID available and DEFAULT_AGENT_ID not set');
      }
    }

    const now = new Date();
    const session: ConversationSession = {
      id: uuidv4(),
      customerId,
      agentId,
      state: ConversationState.NEW, // Initial state as per plan line 306
      startTime: now, // Track conversation start time (plan line 300)
      context: {
        messageHistory: [],
        extractedInfo: {},
        lastActivity: now,
        currentIntent: undefined, // Will be set by AI in Phase 2
        currentTopic: undefined,  // Will be set by AI in Phase 2
      },
    };

    await this.updateSession(session);

    logger.info('New session created', {
      sessionId: session.id,
      customerId,
      agentId,
      state: session.state,
      startTime: session.startTime,
    });

    return session;
  }

  /**
   * Add message to session history
   * Maintains last N messages as per plan line 296
   * Note: Trimming is handled by updateSession(), no need to duplicate here
   */
  async addMessageToHistory(
    session: ConversationSession,
    message: Message
  ): Promise<void> {
    session.context.messageHistory.push(message);

    // updateSession() will automatically trim to max length
    await this.updateSession(session);
  }

  // REMOVED: updateExtractedInfo() method
  // This method was never used in the codebase. Entity merging is handled by
  // EntityExtractorService.mergeEntities() which provides more sophisticated
  // merging logic (e.g., handling minPrice/maxPrice, city/district, etc.)
  // Keeping entity extraction logic in one place (EntityExtractorService) follows
  // Single Responsibility Principle and avoids duplication.

  /**
   * Update session state
   * Implements state transitions as per plan line 311
   * FIXED: Now validates state transitions before applying
   */
  async updateState(
    session: ConversationSession,
    newState: ConversationState
  ): Promise<void> {
    const oldState = session.state;

    // Validate transition
    if (!this.isValidStateTransition(oldState, newState)) {
      logger.error('Invalid state transition attempted', {
        sessionId: session.id,
        customerId: session.customerId,
        from: oldState,
        to: newState,
      });
      throw new Error(
        `Invalid state transition from ${oldState} to ${newState}`
      );
    }

    session.state = newState;

    await this.updateSession(session);

    logger.info('Session state changed', {
      sessionId: session.id,
      customerId: session.customerId,
      from: oldState,
      to: newState,
    });
  }

  /**
   * Update current intent/topic
   * As per plan line 301: "Current intent/topic"
   * FIXED: Now uses Intent enum for type safety
   */
  async updateCurrentIntent(
    session: ConversationSession,
    intent: Intent,
    topic?: string
  ): Promise<void> {
    session.context.currentIntent = intent;
    if (topic) {
      session.context.currentTopic = topic;
    }

    await this.updateSession(session);

    logger.info('Current intent/topic updated', {
      sessionId: session.id,
      customerId: session.customerId,
      intent,
      topic,
    });
  }

  /**
   * Check for idle sessions and update their state
   * Sessions with no activity for X minutes → IDLE state
   */
  async checkIdleSessions(): Promise<void> {
    try {
      const sessions = await this.getAllActiveSessions();
      const now = new Date();
      const idleThresholdMs = this.sessionTimeoutMinutes * 60 * 1000;

      for (const session of sessions) {
        if (session.state === ConversationState.ACTIVE) {
          const lastActivityTime = new Date(session.context.lastActivity).getTime();
          const timeSinceActivity = now.getTime() - lastActivityTime;

          if (timeSinceActivity > idleThresholdMs) {
            logger.info('Marking session as IDLE', {
              sessionId: session.id,
              customerId: session.customerId,
              inactiveMinutes: Math.floor(timeSinceActivity / 60000),
            });

            await this.updateState(session, ConversationState.IDLE);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking idle sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all active sessions (for admin/monitoring)
   * FIXED: Uses SCAN instead of KEYS for production safety (non-blocking)
   */
  private async getAllActiveSessions(): Promise<ConversationSession[]> {
    try {
      const sessions: ConversationSession[] = [];
      const pattern = this.getSessionKeyPattern();
      let cursor = '0';

      // Use SCAN instead of KEYS (non-blocking, production-safe)
      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100 // Scan 100 keys at a time
        );

        cursor = result[0];
        const keys = result[1];

        // Fetch all sessions in this batch
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          keys.forEach((key) => pipeline.get(key));
          const results = await pipeline.exec();

          if (results) {
            for (const [error, sessionData] of results) {
              if (!error && sessionData) {
                try {
                  // Use helper method for deserialization
                  const session = this.deserializeSession(sessionData as string);
                  sessions.push(session);
                } catch (parseError) {
                  logger.error('Error parsing session data', {
                    error: parseError instanceof Error ? parseError.message : 'Unknown error',
                  });
                }
              }
            }
          }
        }
      } while (cursor !== '0'); // Continue until cursor returns to 0

      logger.debug('Retrieved all active sessions', { count: sessions.length });
      return sessions;
    } catch (error) {
      logger.error('Error getting all sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Deserialize session from Redis JSON
   * Converts date strings back to Date objects
   * Extracted to avoid duplication (DRY principle)
   */
  private deserializeSession(sessionData: string): ConversationSession {
    const session = JSON.parse(sessionData) as ConversationSession;
    
    // Convert date strings back to Date objects
    session.startTime = new Date(session.startTime);
    session.context.lastActivity = new Date(session.context.lastActivity);
    session.context.messageHistory = session.context.messageHistory.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
    
    return session;
  }

  /**
   * Get Redis key for a session
   */
  private getSessionKey(customerId: string): string {
    return `session:${customerId}`;
  }

  /**
   * Get Redis key pattern for all sessions
   */
  private getSessionKeyPattern(): string {
    return 'session:*';
  }

  /**
   * Get Redis key for sessionId → customerId mapping
   * Used for O(1) reverse lookup
   */
  private getSessionIdMappingKey(sessionId: string): string {
    return `session-index:${sessionId}`;
  }

  /**
   * Get customerId by sessionId (O(1) lookup)
   * Uses reverse mapping maintained in updateSession
   */
  private async getCustomerIdBySessionId(sessionId: string): Promise<string | null> {
    try {
      const reverseKey = this.getSessionIdMappingKey(sessionId);
      const customerId = await this.redis.get(reverseKey);
      return customerId;
    } catch (error) {
      logger.error('Error getting customerId by sessionId', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Validate state transition
   * Implements state machine logic as per plan line 311
   * 
   * Valid transitions:
   * - NEW → ACTIVE (first message)
   * - ACTIVE → IDLE (timeout)
   * - ACTIVE → WAITING_AGENT (escalation)
   * - ACTIVE → CLOSED (end conversation)
   * - IDLE → ACTIVE (customer returns)
   * - IDLE → CLOSED (timeout)
   * - WAITING_AGENT → ACTIVE (agent responds)
   * - WAITING_AGENT → CLOSED (end conversation)
   * - CLOSED → (terminal, no transitions)
   */
  private isValidStateTransition(
    fromState: ConversationState,
    toState: ConversationState
  ): boolean {
    // Same state is always valid (no-op)
    if (fromState === toState) {
      return true;
    }

    // Define valid transitions
    const validTransitions: Record<ConversationState, ConversationState[]> = {
      [ConversationState.NEW]: [ConversationState.ACTIVE],
      [ConversationState.ACTIVE]: [
        ConversationState.IDLE,
        ConversationState.WAITING_AGENT,
        ConversationState.CLOSED,
      ],
      [ConversationState.IDLE]: [
        ConversationState.ACTIVE,
        ConversationState.CLOSED,
      ],
      [ConversationState.WAITING_AGENT]: [
        ConversationState.ACTIVE,
        ConversationState.CLOSED,
      ],
      [ConversationState.CLOSED]: [], // Terminal state - no transitions allowed
    };

    const allowedStates = validTransitions[fromState] || [];
    return allowedStates.includes(toState);
  }

  /**
   * Get conversation duration in minutes
   * Useful for analytics and reporting
   */
  getConversationDuration(session: ConversationSession): number {
    const now = new Date().getTime();
    const start = new Date(session.startTime).getTime();
    const durationMs = now - start;
    return Math.floor(durationMs / 60000); // Convert to minutes
  }

  /**
   * Close method for graceful shutdown
   * Note: Redis connection is managed by RedisManager, not closed here
   */
  async close(): Promise<void> {
    logger.info('SessionManager cleanup completed');
    // Redis connection managed by RedisManager - no need to close
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

