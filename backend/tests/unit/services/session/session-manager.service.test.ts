import { SessionManager } from '../../../../src/services/session/session-manager.service';
import { ConversationState, Message, ExtractedInfo } from '../../../../src/services/session/types';

// Mock dependencies
jest.mock('../../../../src/config/redis-manager');
jest.mock('../../../../src/utils/logger');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    // Mock redis manager
    const { redisManager } = require('../../../../src/config/redis-manager');
    redisManager.getMainClient = jest.fn().mockReturnValue(mockRedis);

    // Set test environment variables
    process.env.SESSION_TIMEOUT_MINUTES = '30';
    process.env.MAX_MESSAGE_HISTORY = '20';

    sessionManager = new SessionManager();
  });

  describe('getSession', () => {
    it('should create new session if not exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const customerId = 'test-customer-123';
      const agentId = 'test-agent-456';

      const session = await sessionManager.getSession(customerId, agentId);

      expect(session).toHaveProperty('id');
      expect(session.customerId).toBe(customerId);
      expect(session.agentId).toBe(agentId);
      expect(session.state).toBe(ConversationState.NEW);
      expect(session.context.messageHistory).toEqual([]);
      expect(session.context.extractedInfo).toEqual({});
      expect(session).toHaveProperty('startTime');
    });

    it('should return existing session', async () => {
      const existingSession = {
        id: 'session-123',
        customerId: 'customer-123',
        agentId: 'agent-456',
        state: ConversationState.ACTIVE,
        startTime: new Date(),
        context: {
          messageHistory: [
            { role: 'user', content: 'Hello', timestamp: new Date() },
          ],
          extractedInfo: { budget: 3000000 },
          lastActivity: new Date(),
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingSession));

      const session = await sessionManager.getSession('customer-123', 'agent-456');

      expect(session.id).toBe('session-123');
      expect(session.state).toBe(ConversationState.ACTIVE);
      expect(session.context.messageHistory).toHaveLength(1);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      await expect(
        sessionManager.getSession('customer-123', 'agent-456')
      ).rejects.toThrow('Redis error');
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      const session = {
        id: 'session-123',
        customerId: 'customer-123',
        agentId: 'agent-456',
        state: ConversationState.ACTIVE,
        startTime: new Date(),
        context: {
          messageHistory: [],
          extractedInfo: {},
          lastActivity: new Date(),
        },
      };

      await sessionManager.updateSession(session);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:customer-123',
        1800, // 30 minutes in seconds
        JSON.stringify(session)
      );
    });

    it('should handle update errors', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const session = {
        id: 'session-123',
        customerId: 'customer-123',
        agentId: 'agent-456',
        state: ConversationState.ACTIVE,
        startTime: new Date(),
        context: {
          messageHistory: [],
          extractedInfo: {},
          lastActivity: new Date(),
        },
      };

      await expect(sessionManager.updateSession(session)).rejects.toThrow('Redis error');
    });
  });

  describe('closeSession', () => {
    it('should close session successfully', async () => {
      await sessionManager.closeSession('customer-123');

      expect(mockRedis.del).toHaveBeenCalledWith('session:customer-123');
    });

    it('should handle close errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw error
      await expect(sessionManager.closeSession('customer-123')).resolves.not.toThrow();
    });
  });
});