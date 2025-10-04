/**
 * Cryptographic Utilities
 * For webhook signature validation and security
 */

import crypto from 'crypto';
import { createServiceLogger } from './logger';

const logger = createServiceLogger('CryptoUtils');

/**
 * Verify webhook signature using HMAC SHA256
 * As per plan lines 1544-1562
 * 
 * @param payload - Raw request body string
 * @param signature - Signature from request header
 * @param secret - Webhook secret key
 * @returns boolean - Whether signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Generate expected signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Webhook signature validation failed', {
        receivedSignature: signature.substring(0, 10) + '...',
        expectedSignature: expectedSignature.substring(0, 10) + '...',
      });
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Generate a secure random token
 * Useful for generating webhook verify tokens
 * 
 * @param length - Length of token in bytes (default 32)
 * @returns string - Hex encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a string using SHA256
 * 
 * @param text - Text to hash
 * @returns string - Hex encoded hash
 */
export function sha256Hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

