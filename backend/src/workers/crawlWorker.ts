/**
 * Crawl Worker - Processes crawl jobs from queue
 * 
 * This worker:
 * - Fetches crawl jobs from BullMQ
 * - Calls Firecrawl to scrape content
 * - Extracts claims using claimExtractor
 * - Detects changes and creates events
 * - Enqueues follow-up evidence jobs
 * - Retries on failure with exponential backoff
 */

import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { createHash } from 'crypto';
import { crawlQueue } from '../queue/queue';
import { JobType, CrawlTargetJobData } from '../queue/jobTypes';
import { enqueueEvidenceProcessing } from '../queue/enqueue';
import { Company } from '../models/Company';
import { CrawlTarget } from '../models/CrawlTarget';
import { Claim } from '../models/Claim';
import { ClaimVersion } from '../models/ClaimVersion';
import { ChangeEvent } from '../models/ChangeEvent';
import { CrawlRun } from '../models/CrawlRun';
import { Evidence } from '../models/Evidence';
import { User } from '../models/User';
import { firecrawlClient } from '../services/firecrawl';
import { claimExtractor } from '../services/claimExtractor';
import { demoAdapter } from '../services/demoAdapter';
import { sendAlertEmail } from '../services/email';
import { emitCrawlProgress } from '../utils/crawlProgress';
import { logger } from '../utils/logger';

// Redis connection config for worker
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * Main crawl worker processor
 * This function is pure - all side effects (DB, API calls) are explicit
 */
async function processCrawlJob(job: Job<CrawlTargetJobData>) {
  const { companyId, targetId, url } = job.data;
  
  logger.info(`[Worker] Processing crawl job: ${url}`, { jobId: job.id });
  
  // Fetch company and target
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }
  
  const target = await CrawlTarget.findById(targetId);
  if (!target) {
    throw new Error(`CrawlTarget not found: ${targetId}`);
  }
  
  // Find or create crawl run
  let crawlRun = await CrawlRun.findOne({
    companyId: new Types.ObjectId(companyId),
    status: 'running',
  });
  
  if (!crawlRun) {
    crawlRun = await CrawlRun.create({
      companyId,
      startedAt: new Date(),
      status: 'running',
    });
  }
  
  // Emit progress
  const pageName = new URL(url).pathname.replace('/', '') || 'homepage';
  emitCrawlProgress({
    companyId,
    stage: 'scraping',
    message: `🔥 Firecrawl: Scraping ${pageName}...`,
    timestamp: new Date(),
    details: { url },
  });
  
  // Fetch content (demo adapter or Firecrawl)
  let content: string;
  if (process.env.DEMO_MODE === 'true' && url.includes('demo-sites')) {
    logger.info(`[Worker] Using demo adapter for: ${url}`);
    content = await demoAdapter.fetchDemoContent(url);
  } else {
    logger.info(`[Worker] Using Firecrawl for: ${url}`);
    const result = await firecrawlClient.scrape(url);
    content = result.markdown;
  }
  
  emitCrawlProgress({
    companyId,
    stage: 'scraped',
    message: `✅ Scraped ${pageName} (${content.length} chars)`,
    timestamp: new Date(),
  });
  
  // Compute content hash
  const contentHash = createHash('sha256').update(content).digest('hex');
  
  // Check if content changed
  if (target.lastHash && target.lastHash === contentHash) {
    logger.info(`[Worker] No changes detected for ${url}`);
    emitCrawlProgress({
      companyId,
      stage: 'no_changes',
      message: `⏭️ No changes in ${pageName}`,
      timestamp: new Date(),
    });
    return;
  }
  
  // Extract claims
  emitCrawlProgress({
    companyId,
    stage: 'extracting',
    message: `🔍 Extracting claims from ${pageName}...`,
    timestamp: new Date(),
  });
  
  const extractedClaims = claimExtractor.extract(content, url);
  logger.info(`[Worker] Extracted ${extractedClaims.length} claims from ${url}`);
  
  emitCrawlProgress({
    companyId,
    stage: 'claims_extracted',
    message: `📊 Found ${extractedClaims.length} claims`,
    timestamp: new Date(),
    details: { claimTypes: extractedClaims.map((c: any) => c.normalizedKey) },
  });
  
  // Process each claim
  for (const extracted of extractedClaims) {
    await processClaimChange(extracted, company, target, crawlRun);
    crawlRun.claimsExtracted++;
  }
  
  // Check for removed claims
  await checkRemovedClaims(company, target, extractedClaims, crawlRun);
  
  // Update target
  target.lastHash = contentHash;
  target.lastCrawledAt = new Date();
  await target.save();
  
  // Extract evidence (enqueue PDF parsing jobs)
  await extractAndEnqueueEvidence(content, company, target);
  
  // Update crawl run
  crawlRun.pagesCrawled++;
  await crawlRun.save();
  
  logger.info(`[Worker] Crawl job completed: ${url}`);
}

