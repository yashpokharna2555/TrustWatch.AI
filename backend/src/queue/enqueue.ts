/**
 * Job Enqueue Functions
 * 
 * These functions enqueue background jobs with proper idempotency keys.
 * API and scheduler should ONLY call these - never execute work directly.
 */

import { crawlQueue, evidenceQueue, emailQueue } from './queue';
import {
  JobType,
  CrawlTargetJobData,
  ProcessEvidenceJobData,
  SendAlertEmailJobData,
} from './jobTypes';
import { logger } from '../utils/logger';

/**
 * Enqueue a crawl job for a single target URL
 * Idempotency: same targetId won't be crawled twice if already in queue
 */
export async function enqueueCrawlTarget(data: CrawlTargetJobData) {
  const idempotencyKey = `crawl-${data.companyId}-${data.targetId}`;
  
  await crawlQueue.add(
    JobType.CRAWL_TARGET,
    data,
    {
      jobId: idempotencyKey, // BullMQ uses jobId for idempotency
      priority: 1,
    }
  );
  
  logger.info(`🔄 Enqueued crawl job: ${data.url}`);
}

/**
 * Enqueue evidence parsing job (Reducto PDF parsing)
 * Idempotency: same evidenceId won't be processed twice
 */
export async function enqueueEvidenceProcessing(data: ProcessEvidenceJobData) {
  const idempotencyKey = `evidence-${data.evidenceId}`;
  
  await evidenceQueue.add(
    JobType.PROCESS_EVIDENCE,
    data,
    {
      jobId: idempotencyKey,
      priority: 2, // Lower priority than crawls
    }
  );
  
  logger.info(`📄 Enqueued evidence job: ${data.pdfUrl}`);
}

/**
 * Enqueue alert email job
 * Idempotency: same eventId won't send email twice
 */
export async function enqueueAlertEmail(data: SendAlertEmailJobData) {
  const idempotencyKey = `email-${data.eventId}-${data.userId}`;
  
  await emailQueue.add(
    JobType.SEND_ALERT_EMAIL,
    data,
    {
      jobId: idempotencyKey,
      priority: 0, // Highest priority
    }
  );
  
  logger.info(`📧 Enqueued email job for event: ${data.eventId}`);
}

/**
 * Batch enqueue multiple crawl jobs
 * Used by scheduler to efficiently queue many targets
 */
export async function enqueueCrawlTargetsBatch(targets: CrawlTargetJobData[]) {
  const jobs = targets.map((data) => ({
    name: JobType.CRAWL_TARGET,
    data,
    opts: {
      jobId: `crawl-${data.companyId}-${data.targetId}`,
      priority: 1,
    },
  }));
  
  await crawlQueue.addBulk(jobs);
  logger.info(`🔄 Enqueued ${targets.length} crawl jobs in batch`);
}
