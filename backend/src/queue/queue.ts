/**
 * Queue Setup - BullMQ with Redis
 * 
 * Creates durable job queues for background work.
 * All queues use the same Redis connection.
 */

import { Queue, QueueOptions } from 'bullmq';
import { logger } from '../utils/logger';
import { JobType } from './jobTypes';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Queue options - shared config
const queueOptions: QueueOptions = {
  connection: redisConfig,
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
export const crawlQueue = new Queue(JobType.CRAWL_TARGET, queueOptions);
export const evidenceQueue = new Queue(JobType.PROCESS_EVIDENCE, queueOptions);
export const emailQueue = new Queue(JobType.SEND_ALERT_EMAIL, queueOptions);

logger.info('📦 Job queues initialized');

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

