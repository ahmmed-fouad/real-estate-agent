/**
 * JWT Configuration
 * Manages JWT settings for authentication
 * As per plan Task 3.1, Subtask 1: JWT-based authentication (line 692)
 */

import { config } from 'dotenv';
config();

export interface JWTConfig {
  secret: string;
  accessExpiration: string | number;
  refreshExpiration: string | number;
  issuer: string;
}

/**
 * Get JWT configuration from environment variables
 */
export const getJWTConfig = (): JWTConfig => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'JWT_SECRET is required in environment variables. Please set it in .env file.'
    );
  }

  // JWT_EXPIRES_IN is already in env.example (from earlier config)
  // JWT_ACCESS_EXPIRATION and JWT_REFRESH_EXPIRATION are new (Task 3.1)
  const accessExpiration = process.env.JWT_ACCESS_EXPIRATION || process.env.JWT_EXPIRES_IN || '15m';
  const refreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';
  const issuer = process.env.JWT_ISSUER || 'whatsapp-ai-agent';

  return {
    secret,
    accessExpiration,
    refreshExpiration,
    issuer,
  };
};

/**
 * Export singleton configuration
 */
export const jwtConfig = getJWTConfig();


