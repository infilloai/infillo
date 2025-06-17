import mongoose from 'mongoose';
import config from './env';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    
    const conn = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB; 