/**
 * Validation Middleware
 * Validates request data using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('ValidationMiddleware');

/**
 * Validate request data against Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Middleware function
 */
export const validate = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request data
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid request data',
          details: errors,
        });
        return;
      }

      logger.error('Validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Validation error',
        message: 'An error occurred during validation',
      });
    }
  };
};


