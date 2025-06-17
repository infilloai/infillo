import createApp from './app';
import connectDB from './config/database';
import config from './config/env';
import logger from './utils/logger';
import providerService from './services/provider.service';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize providers (storage and AI)
    await providerService.initialize();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      
      const providers = providerService.getCurrentProviders();
      logger.info(`Using providers - Storage: ${providers.storage}, AI: ${providers.ai}`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, starting graceful shutdown...');
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer(); 