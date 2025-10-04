/**
 * Main Server Entry Point
 * Express server configuration and startup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import routes from './api/routes';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';
import { apiRateLimiter } from './api/middleware/rate-limit.middleware';
import { logger } from './utils/logger';
import { messageQueue } from './services/queue';
import { processMessage } from './services/queue/message-processor';

// Load environment variables
config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware Configuration
 */

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  })
);

// Body parsing with raw body capture for webhook signature validation
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      // Capture raw body for webhook signature verification
      if (req.originalUrl.includes('/webhook')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (apply to all routes except webhook)
app.use((req, res, next) => {
  // Skip rate limiting for webhook endpoints (they have their own)
  if (req.path.startsWith('/api/webhook')) {
    return next();
  }
  return apiRateLimiter(req, res, next);
});

// Request logging middleware
app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

/**
 * Routes
 */
app.use('/api', routes);

// Root health check
app.get('/', (_req, res) => {
  res.json({
    message: 'WhatsApp AI Sales Agent - API Server',
    status: 'running',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_VERIFY_TOKEN',
    ];

    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      logger.error('Missing required environment variables', {
        missing: missingEnvVars,
      });
      logger.warn(
        'Some WhatsApp features may not work. Please check your .env file against env.example'
      );
    }

    // Start Bull queue processing (as per plan lines 231, 271, 95)
    logger.info('Starting message queue processing...');
    messageQueue.startProcessing(processMessage);
    logger.info('Message queue processing started');

    // Start listening
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        queueEnabled: true,
      });

      logger.info('Available endpoints', {
        health: `http://localhost:${PORT}/`,
        apiHealth: `http://localhost:${PORT}/api/health`,
        webhook: `http://localhost:${PORT}/api/webhook/whatsapp`,
      });

      if (NODE_ENV === 'development') {
        logger.info(
          'Development mode: Use ngrok or similar tool to expose webhook endpoint to WhatsApp'
        );
        logger.info(`Example: ngrok http ${PORT}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.message,
    stack: reason.stack,
  });
  // In production, you might want to gracefully shutdown
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server and queue');
  await messageQueue.stopProcessing();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server and queue');
  await messageQueue.stopProcessing();
  process.exit(0);
});

// Start the server
startServer();

export default app;