/**
 * Process a single claim change
 * Pure business logic for claim versioning and event detection
 */
async function processClaimChange(
  extracted: any,
  company: any,
  target: any,
  crawlRun: any
) {
  const now = new Date();
  
  let claim = await Claim.findOne({
    companyId: company._id,
    claimType: extracted.claimType,
    normalizedKey: extracted.normalizedKey,
  });
  
  const contentHash = createHash('sha256')
    .update(extracted.rawTextSnippet)
    .digest('hex');
  
  if (!claim) {
    // New claim
    claim = await Claim.create({
      companyId: company._id,
      claimType: extracted.claimType,
      normalizedKey: extracted.normalizedKey,
      currentStatus: 'ACTIVE',
      firstSeenAt: now,
      lastSeenAt: now,
      currentSnippet: extracted.rawTextSnippet,
      currentSourceUrl: target.url,
      confidence: extracted.confidence,
    });
    
    await ClaimVersion.create({
      claimId: claim._id,
      companyId: company._id,
      snippet: extracted.rawTextSnippet,
      sourceUrl: target.url,
      contentHash,
      seenAt: now,
      polarity: extracted.polarity,
      extractedMeta: extracted.extractedMeta,
    });
    
    const event = await ChangeEvent.create({
      companyId: company._id,
      claimType: extracted.claimType,
      normalizedKey: extracted.normalizedKey,
      eventType: 'ADDED',
      severity: 'Info',
      newSnippet: extracted.rawTextSnippet,
      sourceUrl: target.url,
      detectedAt: now,
    });
    
    crawlRun.eventsCreated++;
    logger.info(`[Worker] New claim added: ${extracted.normalizedKey}`);
  } else {
    // Existing claim - check for changes
    const lastVersion = await ClaimVersion.findOne({
      claimId: claim._id,
    }).sort({ seenAt: -1 });
    
    if (!lastVersion || lastVersion.contentHash !== contentHash) {
      await ClaimVersion.create({
        claimId: claim._id,
        companyId: company._id,
        snippet: extracted.rawTextSnippet,
        sourceUrl: target.url,
        contentHash,
        seenAt: now,
        polarity: extracted.polarity,
        extractedMeta: extracted.extractedMeta,
      });
      
      const oldSnippet = claim.currentSnippet;
      const newSnippet = extracted.rawTextSnippet;
      
      let eventType: any = 'ADDED';
      let severity: any = 'Info';
      
      // Detect change type
      if (claimExtractor.detectWeakening(oldSnippet, newSnippet)) {
        eventType = 'WEAKENED';
        severity = 'Critical';
      } else if (extracted.extractedMeta?.value && lastVersion.extractedMeta?.value) {
        const { changed, decreased } = claimExtractor.detectNumericChange(
          lastVersion.extractedMeta,
          extracted.extractedMeta
        );
        if (changed) {
          eventType = 'NUMBER_CHANGED';
          severity = decreased ? 'Medium' : 'Info';
        }
      } else if (lastVersion.polarity !== extracted.polarity) {
        eventType = 'REVERSED';
        severity = 'Critical';
      }
      
      const event = await ChangeEvent.create({
        companyId: company._id,
        claimType: extracted.claimType,
        normalizedKey: extracted.normalizedKey,
        eventType,
        severity,
        oldSnippet,
        newSnippet,
        sourceUrl: target.url,
        detectedAt: now,
      });
      
      crawlRun.eventsCreated++;
      
      claim.currentSnippet = newSnippet;
      claim.currentSourceUrl = target.url;
      claim.lastSeenAt = now;
      await claim.save();
      
      await updateRiskScore(company, eventType, severity);
      
      // Enqueue email for critical events
      if (severity === 'Critical') {
        await sendCriticalAlert(event, company);
      }
    } else {
      claim.lastSeenAt = now;
      await claim.save();
    }
  }
}

/**
 * Check for removed claims
 */
