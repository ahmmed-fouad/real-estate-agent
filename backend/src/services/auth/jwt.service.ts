/**
 * JWT Service
 * Handles JWT token generation, validation, and management
 * As per plan Task 3.1, Subtask 1: JWT-based authentication (line 692)
 * 
 * Features:
 * - Generate access and refresh tokens
 * - Validate and verify tokens
 * - Store/retrieve refresh tokens in Redis
 * - Token blacklisting support
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { jwtConfig } from '../../config/jwt.config';
import { redisManager } from '../../config/redis-manager';
import { createServiceLogger } from '../../utils/logger';
import {
  JWTPayload,
  AuthTokens,
  PasswordResetToken,
  RefreshTokenData,
  UserRole,
} from '../../types/auth';

const logger = createServiceLogger('JWTService');

/**
 * JWT Service for authentication operations
 */
export class JWTService {
  private redis;
  private readonly saltRounds = 10;
  private readonly refreshTokenPrefix = 'refresh_token:';
  private readonly resetTokenPrefix = 'reset_token:';
  private readonly blacklistPrefix = 'blacklist:';

  constructor() {
    this.redis = redisManager.getMainClient();
    logger.info('JWT Service initialized', {
      issuer: jwtConfig.issuer,
      accessExpiration: jwtConfig.accessExpiration,
      refreshExpiration: jwtConfig.refreshExpiration,
    });
  }

  /**
   * Generate JWT access and refresh tokens
   * 
   * @param agentId - Agent ID
   * @param email - Agent email
   * @param role - Agent role
   * @returns Access and refresh tokens
   */
  async generateTokens(
    agentId: string,
    email: string,
    role: UserRole = UserRole.AGENT
  ): Promise<AuthTokens> {
    try {
      const payload: JWTPayload = {
        id: agentId,
        email,
        role,
      };

      // Generate access token
      const accessToken = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.accessExpiration,
        issuer: jwtConfig.issuer,
      });

      // Generate refresh token with unique ID
      const refreshTokenId = uuidv4();
      const refreshToken = jwt.sign(
        { ...payload, jti: refreshTokenId },
        jwtConfig.secret,
        {
          expiresIn: jwtConfig.refreshExpiration,
          issuer: jwtConfig.issuer,
        }
      );

      // Store refresh token in Redis
      await this.storeRefreshToken(agentId, refreshToken, refreshTokenId);

      // Calculate expiration time in seconds
      const expiresIn = this.calculateExpirySeconds(jwtConfig.accessExpiration);

      logger.info('Tokens generated successfully', {
        agentId,
        email,
        role,
        expiresIn,
      });

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      logger.error('Failed to generate tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   * 
   * @param token - JWT token to verify
   * @returns Decoded payload
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Verify token signature and expiry
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired', { error: error.message });
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token', { error: error.message });
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token
   * @returns New tokens
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await this.getRefreshToken(decoded.id);
      if (!storedToken || storedToken.token !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      if (!storedToken.isValid) {
        throw new Error('Refresh token has been revoked');
      }

      // Invalidate old refresh token
      await this.revokeRefreshToken(decoded.id);

      // Generate new tokens
      const newTokens = await this.generateTokens(
        decoded.id,
        decoded.email,
        decoded.role
      );

      logger.info('Access token refreshed', { agentId: decoded.id });

      return newTokens;
    } catch (error) {
      logger.error('Failed to refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      logger.error('Failed to hash password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   * 
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if match
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hash);
      return isMatch;
    } catch (error) {
      logger.error('Failed to compare password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Generate password reset token
   * 
   * @param agentId - Agent ID
   * @param email - Agent email
   * @returns Reset token
   */
  async generatePasswordResetToken(
    agentId: string,
    email: string
  ): Promise<string> {
    try {
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      const tokenData: PasswordResetToken = {
        agentId,
        email,
        token: resetToken,
        expiresAt,
      };

      // Store in Redis with 1-hour TTL
      const key = `${this.resetTokenPrefix}${resetToken}`;
      await this.redis.setex(
        key,
        3600,
        JSON.stringify(tokenData)
      );

      logger.info('Password reset token generated', { agentId, email });

      return resetToken;
    } catch (error) {
      logger.error('Failed to generate reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      throw new Error('Reset token generation failed');
    }
  }

  /**
   * Verify password reset token
   * 
   * @param token - Reset token
   * @returns Token data if valid
   */
  async verifyPasswordResetToken(
    token: string
  ): Promise<PasswordResetToken | null> {
    try {
      const key = `${this.resetTokenPrefix}${token}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const tokenData: PasswordResetToken = JSON.parse(data);

      // Check expiry
      if (new Date(tokenData.expiresAt) < new Date()) {
        await this.redis.del(key);
        return null;
      }

      return tokenData;
    } catch (error) {
      logger.error('Failed to verify reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Delete password reset token
   * 
   * @param token - Reset token
   */
  async deletePasswordResetToken(token: string): Promise<void> {
    try {
      const key = `${this.resetTokenPrefix}${token}`;
      await this.redis.del(key);
      logger.info('Password reset token deleted', { token });
    } catch (error) {
      logger.error('Failed to delete reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Revoke refresh token
   * 
   * @param agentId - Agent ID
   */
  async revokeRefreshToken(agentId: string): Promise<void> {
    try {
      const key = `${this.refreshTokenPrefix}${agentId}`;
      await this.redis.del(key);
      logger.info('Refresh token revoked', { agentId });
    } catch (error) {
      logger.error('Failed to revoke refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
    }
  }

  /**
   * Blacklist token (for logout)
   * 
   * @param token - Token to blacklist
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return;
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        const key = `${this.blacklistPrefix}${token}`;
        await this.redis.setex(key, ttl, '1');
        logger.info('Token blacklisted', { agentId: decoded.id });
      }
    } catch (error) {
      logger.error('Failed to blacklist token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if token is blacklisted
   * 
   * @param token - Token to check
   * @returns True if blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.blacklistPrefix}${token}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(
    agentId: string,
    token: string,
    tokenId: string
  ): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token');
      }

      const expiresAt = new Date(decoded.exp * 1000);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      const tokenData: RefreshTokenData = {
        agentId,
        token,
        expiresAt,
        isValid: true,
      };

      const key = `${this.refreshTokenPrefix}${agentId}`;
      await this.redis.setex(
        key,
        ttl,
        JSON.stringify(tokenData)
      );
    } catch (error) {
      logger.error('Failed to store refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get refresh token from Redis
   */
  private async getRefreshToken(
    agentId: string
  ): Promise<RefreshTokenData | null> {
    try {
      const key = `${this.refreshTokenPrefix}${agentId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const tokenData: RefreshTokenData = JSON.parse(data);
      return tokenData;
    } catch (error) {
      logger.error('Failed to get refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      return null;
    }
  }

  /**
   * Calculate expiry time in seconds
   */
  private calculateExpirySeconds(expiration: string | number): number {
    if (typeof expiration === 'number') {
      return expiration;
    }

    const matches = expiration.match(/^(\d+)([smhd])$/);
    if (!matches) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

/**
 * Export singleton instance
 */
export const jwtService = new JWTService();


