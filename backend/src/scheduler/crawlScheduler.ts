/**
 * Crawl Scheduler - Decides WHAT to crawl, NOT how to crawl
 * 
 * This scheduler:
 * - Runs periodically via cron
 * - Scans all companies and their crawl targets
 * - Enqueues crawl jobs (does NOT execute crawls)
 * - Ensures only ONE scheduler instance is active (leader election)
 * 
 * IMPORTANT: This scheduler must NEVER call Firecrawl or perform heavy work.
 * It only decides what needs crawling and enqueues jobs.
 */

import * as cron from 'node-cron';
import { Company } from '../models/Company';
import { CrawlTarget } from '../models/CrawlTarget';
import { enqueueCrawlTargetsBatch } from '../queue/enqueue';
import { CrawlTargetJobData } from '../queue/jobTypes';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

const SCHEDULER_LOCK_KEY = 'scheduler:crawl:lock';
const SCHEDULER_LOCK_TTL = 60; // 60 seconds

/**
 * Acquire scheduler lock using Redis
 * Only one instance should run the scheduler at a time
 */
async function acquireSchedulerLock(redis: Redis): Promise<boolean> {
  const result = await redis.set(
    SCHEDULER_LOCK_KEY,
    'locked',
    'EX',
    SCHEDULER_LOCK_TTL,
    'NX' // Only set if not exists
  );
  return result === 'OK';
}

/**
 * Main scheduler logic - enqueue crawl jobs for all companies
 */
async function scheduleCrawls(redis: Redis) {
  // Try to acquire lock
  const acquired = await acquireSchedulerLock(redis);
  if (!acquired) {
    logger.info('[Scheduler] Another instance is running, skipping');
    return;
  }
  
  logger.info('[Scheduler] 🕐 Starting scheduled crawl cycle');
  
  try {
    // Find all companies
    const companies = await Company.find({});
    logger.info(`[Scheduler] Found ${companies.length} companies`);
    
    let totalTargets = 0;
    const jobsToEnqueue: CrawlTargetJobData[] = [];
    
    // For each company, find its crawl targets
    for (const company of companies) {
      const targets = await CrawlTarget.find({ companyId: company._id });
      
      for (const target of targets) {
        jobsToEnqueue.push({
          companyId: company._id.toString(),
          targetId: target._id.toString(),
          url: target.url,
        });
        totalTargets++;
      }
    }
    
    // Batch enqueue all jobs
    if (jobsToEnqueue.length > 0) {
      await enqueueCrawlTargetsBatch(jobsToEnqueue);
      logger.info(`[Scheduler] ✅ Enqueued ${totalTargets} crawl jobs`);
    } else {
      logger.info('[Scheduler] No targets to crawl');
    }
  } catch (error) {
    logger.error('[Scheduler] ❌ Scheduler cycle failed:', error);
  }
}

/**
 * Start the cron scheduler
 * Runs every 6 hours by default
 */
export function startCrawlScheduler() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  
  // Schedule crawls every 6 hours (0 */6 * * *)
  // For testing, use '*/5 * * * *' for every 5 minutes
  const cronSchedule = process.env.CRAWL_SCHEDULE || '0 */6 * * *';
  
  cron.schedule(cronSchedule, async () => {
    await scheduleCrawls(redis);
  });
  
  logger.info(`🕐 Crawl scheduler started (schedule: ${cronSchedule})`);
  
  // Run immediately on startup for testing
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Scheduler] Running initial crawl cycle (development mode)');
    setTimeout(() => scheduleCrawls(redis), 5000); // Wait 5 seconds after startup
  }
}