async function checkRemovedClaims(
  company: any,
  target: any,
  extractedClaims: any[],
  crawlRun: any
) {
  const existingClaims = await Claim.find({
    companyId: company._id,
    currentSourceUrl: target.url,
    currentStatus: 'ACTIVE',
  });
  
  const extractedKeys = new Set(extractedClaims.map((c: any) => c.normalizedKey));
  
  for (const claim of existingClaims) {
    if (!extractedKeys.has(claim.normalizedKey)) {
      logger.warn(`[Worker] Claim removed: ${claim.normalizedKey}`);
      
      claim.currentStatus = 'REMOVED';
      await claim.save();
      
      const severity = claim.claimType === 'compliance' ? 'Critical' : 'Medium';
      
      const event = await ChangeEvent.create({
        companyId: company._id,
        claimType: claim.claimType,
        normalizedKey: claim.normalizedKey,
        eventType: 'REMOVED',
        severity,
        oldSnippet: claim.currentSnippet,
        sourceUrl: target.url,
        detectedAt: new Date(),
      });
      
      crawlRun.eventsCreated++;
      await updateRiskScore(company, 'REMOVED', severity);
      
      if (severity === 'Critical') {
        await sendCriticalAlert(event, company);
      }
    }
  }
}

/**
 * Update company risk score
 */
async function updateRiskScore(company: any, eventType: string, severity: string) {
  let scoreIncrease = 0;
  
  if (eventType === 'REMOVED' && severity === 'Critical') {
    scoreIncrease = 40;
  } else if (eventType === 'WEAKENED' && severity === 'Critical') {
    scoreIncrease = 40;
  } else if (eventType === 'NUMBER_CHANGED' && severity === 'Medium') {
    scoreIncrease = 10;
  } else if (eventType === 'REVERSED') {
    scoreIncrease = 30;
  }
  
  if (scoreIncrease > 0) {
    company.riskScore = Math.min(100, company.riskScore + scoreIncrease);
    await company.save();
    logger.info(`[Worker] Updated risk score for ${company.domain}: ${company.riskScore}`);
  }
}

/**
 * Send critical alert (or enqueue email job)
 */
async function sendCriticalAlert(event: any, company: any) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = await ChangeEvent.countDocuments({
      companyId: company._id,
      severity: 'Critical',
      emailedAt: { $gte: oneHourAgo },
    });
    
    if (recentAlerts >= 5) {
      logger.warn(`[Worker] Rate limit hit for company ${company._id}`);
      return;
    }
    
    const user = await User.findById(company.userId);
    if (!user) {
      logger.error('[Worker] User not found', { companyId: company._id });
      return;
    }
    
    await sendAlertEmail({
      to: user.email,
      companyName: company.displayName,
      domain: company.domain,
      eventType: event.eventType,
      severity: event.severity,
      oldSnippet: event.oldSnippet,
      newSnippet: event.newSnippet,
      sourceUrl: event.sourceUrl,
      eventId: event._id.toString(),
    });
    
    event.emailedAt = new Date();
    await event.save();
    
    logger.info(`[Worker] Critical alert sent for event ${event._id}`);
  } catch (error) {
    logger.error('[Worker] Failed to send alert:', error);
  }
}

/**
 * Extract PDF links and enqueue evidence processing jobs
 */
async function extractAndEnqueueEvidence(content: string, company: any, target: any) {
  const pdfRegex = /https?:\/\/[^\s<>"]+\.pdf/gi;
  const matches = content.match(pdfRegex);
  
  if (matches && matches.length > 0) {
    logger.info(`[Worker] Found ${matches.length} PDF links in ${target.url}`);
    
    for (const pdfUrl of matches.slice(0, 3)) {
      const existing = await Evidence.findOne({
        companyId: company._id,
        pdfUrl,
      });
      
      if (!existing) {
        const evidence = await Evidence.create({
          companyId: company._id,
          claimType: 'compliance',
          pdfUrl,
          status: 'PENDING',
        });
        
        // Enqueue evidence processing job
        await enqueueEvidenceProcessing({
          evidenceId: evidence._id.toString(),
          pdfUrl,
          companyId: company._id.toString(),
        });
      }
    }
  }
}

/**
 * Create and start the crawl worker
 */
export function startCrawlWorker() {
  const worker = new Worker(
    JobType.CRAWL_TARGET,
    async (job) => {
      try {
        await processCrawlJob(job);
      } catch (error: any) {
        logger.error(`[Worker] Crawl job failed:`, error);
        throw error; // Re-throw for BullMQ retry
      }
    },
    {
      connection: redisConfig,
      concurrency: 3, // Process up to 3 crawls in parallel
    }
  );
  
  worker.on('completed', (job) => {
    logger.info(`[Worker] ✅ Job completed: ${job.id}`);
  });
  
  worker.on('failed', (job, err) => {
    logger.error(`[Worker] ❌ Job failed: ${job?.id}`, err);
  });
  
  logger.info('🚀 Crawl worker started');
  
  return worker;
}
