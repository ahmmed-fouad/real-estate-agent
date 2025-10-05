/**
 * Main Server Entry Point
 * Express server configuration and startup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';
import routes from './api/routes';
import { swaggerSpec } from './config/swagger.config';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';
import { apiRateLimiter } from './api/middleware/rate-limit.middleware';
import { logger } from './utils/logger';
import { messageQueue } from './services/queue';
import { processMessage } from './services/queue/message-processor';
import { sessionManager, idleCheckService } from './services/session';
import { whatsappRateLimiter } from './services/rate-limiter';
import { redisManager } from './config/redis-manager';
import { disconnectPrisma } from './config/prisma-client';
import { reminderService } from './services/schedule';

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

// API Documentation (Swagger UI)
// As per plan Task 3.1, Deliverable line 749: "API documentation (Swagger/OpenAPI)"
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsApp AI Agent API Docs',
}));

// Root health check
app.get('/', (_req, res) => {
  res.json({
    message: 'WhatsApp AI Sales Agent - API Server',
    status: 'running',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    documentation: '/api-docs',
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
    // Validate required environment variables (Twilio)
    const requiredEnvVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_WHATSAPP_NUMBER',
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

    // Start idle session checker (as per plan line 309: "IDLE - No activity for X minutes")
    logger.info('Starting idle session checker...');
    await idleCheckService.start();
    logger.info('Idle session checker started');

    // Start listening
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        queueEnabled: true,
        idleCheckEnabled: true,
      });

      logger.info('Available endpoints', {
        health: `http://localhost:${PORT}/`,
        apiHealth: `http://localhost:${PORT}/api/health`,
        webhook: `http://localhost:${PORT}/api/webhook/whatsapp`,
        apiDocs: `http://localhost:${PORT}/api-docs`,
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

// Graceful shutdown (FIXED: Issue #1 - Close all connections)
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server, queue, idle checker, reminder service, rate limiter, sessions, Prisma, and Redis');
  await messageQueue.stopProcessing();
  await idleCheckService.stop();
  await reminderService.close();
  await whatsappRateLimiter.close();
  await sessionManager.close();
  await disconnectPrisma(); // Disconnect Prisma client
  await redisManager.closeAll(); // Close all Redis connections
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server, queue, idle checker, reminder service, rate limiter, sessions, Prisma, and Redis');
  await messageQueue.stopProcessing();
  await idleCheckService.stop();
  await reminderService.close();
  await whatsappRateLimiter.close();
  await sessionManager.close();
  await disconnectPrisma(); // Disconnect Prisma client
  await redisManager.closeAll(); // Close all Redis connections
  process.exit(0);
});

// Start the server
startServer();

export default app;

