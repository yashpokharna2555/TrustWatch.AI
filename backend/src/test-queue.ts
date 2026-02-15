/**
 * Queue Health Check
 * 
 * Quick test to verify Redis connection and BullMQ setup
 * 
 * Run with: tsx backend/src/test-queue.ts
 */

import Redis from 'ioredis';
import { crawlQueue } from './queue/queue';
import { enqueueCrawlTarget } from './queue/enqueue';
import { logger } from './utils/logger';

async function testQueue() {
  try {
    logger.info('🧪 Testing queue setup...');
    
    // Test 1: Redis connection
    logger.info('1️⃣ Testing Redis connection...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    
    const pong = await redis.ping();
    if (pong === 'PONG') {
      logger.info('✅ Redis connected');
    } else {
      throw new Error('Redis not responding');
    }
    
    // Test 2: Enqueue a test job
    logger.info('2️⃣ Testing job enqueue...');
    await enqueueCrawlTarget({
      companyId: 'test-123',
      targetId: 'test-456',
      url: 'https://example.com/test',
    });
    logger.info('✅ Job enqueued');
    
    // Test 3: Check job count
    logger.info('3️⃣ Checking queue...');
    const waitingCount = await crawlQueue.getWaitingCount();
    logger.info(`✅ Jobs in queue: ${waitingCount}`);
    
    // Test 4: Remove test job
    logger.info('4️⃣ Cleaning up test job...');
    const jobs = await crawlQueue.getJobs(['waiting']);
    for (const job of jobs) {
      if (job.data.companyId === 'test-123') {
        await job.remove();
      }
    }
    logger.info('✅ Test job removed');
    
    await redis.quit();
    
    logger.info('');
    logger.info('🎉 Queue setup verified! All tests passed.');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Start the worker: npm run dev:worker');
    logger.info('  2. Start the API: npm run dev');
    logger.info('  3. Add a company via dashboard or API');
    logger.info('');
    
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Queue test failed:', error.message);
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  • Is Redis running? Try: redis-server');
    logger.error('  • Or use Docker: docker-compose up -d');
    logger.error('  • Check REDIS_HOST and REDIS_PORT in .env');
    logger.error('');
    process.exit(1);
  }
}

testQueue();
