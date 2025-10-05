/**
 * Authentication Controller
 * Handles agent authentication operations
 * As per plan Task 3.1, Subtask 1: Authentication System (lines 691-703)
 *
 * Endpoints:
 * - POST /api/auth/register (line 698)
 * - POST /api/auth/login (line 699)
 * - POST /api/auth/refresh-token (line 700)
 * - POST /api/auth/forgot-password (line 701)
 * - POST /api/auth/reset-password (line 702)
 * - POST /api/auth/logout
 * - POST /api/auth/change-password
 */

import { Request, Response } from 'express';
import { jwtService } from '../../services/auth/jwt.service';
import { createServiceLogger } from '../../utils/logger';
import { ErrorResponse } from '../../utils/error-response';
import { AgentService } from '../../services/agent';
import { AuthenticatedRequest, UserRole } from '../../types/auth';
import {
  RegisterData,
  LoginData,
  RefreshTokenData,
  ForgotPasswordData,
  ResetPasswordData,
  ChangePasswordData,
} from '../validators/auth.validators';
import { prisma } from '../../config/prisma-client';

const logger = createServiceLogger('AuthController');

/**
 * Register new agent
 * POST /api/auth/register
 * As per plan line 698
 */
export const register = async (
  req: Request<{}, {}, RegisterData>,
  res: Response
): Promise<void> => {
  try {
    const { email, password, fullName, phoneNumber, companyName, whatsappNumber } = req.body;

    logger.info('Agent registration attempt', { email });

    // Check if agent already exists
    const emailExists = await AgentService.emailExists(email);

    if (emailExists) {
      logger.warn('Registration failed: Email already exists', { email });
      return ErrorResponse.conflict(res, 'An agent with this email already exists');
    }

    // Hash password
    const passwordHash = await jwtService.hashPassword(password);

    // Create agent
    const agent = await AgentService.create({
      email,
      passwordHash,
      fullName,
      phoneNumber: phoneNumber || null,
      companyName: companyName || null,
      whatsappNumber,
      status: 'active',
      settings: {},
    });

    // Generate tokens
    const tokens = await jwtService.generateTokens(agent.id, agent.email, UserRole.AGENT);

    logger.info('Agent registered successfully', {
      agentId: agent.id,
      email: agent.email,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        agent,
        tokens,
      },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Registration failed', 500, { email: req.body.email });
  }
};

/**
 * Login agent
 * POST /api/auth/login
 * As per plan line 699
 */
export const login = async (req: Request<{}, {}, LoginData>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email });

    // Find agent
    const agent = await prisma.agent.findUnique({
      where: { email },
    });

    if (!agent) {
      logger.warn('Login failed: Agent not found', { email });
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if agent is active
    if (agent.status !== 'active') {
      logger.warn('Login failed: Agent not active', {
        email,
        status: agent.status,
      });
      res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: 'Your account has been suspended. Please contact support',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await jwtService.comparePassword(password, agent.passwordHash);

    if (!isPasswordValid) {
      logger.warn('Login failed: Invalid password', { email });
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const tokens = await jwtService.generateTokens(agent.id, agent.email, UserRole.AGENT);

    logger.info('Login successful', {
      agentId: agent.id,
      email: agent.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        agent: {
          id: agent.id,
          email: agent.email,
          fullName: agent.fullName,
          phoneNumber: agent.phoneNumber,
          companyName: agent.companyName,
          whatsappNumber: agent.whatsappNumber,
          status: agent.status,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: req.body.email,
    });

    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 * As per plan line 700
 */
export const refreshToken = async (
  req: Request<{}, {}, RefreshTokenData>,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    logger.info('Token refresh attempt');

    // Refresh access token
    const tokens = await jwtService.refreshAccessToken(token);

    logger.info('Token refreshed successfully');

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
};

/**
 * Initiate password reset
 * POST /api/auth/forgot-password
 * As per plan line 701
 */
export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordData>,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    logger.info('Password reset request', { email });

    // Find agent
    const agent = await prisma.agent.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!agent) {
      logger.warn('Password reset: Agent not found', { email });
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = await jwtService.generatePasswordResetToken(agent.id, agent.email);

    // TODO: Send email with reset link (Phase 4 - Email service)
    // For now, return token in response (development only)
    logger.info('Password reset token generated', {
      agentId: agent.id,
      email: agent.email,
      // Token should be sent via email, not returned in response
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
      // TODO: Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    logger.error('Forgot password error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: req.body.email,
    });

    res.status(500).json({
      success: false,
      error: 'Password reset failed',
      message: 'An error occurred during password reset',
    });
  }
};

/**
 * Complete password reset
 * POST /api/auth/reset-password
 * As per plan line 702
 */
export const resetPassword = async (
  req: Request<{}, {}, ResetPasswordData>,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    logger.info('Password reset completion attempt');

    // Verify reset token
    const tokenData = await jwtService.verifyPasswordResetToken(token);

    if (!tokenData) {
      logger.warn('Password reset failed: Invalid or expired token');
      res.status(400).json({
        success: false,
        error: 'Invalid reset token',
        message: 'The reset token is invalid or has expired',
      });
      return;
    }

    // Hash new password
    const passwordHash = await jwtService.hashPassword(newPassword);

    // Update agent password
    await prisma.agent.update({
      where: { id: tokenData.agentId },
      data: { passwordHash },
    });

    // Delete reset token
    await jwtService.deletePasswordResetToken(token);

    // Revoke all refresh tokens (force re-login)
    await jwtService.revokeRefreshToken(tokenData.agentId);

    logger.info('Password reset successful', {
      agentId: tokenData.agentId,
      email: tokenData.email,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password',
    });
  } catch (error) {
    logger.error('Reset password error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Password reset failed',
      message: 'An error occurred during password reset',
    });
  }
};

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = async (
  req: AuthenticatedRequest<{}, {}, ChangePasswordData>,
  res: Response
): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const agentId = req.user?.id;

    if (!agentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    logger.info('Password change attempt', { agentId });

    // Find agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }

    // Verify old password
    const isOldPasswordValid = await jwtService.comparePassword(oldPassword, agent.passwordHash);

    if (!isOldPasswordValid) {
      logger.warn('Password change failed: Invalid old password', { agentId });
      res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'The current password is incorrect',
      });
      return;
    }

    // Hash new password
    const passwordHash = await jwtService.hashPassword(newPassword);

    // Update password
    await prisma.agent.update({
      where: { id: agentId },
      data: { passwordHash },
    });

    // Revoke refresh tokens (force re-login)
    await jwtService.revokeRefreshToken(agentId);

    logger.info('Password changed successfully', { agentId });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again',
    });
  } catch (error) {
    logger.error('Change password error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      agentId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'An error occurred while changing password',
    });
  }
};

/**
 * Logout agent
 * POST /api/auth/logout
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user?.id;
    const token = req.headers.authorization?.substring(7); // Remove 'Bearer '

    if (!agentId || !token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    logger.info('Logout attempt', { agentId });

    // Blacklist access token
    await jwtService.blacklistToken(token);

    // Revoke refresh token
    await jwtService.revokeRefreshToken(agentId);

    logger.info('Logout successful', { agentId });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      agentId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: 'An error occurred during logout',
    });
  }
};

/**
 * Get current authenticated agent
 * GET /api/auth/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user?.id;

    if (!agentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        companyName: true,
        whatsappNumber: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { agent },
    });
  } catch (error) {
    logger.error('Get me error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      agentId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent data',
    });
  }
};
