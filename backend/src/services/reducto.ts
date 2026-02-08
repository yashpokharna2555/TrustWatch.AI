import axios from 'axios';
import { logger } from '../utils/logger';

interface ReductoUploadResponse {
  file_id: string; // Correct field name
}

interface ReductoBlock {
  type: string;
  content: string;
  bbox?: {
    page: number;
    left: number;
    top: number;
    width: number;
    height: number;
  };
  confidence?: string;
}

interface ReductoChunk {
  content: string;
  blocks: ReductoBlock[];
}

interface ReductoParseResponse {
  job_id: string;
  duration: number;
  usage: {
    num_pages: number;
    credits: number;
  };
  result: {
    chunks: ReductoChunk[];
  };
  studio_link: string;
}

export class ReductoClient {
  private apiKey: string;
  private baseUrl = 'https://platform.reducto.ai'; // Using correct URL from Reducto docs

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REDUCTO_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('REDUCTO_API_KEY not set - PDF parsing will fail');
    } else {
      logger.info('Reducto client initialized with API key');
    }
  }

  async parsePDF(pdfUrl: string): Promise<{ text: string; metadata?: any }> {
    try {
      logger.info(`🔵 Reducto: Starting PDF parse for ${pdfUrl}`);
      logger.info(`🔑 Using API key: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
      logger.info(`🌐 API endpoint: ${this.baseUrl}`);

      // Parse directly from public URL (recommended by Reducto docs)
      logger.info(`🔍 Reducto: Parsing PDF directly from public URL...`);
      const parseResponse = await axios.post<ReductoParseResponse>(
        `${this.baseUrl}/parse`,
        {
          input: pdfUrl, // Pass URL directly as input
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes
          validateStatus: (status) => status < 500,
        }
      );

      // Log response status
      logger.info(`📨 Reducto response status: ${parseResponse.status}`);

      // Handle non-200 responses
      if (parseResponse.status !== 200) {
        logger.error(`❌ Reducto API returned ${parseResponse.status}:`, parseResponse.data);
        
        if (parseResponse.status === 422) {
          throw new Error(`Reducto rejected the request (422): ${JSON.stringify(parseResponse.data)}. This usually means invalid URL format or PDF not accessible to Reducto.`);
        } else if (parseResponse.status === 401) {
          throw new Error(`Reducto authentication failed (401): Invalid API key`);
        } else if (parseResponse.status === 403) {
          throw new Error(`Reducto access forbidden (403): Check subscription/credits`);
        } else {
          throw new Error(`Reducto API error (${parseResponse.status}): ${JSON.stringify(parseResponse.data)}`);
        }
      }

      const result = parseResponse.data;
      logger.info(`✅ Reducto: Parse successful!`, {
        job_id: result.job_id,
        pages: result.usage.num_pages,
        credits: result.usage.credits,
        chunks: result.result.chunks.length,
        studio_link: result.studio_link,
      });

      // Extract full text from all chunks with page numbers
      const fullText = result.result.chunks
        .map((chunk) => chunk.content)
        .join('\n\n');

      // Extract page information from blocks
      const pageInfo: { [key: number]: string[] } = {};
      result.result.chunks.forEach((chunk) => {
        chunk.blocks.forEach((block) => {
          if (block.bbox && block.bbox.page) {
            const pageNum = block.bbox.page;
            if (!pageInfo[pageNum]) {
              pageInfo[pageNum] = [];
            }
            pageInfo[pageNum].push(block.content);
          }
        });
      });

      logger.info(`📄 Reducto: Extracted ${fullText.length} characters from ${result.usage.num_pages} pages`);
      logger.info(`📊 Reducto: Found content on ${Object.keys(pageInfo).length} pages`);

      return {
        text: fullText,
        metadata: {
          job_id: result.job_id,
          num_pages: result.usage.num_pages,
          credits_used: result.usage.credits,
          studio_link: result.studio_link,
          chunks: result.result.chunks.length,
          pageInfo: pageInfo,
        },
      };
    } catch (error: any) {
      // Enhanced error logging
      logger.error(`❌ Reducto error for ${pdfUrl}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestData: error.config?.data,
      });

      // Detailed error messages
      if (error.message.includes('422')) {
        const errorMsg = `🚫 Reducto 422 Error: The PDF URL format is invalid or Reducto cannot access it. URL: ${pdfUrl}. This PDF needs to be publicly accessible without authentication. The CDN hosting this PDF might have CORS/access restrictions preventing Reducto from accessing it.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else if (error.code === 'ENOTFOUND') {
        const errorMsg = `🌐 DNS Error: Cannot resolve ${this.baseUrl}. Check network/DNS settings.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else if (error.code === 'ECONNREFUSED') {
        const errorMsg = `🚫 Connection Refused: Cannot connect to ${this.baseUrl}. Check firewall.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else if (error.response?.status === 401) {
        const errorMsg = `🔑 Auth Error: Invalid Reducto API key.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else if (error.response?.status === 403) {
        const errorMsg = `🔐 Access Forbidden: Check Reducto subscription/credits.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        const errorMsg = `⏱️ Timeout: Reducto took too long. PDF may be too large.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Generic error
      throw new Error(`Reducto error: ${error.message}`);
    }
  }

  extractEvidenceFields(text: string): any {
    const fields: any = {};

    // Extract report type
    const reportTypeMatch = text.match(/SOC\s*2\s*Type\s*(I|II)/i) || 
                           text.match(/ISO\s*27001/i) ||
                           text.match(/HIPAA/i);
    if (reportTypeMatch) {
      fields.reportType = reportTypeMatch[0];
    }

    // Extract auditor
    const auditorMatch = text.match(/(?:auditor|audited by|performed by)[\s:]+([A-Z][a-zA-Z\s&,]+(?:LLP|LLC|Inc)?)/i);
    if (auditorMatch) {
      fields.auditor = auditorMatch[1].trim();
    }

    // Extract audit period
    const periodMatch = text.match(/(?:period|audit period)[\s:]+(\w+\s+\d{1,2},?\s+\d{4})\s*(?:to|through|-)\s*(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (periodMatch) {
      fields.periodStart = new Date(periodMatch[1]);
      fields.periodEnd = new Date(periodMatch[2]);
    }

    // Extract scope
    const scopeMatch = text.match(/(?:scope|covered services)[\s:]+([^\n]{20,200})/i);
    if (scopeMatch) {
      fields.scope = scopeMatch[1].trim();
    }

    logger.info('Extracted evidence fields:', fields);
    return fields;
  }
}

// Create singleton instance that will be initialized with env vars
let reductoClientInstance: ReductoClient | null = null;

export const reductoClient = new Proxy({} as ReductoClient, {
  get(target, prop) {
    if (!reductoClientInstance) {
      reductoClientInstance = new ReductoClient();
    }
    return (reductoClientInstance as any)[prop];
  }
});
