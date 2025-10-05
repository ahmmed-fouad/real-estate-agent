import { JWTService } from '../../../../src/services/auth/jwt.service';
import { UserRole } from '../../../../src/types/auth';

// Mock dependencies
jest.mock('../../../../src/config/redis-manager');
jest.mock('../../../../src/config/jwt.config');
jest.mock('../../../../src/utils/logger');

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockRedis: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Redis client
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
    };

    // Mock redis manager
    const { redisManager } = require('../../../../src/config/redis-manager');
    redisManager.getMainClient = jest.fn().mockReturnValue(mockRedis);

    // Mock JWT config
    const { jwtConfig } = require('../../../../src/config/jwt.config');
    jwtConfig.secret = 'test-secret';
    jwtConfig.issuer = 'test-issuer';
    jwtConfig.accessExpiration = '15m';
    jwtConfig.refreshExpiration = '7d';

    jwtService = new JWTService();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const role = UserRole.AGENT;

      const tokens = await jwtService.generateTokens(agentId, email, role);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should store refresh token in Redis', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';

      await jwtService.generateTokens(agentId, email);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `refresh_token:${agentId}`,
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(
        jwtService.generateTokens('test-id', 'test@example.com')
      ).rejects.toThrow('Token generation failed');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      
      const { accessToken } = await jwtService.generateTokens(agentId, email);
      const decoded = await jwtService.verifyToken(accessToken);

      expect(decoded).toHaveProperty('id', agentId);
      expect(decoded).toHaveProperty('email', email);
    });

    it('should reject blacklisted token', async () => {
      mockRedis.exists.mockResolvedValue(1); // Token is blacklisted

      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const { accessToken } = await jwtService.generateTokens(agentId, email);

      await expect(jwtService.verifyToken(accessToken)).rejects.toThrow('Token has been revoked');
    });

    it('should reject invalid token', async () => {
      await expect(jwtService.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      
      const { refreshToken } = await jwtService.generateTokens(agentId, email);
      
      // Mock stored refresh token
      const storedTokenData = {
        agentId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isValid: true,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(storedTokenData));

      const newTokens = await jwtService.refreshAccessToken(refreshToken);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(jwtService.refreshAccessToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should reject revoked refresh token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const { refreshToken } = await jwtService.generateTokens(agentId, email);
      
      const storedTokenData = {
        agentId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isValid: false, // Revoked
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(storedTokenData));

      await expect(jwtService.refreshAccessToken(refreshToken)).rejects.toThrow('Refresh token has been revoked');
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'test-password';
      const hashedPassword = await jwtService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('should handle hashing errors', async () => {
      // Mock bcrypt to throw error
      const bcrypt = require('bcrypt');
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Hashing error'));

      await expect(jwtService.hashPassword('test-password')).rejects.toThrow('Password hashing failed');
    });
  });

  describe('comparePassword', () => {
    it('should compare password correctly', async () => {
      const password = 'test-password';
      const hashedPassword = await jwtService.hashPassword(password);

      const isValid = await jwtService.comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await jwtService.comparePassword('wrong-password', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should handle comparison errors', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockRejectedValue(new Error('Comparison error'));

      await expect(jwtService.comparePassword('test', 'hash')).rejects.toThrow('Password comparison failed');
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate reset token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';

      const token = await jwtService.generatePasswordResetToken(agentId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(30); // UUID length
    });

    it('should store reset token in Redis', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';

      await jwtService.generatePasswordResetToken(agentId, email);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('reset_token:'),
        3600, // 1 hour TTL
        expect.any(String)
      );
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify valid reset token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const token = await jwtService.generatePasswordResetToken(agentId, email);

      // Mock Redis to return the token data
      const tokenData = {
        agentId,
        email,
        token,
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(tokenData));

      const result = await jwtService.verifyPasswordResetToken(token);

      expect(result).toBeDefined();
      expect(result?.agentId).toBe(agentId);
      expect(result?.email).toBe(email);
    });

    it('should return null for non-existent token', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await jwtService.verifyPasswordResetToken('non-existent-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const token = await jwtService.generatePasswordResetToken(agentId, email);

      const expiredTokenData = {
        agentId,
        email,
        token,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(expiredTokenData));

      const result = await jwtService.verifyPasswordResetToken(token);
      expect(result).toBeNull();
    });
  });

  describe('deletePasswordResetToken', () => {
    it('should delete reset token', async () => {
      const token = 'test-token';

      await jwtService.deletePasswordResetToken(token);

      expect(mockRedis.del).toHaveBeenCalledWith(`reset_token:${token}`);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token', async () => {
      const agentId = 'test-agent-id';

      await jwtService.revokeRefreshToken(agentId);

      expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${agentId}`);
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token', async () => {
      const agentId = 'test-agent-id';
      const email = 'test@example.com';
      const { accessToken } = await jwtService.generateTokens(agentId, email);

      await jwtService.blacklistToken(accessToken);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.any(Number),
        '1'
      );
    });

    it('should handle invalid token gracefully', async () => {
      await expect(jwtService.blacklistToken('invalid-token')).resolves.not.toThrow();
    });
  });
});
