/**
 * Express Type Extensions
 * Extend Express Request interface with custom properties
 */

declare namespace Express {
  export interface Request {
    rawBody?: string;
  }
}

