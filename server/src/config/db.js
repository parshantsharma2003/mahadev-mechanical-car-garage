import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

let isConnected = false;

/**
 * Connect to MongoDB with safe connection pooling and timeout settings.
 * Works with MongoDB Atlas replica sets and local instances.
 */
export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  const options = {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    autoIndex: process.env.NODE_ENV !== 'production' // Disable automatic runtime index build in prod
  };

  try {
    const conn = await mongoose.connect(uri, options);
    isConnected = true;
    logger.info('DB_CONNECTED', 'MongoDB connection established successfully.');
    return conn;
  } catch (error) {
    isConnected = false;
    logger.error('DB_CONNECTION_FAILED', 'Connection attempt failed', { error: error.message });
    throw error;
  }
}

// Global Connection Event Listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('DB_READY', 'Mongoose connection opened.');
});

mongoose.connection.on('error', (err) => {
  logger.error('DB_RUNTIME_ERROR', 'Mongoose runtime error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('DB_DISCONNECTED', 'Mongoose connection lost.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('DB_RECONNECTED', 'Mongoose connection restored.');
});

/**
 * Disconnect cleanly (useful for graceful server shutdown and test suites).
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] Mongoose disconnected cleanly.');
  }
}

/**
 * Checks whether the connected MongoDB instance supports multi-document transactions.
 * Transactions require a Replica Set (e.g., MongoDB Atlas) or Sharded cluster.
 * Returns false on standalone instances.
 *
 * @returns {Promise<boolean>}
 */
export async function isTransactionSupported() {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return false;
    }
    const adminDb = mongoose.connection.db.admin();
    const hello = await adminDb.command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    return false;
  }
}


