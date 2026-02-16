/**
 * Queue Setup - BullMQ with Redis
 * 
 * Creates durable job queues for background work.
 * All queues share the same Redis connection configuration.
 */

import { Queue, QueueOptions } from 'bullmq';
import { logger } from '../utils/logger';
import { JobType } from './jobTypes';

// Shared Redis connection configuration
// BullMQ will create its own connection pool from this config
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    // Limit retries to prevent infinite loops
    if (times > 10) {
      logger.error(`❌ Redis connection failed after ${times} attempts`);
      return null; // Stop retrying
    }
    const delay = Math.min(times * 500, 5000); // Max 5 second delay
    logger.info(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  // Connection pool settings
  lazyConnect: false,
  keepAlive: 30000,
  family: 4, // Force IPv4
};

// Queue options - shared config
const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds, then 10s, 20s
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 500,
    },
  },
};

// Create queues for different job types
// Each queue will use BullMQ's internal connection management
export const crawlQueue = new Queue(JobType.CRAWL_TARGET, queueOptions);
export const evidenceQueue = new Queue(JobType.PROCESS_EVIDENCE, queueOptions);
export const emailQueue = new Queue(JobType.SEND_ALERT_EMAIL, queueOptions);

// Wait for queues to be ready
Promise.all([
  crawlQueue.waitUntilReady(),
  evidenceQueue.waitUntilReady(),
  emailQueue.waitUntilReady(),
]).then(() => {
  logger.info('📦 Job queues initialized and connected to Redis');
}).catch((err) => {
  logger.error('❌ Failed to initialize queues:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing job queues...');
  await Promise.all([
    crawlQueue.close(),
    evidenceQueue.close(),
    emailQueue.close(),
  ]);
  logger.info('✅ Queues closed');
});

