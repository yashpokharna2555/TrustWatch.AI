import cron from 'node-cron';
import { crawlService } from '../services/crawlService';
import { logger } from '../utils/logger';

export const startCrawlScheduler = () => {
  // Run every 6 hours: 0 */6 * * *
  // For demo/testing, you might want more frequent: */30 * * * * (every 30 minutes)
  
  const schedule = process.env.CRAWL_SCHEDULE || '0 */6 * * *';
  
  logger.info(`Starting crawl scheduler with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    logger.info('Scheduled crawl triggered');
    try {
      await crawlService.crawlAllCompanies();
    } catch (error) {
      logger.error('Scheduled crawl failed:', error);
    }
  });

  logger.info('Crawl scheduler started successfully');
};
