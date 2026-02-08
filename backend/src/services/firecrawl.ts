import axios from 'axios';
import { logger } from '../utils/logger';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown: string;
    html?: string;
    metadata?: any;
  };
  error?: string;
}

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v0';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('FIRECRAWL_API_KEY not set - Firecrawl operations will fail');
    }
  }

  async scrape(url: string): Promise<{ markdown: string; metadata?: any }> {
    try {
      logger.info(`Firecrawl: Scraping ${url}`);

      const response = await axios.post<FirecrawlResponse>(
        `${this.baseUrl}/scrape`,
        {
          url,
          formats: ['markdown'],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Firecrawl scrape failed');
      }

      logger.info(`Firecrawl: Successfully scraped ${url}`);
      return {
        markdown: response.data.data.markdown,
        metadata: response.data.data.metadata,
      };
    } catch (error: any) {
      logger.error(`Firecrawl error for ${url}:`, {
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async crawl(url: string, options?: { maxPages?: number; includePaths?: string[] }): Promise<string[]> {
    try {
      logger.info(`Firecrawl: Crawling ${url} with options`, options);

      const response = await axios.post(
        `${this.baseUrl}/crawl`,
        {
          url,
          limit: options?.maxPages || 10,
          scrapeOptions: {
            formats: ['markdown'],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const jobId = response.data.jobId;
      logger.info(`Firecrawl: Crawl job started ${jobId}`);

      // Poll for results (simplified for hackathon)
      // In production, use webhooks
      return [];
    } catch (error: any) {
      logger.error(`Firecrawl crawl error:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance that will be initialized with env vars
let firecrawlClientInstance: FirecrawlClient | null = null;

export const firecrawlClient = new Proxy({} as FirecrawlClient, {
  get(target, prop) {
    if (!firecrawlClientInstance) {
      firecrawlClientInstance = new FirecrawlClient();
    }
    return (firecrawlClientInstance as any)[prop];
  }
});
