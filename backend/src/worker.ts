/**
 * Worker Process Entry Point
 * 
 * This process runs ONLY workers - no API server.
 * It processes background jobs from the queue.
 * 
 * To run: npm run worker
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { startCrawlWorker } from './workers/crawlWorker';
import { startEvidenceWorker } from './workers/evidenceWorker';
import { logger } from './utils/logger';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('✅ MongoDB connected (worker)');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Start workers
async function startWorkers() {
  await connectDB();
  
  logger.info('🚀 Starting workers...');
  
  // Start crawl worker
  const crawlWorker = startCrawlWorker();
  
  // Start evidence worker
  const evidenceWorker = startEvidenceWorker();
  
  logger.info('✅ All workers started');
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down workers...');
    await crawlWorker.close();
    await evidenceWorker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down workers...');
    await crawlWorker.close();
    await evidenceWorker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

startWorkers().catch((error) => {
  logger.error('Failed to start workers:', error);
  process.exit(1);
});
