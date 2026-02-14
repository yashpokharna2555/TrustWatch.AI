import { EventEmitter } from 'events';

// Create a global event emitter for crawl progress
export const crawlProgressEmitter = new EventEmitter();

// Set max listeners to prevent memory leak warnings
// Allow up to 50 concurrent SSE connections
crawlProgressEmitter.setMaxListeners(50);

export interface CrawlProgress {
  companyId: string;
  stage: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export function emitCrawlProgress(progress: CrawlProgress) {
  crawlProgressEmitter.emit('progress', progress);
}
