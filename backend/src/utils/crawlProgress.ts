import { EventEmitter } from 'events';

// Create a global event emitter for crawl progress
export const crawlProgressEmitter = new EventEmitter();

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
