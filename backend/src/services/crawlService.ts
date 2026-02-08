import crypto from 'crypto';
import { Types } from 'mongoose';
import { Company, ICompany } from '../models/Company';
import { CrawlTarget, ICrawlTarget } from '../models/CrawlTarget';
import { Claim } from '../models/Claim';
import { ClaimVersion } from '../models/ClaimVersion';
import { ChangeEvent } from '../models/ChangeEvent';
import { CrawlRun } from '../models/CrawlRun';
import { Evidence } from '../models/Evidence';
import { User } from '../models/User';
import { firecrawlClient } from './firecrawl';
import { claimExtractor } from './claimExtractor';
import { reductoClient } from './reducto';
import { sendAlertEmail } from './email';
import { logger } from '../utils/logger';
import { demoAdapter } from './demoAdapter';
import { emitCrawlProgress } from '../utils/crawlProgress';

export class CrawlService {
  async crawlCompany(companyId: Types.ObjectId): Promise<void> {
    const crawlRun = await CrawlRun.create({
      companyId,
      startedAt: new Date(),
      status: 'running',
    });

    logger.info(`Starting crawl for company ${companyId}`, { crawlRunId: crawlRun._id });
    
    // Emit progress: Crawl started
    emitCrawlProgress({
      companyId: companyId.toString(),
      stage: 'started',
      message: '🚀 Crawl started',
      timestamp: new Date(),
    });

    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const targets = await CrawlTarget.find({ companyId });
      logger.info(`Found ${targets.length} crawl targets for ${company.domain}`);
      
      // Emit progress: Found targets
      emitCrawlProgress({
        companyId: companyId.toString(),
        stage: 'targets_found',
        message: `📋 Found ${targets.length} pages to crawl`,
        timestamp: new Date(),
        details: { targetCount: targets.length, company: company.displayName },
      });

      for (const target of targets) {
        try {
          await this.crawlTarget(target, company, crawlRun);
          crawlRun.pagesCrawled++;
        } catch (error: any) {
          logger.error(`Failed to crawl target ${target.url}:`, error.message);
          crawlRun.errors.push(`${target.url}: ${error.message}`);
        }
      }

      // Update company last crawled time
      company.lastCrawledAt = new Date();
      await company.save();

      // Update crawl run status
      crawlRun.status = 'completed';
      crawlRun.finishedAt = new Date();
      await crawlRun.save();

      logger.info(`Crawl completed for company ${companyId}`, {
        pagesCrawled: crawlRun.pagesCrawled,
        claimsExtracted: crawlRun.claimsExtracted,
        eventsCreated: crawlRun.eventsCreated,
        errors: crawlRun.errors.length,
      });
      
      // Emit progress: Crawl completed
      emitCrawlProgress({
        companyId: companyId.toString(),
        stage: 'completed',
        message: `✅ Crawl completed: ${crawlRun.pagesCrawled} pages, ${crawlRun.claimsExtracted} claims, ${crawlRun.eventsCreated} events`,
        timestamp: new Date(),
        details: {
          pagesCrawled: crawlRun.pagesCrawled,
          claimsExtracted: crawlRun.claimsExtracted,
          eventsCreated: crawlRun.eventsCreated,
        },
      });
    } catch (error: any) {
      logger.error(`Crawl failed for company ${companyId}:`, error);
      crawlRun.status = 'failed';
      crawlRun.finishedAt = new Date();
      crawlRun.errors.push(error.message);
      await crawlRun.save();
      throw error;
    }
  }

  private async crawlTarget(
    target: ICrawlTarget,
    company: ICompany,
    crawlRun: any
  ): Promise<void> {
    logger.info(`Crawling target: ${target.url}`);
    
    // Emit progress: Starting to scrape
    const pageName = new URL(target.url).pathname.replace('/', '') || 'homepage';
    emitCrawlProgress({
      companyId: company._id.toString(),
      stage: 'scraping',
      message: `🔥 Firecrawl: Scraping ${pageName}...`,
      timestamp: new Date(),
      details: { url: target.url },
    });

    // Fetch content using Firecrawl (or demo adapter in demo mode)
    let content: string;
    
    logger.info(`🔍 Debug: DEMO_MODE=${process.env.DEMO_MODE}, URL=${target.url}, includes demo-sites: ${target.url.includes('demo-sites')}`);
    
    if (process.env.DEMO_MODE === 'true' && target.url.includes('demo-sites')) {
      logger.info(`✅ Using demo adapter for: ${target.url}`);
      content = await demoAdapter.fetchDemoContent(target.url);
      logger.info(`✅ Demo adapter returned ${content.length} chars`);
    } else {
      logger.info(`Using Firecrawl for: ${target.url}`);
      const result = await firecrawlClient.scrape(target.url);
      content = result.markdown;
    }
    
    // Emit progress: Scraping completed
    emitCrawlProgress({
      companyId: company._id.toString(),
      stage: 'scraped',
      message: `✅ Scraped ${pageName} (${content.length} chars)`,
      timestamp: new Date(),
    });

    // Compute content hash
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Check if content has changed
    if (target.lastHash && target.lastHash === contentHash) {
      logger.info(`No changes detected for ${target.url}`);
      emitCrawlProgress({
        companyId: company._id.toString(),
        stage: 'no_changes',
        message: `⏭️ No changes in ${pageName}`,
        timestamp: new Date(),
      });
      return;
    }

    logger.info(`Content changed for ${target.url}, extracting claims`);
    
    // Emit progress: Extracting claims
    emitCrawlProgress({
      companyId: company._id.toString(),
      stage: 'extracting',
      message: `🔍 Extracting claims from ${pageName}...`,
      timestamp: new Date(),
    });

    // Extract claims
    const extractedClaims = claimExtractor.extract(content, target.url);
    logger.info(`Extracted ${extractedClaims.length} claims from ${target.url}`);
    
    // Emit progress: Claims extracted
    emitCrawlProgress({
      companyId: company._id.toString(),
      stage: 'claims_extracted',
      message: `📊 Found ${extractedClaims.length} claims: ${extractedClaims.map(c => c.normalizedKey).join(', ')}`,
      timestamp: new Date(),
      details: { claimTypes: extractedClaims.map(c => c.normalizedKey) },
    });

    for (const extracted of extractedClaims) {
      await this.processClaim(extracted, company, target, crawlRun);
      crawlRun.claimsExtracted++;
    }

    // Check for removed claims
    await this.checkRemovedClaims(company, target, extractedClaims, crawlRun);

    // Update target
    target.lastHash = contentHash;
    target.lastCrawledAt = new Date();
    await target.save();

    // Look for PDF links in content for evidence
    await this.extractEvidence(content, company, target);
  }

  private async processClaim(
    extracted: any,
    company: ICompany,
    target: ICrawlTarget,
    crawlRun: any
  ): Promise<void> {
    const now = new Date();

    // Find existing claim
    let claim = await Claim.findOne({
      companyId: company._id,
      claimType: extracted.claimType,
      normalizedKey: extracted.normalizedKey,
    });

    const contentHash = crypto
      .createHash('sha256')
      .update(extracted.rawTextSnippet)
      .digest('hex');

    if (!claim) {
      // New claim - create it
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

      // Create first version
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

      // Create ADDED event
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
      logger.info(`New claim added: ${extracted.normalizedKey}`);
    } else {
      // Existing claim - check for changes
      const lastVersion = await ClaimVersion.findOne({
        claimId: claim._id,
      }).sort({ seenAt: -1 });

      if (!lastVersion || lastVersion.contentHash !== contentHash) {
        // Content has changed
        logger.info(`Claim changed: ${extracted.normalizedKey}`);

        // Create new version
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

        // Detect type of change
        const oldSnippet = claim.currentSnippet;
        const newSnippet = extracted.rawTextSnippet;

        let eventType: any = 'ADDED';
        let severity: any = 'Info';

        // Check for weakening
        if (claimExtractor.detectWeakening(oldSnippet, newSnippet)) {
          eventType = 'WEAKENED';
          severity = 'Critical';
        }
        // Check for numeric changes
        else if (extracted.extractedMeta?.value && lastVersion.extractedMeta?.value) {
          const { changed, decreased } = claimExtractor.detectNumericChange(
            lastVersion.extractedMeta,
            extracted.extractedMeta
          );
          if (changed) {
            eventType = 'NUMBER_CHANGED';
            severity = decreased ? 'Medium' : 'Info';
          }
        }
        // Check for reversal (polarity change)
        else if (lastVersion.polarity !== extracted.polarity) {
          eventType = 'REVERSED';
          severity = 'Critical';
        }

        // Create change event
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

        // Update claim
        claim.currentSnippet = newSnippet;
        claim.currentSourceUrl = target.url;
        claim.lastSeenAt = now;
        await claim.save();

        // Update risk score
        await this.updateRiskScore(company, eventType, severity);

        // Send alert for critical events
        if (severity === 'Critical') {
          await this.sendCriticalAlert(event, company);
        }
      } else {
        // No change, just update lastSeenAt
        claim.lastSeenAt = now;
        await claim.save();
      }
    }
  }

  private async checkRemovedClaims(
    company: ICompany,
    target: ICrawlTarget,
    extractedClaims: any[],
    crawlRun: any
  ): Promise<void> {
    // Find all active claims for this company that came from this URL
    const existingClaims = await Claim.find({
      companyId: company._id,
      currentSourceUrl: target.url,
      currentStatus: 'ACTIVE',
    });

    const extractedKeys = new Set(extractedClaims.map(c => c.normalizedKey));

    for (const claim of existingClaims) {
      if (!extractedKeys.has(claim.normalizedKey)) {
        // Claim was removed
        logger.warn(`Claim removed: ${claim.normalizedKey}`);

        claim.currentStatus = 'REMOVED';
        await claim.save();

        // Create REMOVED event
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

        // Update risk score
        await this.updateRiskScore(company, 'REMOVED', severity);

        // Send alert
        if (severity === 'Critical') {
          await this.sendCriticalAlert(event, company);
        }
      }
    }
  }

  private async updateRiskScore(
    company: ICompany,
    eventType: string,
    severity: string
  ): Promise<void> {
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
      logger.info(`Updated risk score for ${company.domain}: ${company.riskScore}`);
    }
  }

  private async sendCriticalAlert(event: any, company: ICompany): Promise<void> {
    try {
      // Rate limiting: max 5 critical emails per company per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentAlerts = await ChangeEvent.countDocuments({
        companyId: company._id,
        severity: 'Critical',
        emailedAt: { $gte: oneHourAgo },
      });

      if (recentAlerts >= 5) {
        logger.warn(`Rate limit hit for company ${company._id}, skipping email`);
        return;
      }

      // Get user email
      const user = await User.findById(company.userId);
      if (!user) {
        logger.error('User not found for company', { companyId: company._id });
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

      logger.info(`Critical alert email sent for event ${event._id}`);
    } catch (error) {
      logger.error('Failed to send critical alert:', error);
    }
  }

  private async extractEvidence(
    content: string,
    company: ICompany,
    target: ICrawlTarget
  ): Promise<void> {
    // Look for PDF links
    const pdfRegex = /https?:\/\/[^\s<>"]+\.pdf/gi;
    const matches = content.match(pdfRegex);

    if (matches && matches.length > 0) {
      logger.info(`Found ${matches.length} PDF links in ${target.url}`);

      for (const pdfUrl of matches.slice(0, 3)) { // Limit to 3 PDFs per page
        // Check if we already have this evidence
        const existing = await Evidence.findOne({
          companyId: company._id,
          pdfUrl,
        });

        if (!existing) {
          // Create pending evidence
          const evidence = await Evidence.create({
            companyId: company._id,
            claimType: 'compliance', // Assume compliance for now
            pdfUrl,
            status: 'PENDING',
          });

          // Process in background (simplified for hackathon)
          this.processEvidence(evidence._id).catch(err => {
            logger.error('Evidence processing failed:', err);
          });
        }
      }
    }
  }

  private async processEvidence(evidenceId: Types.ObjectId): Promise<void> {
    try {
      const evidence = await Evidence.findById(evidenceId);
      if (!evidence) return;

      logger.info(`Processing evidence: ${evidence.pdfUrl}`);

      const result = await reductoClient.parsePDF(evidence.pdfUrl);
      const fields = reductoClient.extractEvidenceFields(result.text);

      // Add page information from metadata
      if (result.metadata?.pageInfo) {
        fields.pageContent = result.metadata.pageInfo;
        fields.pageNumbers = Object.keys(result.metadata.pageInfo).map(Number).sort((a, b) => a - b);
      }

      evidence.extractedFields = fields;
      evidence.status = 'READY';
      evidence.processedAt = new Date();
      await evidence.save();

      logger.info(`Evidence processed successfully: ${evidenceId}`, {
        pages: fields.pageNumbers?.length || 0,
        hasReportType: !!fields.reportType,
        hasAuditor: !!fields.auditor,
      });
    } catch (error: any) {
      logger.error(`Evidence processing failed for ${evidenceId}:`, error);
      const evidence = await Evidence.findById(evidenceId);
      if (evidence) {
        evidence.status = 'FAILED';
        evidence.error = error.message || 'Unknown error during PDF parsing';
        evidence.processedAt = new Date();
        await evidence.save();
      }
    }
  }

  async crawlAllCompanies(): Promise<void> {
    logger.info('Starting scheduled crawl for all companies');
    
    const companies = await Company.find({});
    logger.info(`Found ${companies.length} companies to crawl`);

    for (const company of companies) {
      try {
        await this.crawlCompany(company._id);
      } catch (error) {
        logger.error(`Failed to crawl company ${company._id}:`, error);
      }
    }

    logger.info('Scheduled crawl completed');
  }
}

export const crawlService = new CrawlService();
