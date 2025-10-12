/**
 * Logger Utility using Pino
 * Configured for structured logging with different levels
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Create base logger
const baseLogger = pino({
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

// Type-safe logger interface
export interface ServiceLogger {
  info(msg: string, obj?: Record<string, any>): void;
  error(msg: string, obj?: Record<string, any>): void;
  warn(msg: string, obj?: Record<string, any>): void;
  debug(msg: string, obj?: Record<string, any>): void;
  trace(msg: string, obj?: Record<string, any>): void;
  fatal(msg: string, obj?: Record<string, any>): void;
  child(bindings: Record<string, any>): ServiceLogger;
}

// Wrap Pino logger with our interface
const wrapLogger = (pinoLogger: pino.Logger): ServiceLogger => {
  return {
    info: (msg: string, obj?: Record<string, any>) => pinoLogger.info(obj || {}, msg),
    error: (msg: string, obj?: Record<string, any>) => pinoLogger.error(obj || {}, msg),
    warn: (msg: string, obj?: Record<string, any>) => pinoLogger.warn(obj || {}, msg),
    debug: (msg: string, obj?: Record<string, any>) => pinoLogger.debug(obj || {}, msg),
    trace: (msg: string, obj?: Record<string, any>) => pinoLogger.trace(obj || {}, msg),
    fatal: (msg: string, obj?: Record<string, any>) => pinoLogger.fatal(obj || {}, msg),
    child: (bindings: Record<string, any>) => wrapLogger(pinoLogger.child(bindings)),
  };
};

export const logger = wrapLogger(baseLogger);

// Create child loggers for different services
export const createServiceLogger = (serviceName: string): ServiceLogger => {
  return logger.child({ service: serviceName });
};
