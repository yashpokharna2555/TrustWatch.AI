/**
 * Queue Infrastructure - Job Types
 * 
 * Defines all background job types in the system.
 * Each job type represents a unit of async work that can be retried.
 */

export enum JobType {
  // Crawling jobs
  CRAWL_TARGET = 'crawl_target',           // Crawl a single URL target
  DISCOVER_TARGETS = 'discover_targets',   // Auto-discover URLs for a company
  
  // Evidence processing
  PROCESS_EVIDENCE = 'process_evidence',   // Parse a PDF with Reducto
  
  // Alerting
  SEND_ALERT_EMAIL = 'send_alert_email',   // Send email via Resend
}

// Job payload interfaces
export interface CrawlTargetJobData {
  companyId: string;
  targetId: string;
  url: string;
}

export interface DiscoverTargetsJobData {
  companyId: string;
  domain: string;
}

export interface ProcessEvidenceJobData {
  evidenceId: string;
  pdfUrl: string;
  companyId: string;
}

export interface SendAlertEmailJobData {
  eventId: string;
  userId: string;
  recipientEmail: string;
}
