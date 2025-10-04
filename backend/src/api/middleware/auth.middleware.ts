/**
 * Authentication Middleware
 * JWT verification and RBAC (Role-Based Access Control)
 * As per plan Task 3.1, Subtask 1: Authentication System (lines 692-695)
 */

import { Response, NextFunction } from 'express';
import { jwtService } from '../../services/auth/jwt.service';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest, UserRole } from '../../types/auth';

const logger = createServiceLogger('AuthMiddleware');

/**
 * Authenticate JWT token
 * Verifies access token and attaches agent data to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization token required',
        message: 'Please provide a valid Bearer token',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = await jwtService.verifyToken(token);

    // Attach user to request
    req.user = {
      id: payload.id,
      email: payload.email,
      fullName: '', // Will be populated if needed
      role: payload.role,
    };

    logger.debug('Authentication successful', {
      agentId: payload.id,
      email: payload.email,
      role: payload.role,
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.warn('Authentication failed', {
        error: error.message,
        path: req.path,
      });

      if (error.message === 'Token expired') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please refresh your token',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (error.message === 'Token has been revoked') {
        res.status(401).json({
          success: false,
          error: 'Token revoked',
          message: 'Your session has been terminated. Please login again',
          code: 'TOKEN_REVOKED',
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Authorize specific roles (RBAC)
 * As per plan line 695: "Role-based access control (Admin, Agent)"
 * 
 * @param roles - Allowed roles
 * @returns Middleware function
 */
export const authorize = (...roles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          agentId: req.user.id,
          requiredRoles: roles,
          actualRole: req.user.role,
          path: req.path,
        });

        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to access this resource',
        });
        return;
      }

      logger.debug('Authorization successful', {
        agentId: req.user.id,
        role: req.user.role,
      });

      next();
    } catch (error) {
      logger.error('Authorization error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: 'An error occurred while checking permissions',
      });
    }
  };
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await jwtService.verifyToken(token);

      req.user = {
        id: payload.id,
        email: payload.email,
        fullName: '',
        role: payload.role,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};


