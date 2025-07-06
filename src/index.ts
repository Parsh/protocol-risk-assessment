/**
 * DeFi Protocol Risk Assessment Microservice
 * Entry point for the application
 */

import { createApp } from './app';
import { config } from './config/environment';
import { logger } from './middleware/logging';
import { dataDirectoryService } from './services/data-directory.service';

async function startServer(): Promise<void> {
  try {
    // Initialize data directory structure
    logger.info('🔧 Initializing data directory...');
    await dataDirectoryService.initialize();

    // Create Express application
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 DeFi Risk Assessment API started`, {
        port: config.port,
        environment: config.nodeEnv,
        nodeVersion: process.version,
        platform: process.platform,
        dataDirectory: config.dataDir,
      });
      
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`📁 Data directory: ${config.dataDir}`);
      console.log(`📋 Health check: http://localhost:${config.port}/api/v1/status`);
      console.log(`🗄️  File storage: Initialized and ready`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown', err);
          process.exit(1);
        }
        
        logger.info('Server closed gracefully');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default createApp;
