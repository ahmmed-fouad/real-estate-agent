/**
 * Authentication Types
 * Defines types for JWT authentication, RBAC, and auth-related operations
 * As per plan Task 3.1, Subtask 1: Authentication System (lines 691-703)
 */

import { Request } from 'express';

/**
 * User roles for RBAC (Role-Based Access Control)
 * As per plan line 695: "Role-based access control (Admin, Agent)"
 * 
 * @note Admin Role Usage (Future Implementation - Phase 4):
 * The ADMIN role is currently defined but not actively used in Task 3.1.
 * It is reserved for future administrative features including:
 * - Multi-agent management and oversight
 * - System-wide configuration and settings
 * - Agent status management (activate/suspend agents)
 * - Platform analytics across all agents
 * - Billing and subscription management
 * 
 * Current Implementation (Task 3.1 - MVP):
 * - All registered users get AGENT role by default
 * - Admin-specific routes will be implemented in Phase 4
 * - RBAC middleware (authorize()) is ready to enforce Admin access when needed
 * 
 * To implement Admin features in future:
 * 1. Create admin registration endpoint (protected by existing admin)
 * 2. Add admin-only routes using: authorize(UserRole.ADMIN)
 * 3. Implement admin dashboard and management features
 */
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  id: string;          // Agent ID
  email: string;       // Agent email
  role: UserRole;      // Agent role
  iat?: number;        // Issued at
  exp?: number;        // Expiry
}

/**
 * Tokens returned after authentication
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // Access token expiry in seconds
}

/**
 * Agent registration data
 */
export interface RegisterDTO {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  companyName?: string;
  whatsappNumber: string;
}

/**
 * Agent login credentials
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenDTO {
  refreshToken: string;
}

/**
 * Password reset request (initiate)
 */
export interface ForgotPasswordDTO {
  email: string;
}

/**
 * Password reset (complete)
 */
export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

/**
 * Change password request
 */
export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}

/**
 * Authenticated agent data attached to request
 */
export interface AuthenticatedAgent {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Extended Express Request with authenticated user
 * 
 * Note: user is NON-NULLABLE after authenticate middleware
 * This eliminates the need for redundant null checks in controllers
 * The authenticate middleware guarantees user exists, so controllers can trust req.user
 */
export interface AuthenticatedRequest<P = {}, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedAgent; // Non-nullable - guaranteed by authenticate middleware
}

/**
 * Password reset token data (stored in Redis)
 */
export interface PasswordResetToken {
  agentId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

/**
 * Refresh token data (stored in Redis)
 */
export interface RefreshTokenData {
  agentId: string;
  token: string;
  expiresAt: Date;
  isValid: boolean;
}


