/**
 * Centralized Error Response Utility
 * Eliminates duplication of error handling patterns across controllers
 * 
 * Issue Fix: 32 duplicated error handling blocks across 6 controllers
 * Solution: Single utility for consistent error responses and logging
 */

import { Response } from 'express';
import { createServiceLogger } from './logger';

const logger = createServiceLogger('ErrorResponse');

/**
 * Standard error response structure
 */
export interface ErrorResponseData {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

/**
 * Centralized error response handler
 * Handles logging and consistent error response format
 */
export class ErrorResponse {
  /**
   * Send error response with logging
   * 
   * @param res - Express response object
   * @param error - Error object or unknown error
   * @param errorType - Error type/category for client
   * @param statusCode - HTTP status code (default: 500)
   * @param context - Additional context for logging
   */
  static send(
    res: Response,
    error: unknown,
    errorType: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with context
    logger.error(errorType, {
      error: errorMessage,
      stack: errorStack,
      statusCode,
      ...context,
    });

    // Send consistent error response
    res.status(statusCode).json({
      success: false,
      error: errorType,
      message: errorMessage,
    });
  }

  /**
   * Send validation error response
   */
  static validation(
    res: Response,
    message: string,
    details?: any
  ): void {
    logger.warn('Validation error', { message, details });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message,
      details,
    });
  }

  /**
   * Send not found error response
   */
  static notFound(
    res: Response,
    resource: string,
    identifier?: string | number
  ): void {
    const message = identifier
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;

    logger.warn('Resource not found', { resource, identifier });

    res.status(404).json({
      success: false,
      error: 'Not found',
      message,
    });
  }

  /**
   * Send unauthorized error response
   */
  static unauthorized(
    res: Response,
    message: string = 'Authorization required'
  ): void {
    logger.warn('Unauthorized access attempt', { message });

    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message,
    });
  }

  /**
   * Send forbidden error response
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): void {
    logger.warn('Forbidden access attempt', { message });

    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message,
    });
  }

  /**
   * Send conflict error response
   */
  static conflict(
    res: Response,
    message: string,
    details?: any
  ): void {
    logger.warn('Conflict error', { message, details });

    res.status(409).json({
      success: false,
      error: 'Conflict',
      message,
      details,
    });
  }
}


