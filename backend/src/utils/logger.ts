/**
 * Logger Utility using Pino
 * Configured for structured logging with different levels
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: logLevel,
  transport:
    nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child loggers for different services
export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};

