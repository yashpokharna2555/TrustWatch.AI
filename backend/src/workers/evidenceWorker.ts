/**
 * Evidence Worker - Processes PDF parsing jobs from queue
 * 
 * This worker:
 * - Fetches evidence processing jobs from BullMQ
 * - Calls Reducto API to parse PDFs
 * - Extracts structured fields (auditor, report type, dates)
 * - Updates Evidence record in MongoDB
 * - Retries on failure with exponential backoff
 */

import { Worker, Job } from 'bullmq';
import { evidenceQueue, redisConnection } from '../queue/queue';
import { JobType, ProcessEvidenceJobData } from '../queue/jobTypes';
import { Evidence } from '../models/Evidence';
import { reductoClient } from '../services/reducto';
import { logger } from '../utils/logger';

/**
 * Main evidence processor
 * Pure function - all side effects explicit
 */
async function processEvidenceJob(job: Job<ProcessEvidenceJobData>) {
  const { evidenceId, pdfUrl, companyId } = job.data;
  
  logger.info(`[EvidenceWorker] Processing evidence: ${pdfUrl}`, { jobId: job.id });
  
  const evidence = await Evidence.findById(evidenceId);
  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }
  
  try {
    // Call Reducto to parse PDF
    const result = await reductoClient.parsePDF(pdfUrl);
    
    // Extract structured fields
    const fields = reductoClient.extractEvidenceFields(result.text);
    
    // Add page information from metadata
    if (result.metadata?.pageInfo) {
      fields.pageContent = result.metadata.pageInfo;
      fields.pageNumbers = Object.keys(result.metadata.pageInfo)
        .map(Number)
        .sort((a, b) => a - b);
    }
    
    // Update evidence record
    evidence.extractedFields = fields;
    evidence.status = 'READY';
    evidence.processedAt = new Date();
    await evidence.save();
    
    logger.info(`[EvidenceWorker] ✅ Evidence processed: ${evidenceId}`, {
      pages: fields.pageNumbers?.length || 0,
      hasReportType: !!fields.reportType,
      hasAuditor: !!fields.auditor,
    });
  } catch (error: any) {
    logger.error(`[EvidenceWorker] ❌ Evidence processing failed: ${evidenceId}`, error);
    
    // Update evidence with error
    evidence.status = 'FAILED';
    evidence.error = error.message || 'Unknown error during PDF parsing';
    evidence.processedAt = new Date();
    await evidence.save();
    
    throw error; // Re-throw for BullMQ retry
  }
}

/**
 * Create and start the evidence worker
 */
export function startEvidenceWorker() {
  const worker = new Worker(
    JobType.PROCESS_EVIDENCE,
    async (job) => {
      try {
        await processEvidenceJob(job);
      } catch (error: any) {
        logger.error(`[EvidenceWorker] Job failed:`, error);
        throw error; // Re-throw for BullMQ retry
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process up to 2 PDFs in parallel
    }
  );
  
  worker.on('completed', (job) => {
    logger.info(`[EvidenceWorker] ✅ Job completed: ${job.id}`);
  });
  
  worker.on('failed', (job, err) => {
    logger.error(`[EvidenceWorker] ❌ Job failed: ${job?.id}`, err);
  });
  
  logger.info('🚀 Evidence worker started');
  
  return worker;
}
