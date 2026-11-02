import dotenv from 'dotenv';
import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { validateEnv, getSanitizedConfig } from './config/env.js';
import { logger } from './utils/logger.js';

dotenv.config();

// Global Unhandled Rejection & Uncaught Exception Safety Net
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT_EXCEPTION', 'Fatal uncaught exception occurred. Terminating safely.', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED_REJECTION', 'Fatal unhandled promise rejection occurred. Terminating safely.', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

async function bootstrap() {
  try {
    // 1. Validate environment configuration before booting
    validateEnv();
    const config = getSanitizedConfig();
    logger.info('SERVER_BOOTSTRAP', 'Starting Mahadev Garage API backend', config);

    // 2. Establish database connection
    await connectDB();

    const PORT = config.port;

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info('SERVER_LISTENING', `Mahadev Garage API backend running on port ${PORT}`, {
        port: PORT,
        env: config.nodeEnv,
        healthCheck: `http://localhost:${PORT}/health`,
        readinessCheck: `http://localhost:${PORT}/ready`
      });
    });

    // 4. Graceful Termination Handlers
    const shutdown = async (signal) => {
      logger.info('SERVER_SHUTDOWN_SIGNAL', `Received ${signal}. Commencing graceful shutdown...`);
      server.close(async () => {
        logger.info('SERVER_HTTP_CLOSED', 'HTTP listener closed.');
        try {
          await disconnectDB();
        } catch (dbErr) {
          logger.error('SERVER_DB_DISCONNECT_ERR', 'Error disconnecting database', { error: dbErr.message });
        }
        logger.info('SERVER_EXIT', 'Process exited cleanly.');
        process.exit(0);
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.error('SERVER_SHUTDOWN_TIMEOUT', 'Forced shutdown timeout exceeded. Exiting immediately.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('SERVER_BOOTSTRAP_FAILED', 'Failed to bootstrap backend server', { error: err.message });
    process.exit(1);
  }
}

bootstrap();
