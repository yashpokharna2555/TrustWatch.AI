import { logger } from '../utils/logger';

export interface ExtractedClaim {
  claimType: string;
  normalizedKey: string;
  polarity: 'positive' | 'negative' | 'neutral';
  rawTextSnippet: string;
  confidence: number;
  extractedMeta?: any;
}

export class ClaimExtractor {
  private patterns = {
    // Compliance certifications - MUCH MORE FLEXIBLE
    soc2: {
      regex: /SOC\s*[12]\s*(?:Type\s*(?:I|II|1|2))?/gi,
      type: 'compliance',
      key: 'SOC2_TYPE_II',
      confidence: 0.95,
    },
    iso27001: {
      regex: /ISO[\s\/]*27001/gi,
      type: 'compliance',
      key: 'ISO_27001',
      confidence: 0.95,
    },
    iso27017: {
      regex: /ISO[\s\/]*27017/gi,
      type: 'compliance',
      key: 'ISO_27017',
      confidence: 0.95,
    },
    iso27018: {
      regex: /ISO[\s\/]*27018/gi,
      type: 'compliance',
      key: 'ISO_27018',
      confidence: 0.95,
    },
    hipaa: {
      regex: /HIPAA/gi,
      type: 'compliance',
      key: 'HIPAA',
      confidence: 0.9,
    },
    gdpr: {
      regex: /GDPR/gi,
      type: 'compliance',
      key: 'GDPR',
      confidence: 0.9,
    },
    pci: {
      regex: /PCI[\s-]*DSS/gi,
      type: 'compliance',
      key: 'PCI_DSS',
      confidence: 0.9,
    },
    ccpa: {
      regex: /CCPA/gi,
      type: 'compliance',
      key: 'CCPA',
      confidence: 0.9,
    },
    fedramp: {
      regex: /FedRAMP/gi,
      type: 'compliance',
      key: 'FEDRAMP',
      confidence: 0.9,
    },

    // Encryption
    encryption: {
      regex: /(?:AES[\s-]*(?:128|192|256)|TLS[\s]*(?:1\.[23])?|SSL|encrypt(?:ed|ion))/gi,
      type: 'security',
      key: 'ENCRYPTION',
      confidence: 0.85,
    },

    // Privacy - more flexible
    dataProtection: {
      regex: /(?:protect|secure|safeguard)(?:s|ing)?\s+(?:your\s+)?(?:data|information|privacy)/gi,
      type: 'privacy',
      key: 'DATA_PROTECTION',
      confidence: 0.75,
    },

    // Privacy - negative (good)
    doNotSell: {
      regex: /(?:do\s*not|don't|never|will\s*not|won't)\s+(?:sell|share\s+with\s+third)/gi,
      type: 'privacy',
      key: 'DO_NOT_SELL',
      polarity: 'negative' as const,
      confidence: 0.85,
    },

    // Uptime - more flexible
    uptime: {
      regex: /(\d{2,3}(?:\.\d{1,3})?)\s*%\s*(?:uptime|availability|SLA)/gi,
      type: 'sla',
      key: 'UPTIME',
      confidence: 0.9,
      extractNumber: true,
    },

    // Backup
    backup: {
      regex: /(?:backup|redundan(?:t|cy)|replicate)/gi,
      type: 'security',
      key: 'BACKUP',
      confidence: 0.75,
    },

    // Audit
    audit: {
      regex: /(?:audit(?:ed)?|security\s+audit|independent\s+audit)/gi,
      type: 'compliance',
      key: 'AUDIT',
      confidence: 0.8,
    },

    // Penetration testing
    pentest: {
      regex: /(?:penetration\s+test|pen\s*test|security\s+test)/gi,
      type: 'security',
      key: 'PENETRATION_TESTING',
      confidence: 0.85,
    },

    // Two-factor auth
    mfa: {
      regex: /(?:two[\s-]*factor|2FA|multi[\s-]*factor|MFA)/gi,
      type: 'security',
      key: 'MFA',
      confidence: 0.9,
    },
  };

  extract(content: string, sourceUrl: string): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];
    
    // Extract both from full content AND sentences for better coverage
    const chunks = [
      content, // Full content
      ...this.extractSentences(content) // Individual sentences
    ];

    logger.info(`Extracting claims from content (${chunks.length} chunks)`);

    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      for (const chunk of chunks) {
        const matches = chunk.matchAll(pattern.regex);

        for (const match of matches) {
          const snippet = this.expandSnippet(chunk, match.index || 0, match[0]);
          
          let extractedMeta: any = undefined;
          if (pattern.extractNumber && match[1]) {
            extractedMeta = {
              value: parseFloat(match[1]),
              unit: match[2] || null,
            };
          }

          claims.push({
            claimType: pattern.type,
            normalizedKey: pattern.key,
            polarity: pattern.polarity || 'neutral',
            rawTextSnippet: snippet,
            confidence: pattern.confidence,
            extractedMeta,
          });

          logger.debug(`Extracted claim: ${pattern.key} from "${snippet.substring(0, 50)}..."`);
        }
      }
    }

    // Deduplicate claims by normalizedKey
    const uniqueClaims = this.deduplicateClaims(claims);
    logger.info(`📊 Extracted ${uniqueClaims.length} unique claims`);

    return uniqueClaims;
  }

  private extractSentences(content: string): string[] {
    // Clean content first - normalize whitespace
    const cleanedContent = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces/tabs with single space
      .replace(/\n+/g, ' ')  // Replace newlines with space
      .trim();
    
    // Split by periods, exclamation marks, or question marks followed by space and capital letter
    const sentences = cleanedContent
      .split(/[.!?]+\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 500); // Filter out very short fragments and very long blocks

    return sentences;
  }

  private expandSnippet(text: string, matchIndex: number, matchedText: string): string {
    // For full content, extract context around match
    if (text.length > 500) {
      const start = Math.max(0, matchIndex - 150);
      const end = Math.min(text.length, matchIndex + matchedText.length + 150);
      let snippet = text.substring(start, end).trim();
      
      // Clean up the snippet - remove excessive whitespace and newlines
      snippet = snippet
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, ' ')  // Replace newlines with space
        .trim();
      
      // Try to start and end at sentence boundaries for better readability
      const sentenceStart = snippet.search(/[.!?]\s+[A-Z]/);
      if (sentenceStart > 0 && sentenceStart < 50) {
        snippet = snippet.substring(sentenceStart + 2);
      }
      
      return snippet;
    }
    
    // For sentences, clean and return
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  private deduplicateClaims(claims: ExtractedClaim[]): ExtractedClaim[] {
    const seen = new Map<string, ExtractedClaim>();

    for (const claim of claims) {
      const existing = seen.get(claim.normalizedKey);
      if (!existing || claim.confidence > existing.confidence) {
        seen.set(claim.normalizedKey, claim);
      }
    }

    return Array.from(seen.values());
  }

  // Detect if a claim has been weakened
  detectWeakening(oldSnippet: string, newSnippet: string): boolean {
    const weakeningPatterns = [
      { from: /do not|don't|never/i, to: /may|might|could/i },
      { from: /always/i, to: /typically|usually|generally/i },
      { from: /all/i, to: /most|some/i },
      { from: /guarantee/i, to: /strive|aim|endeavor/i },
    ];

    for (const pattern of weakeningPatterns) {
      if (pattern.from.test(oldSnippet) && pattern.to.test(newSnippet)) {
        return true;
      }
    }

    return false;
  }

  // Detect numeric changes
  detectNumericChange(oldMeta: any, newMeta: any): { changed: boolean; decreased: boolean } {
    if (!oldMeta?.value || !newMeta?.value) {
      return { changed: false, decreased: false };
    }

    const changed = oldMeta.value !== newMeta.value;
    const decreased = newMeta.value < oldMeta.value;

    return { changed, decreased };
  }
}

export const claimExtractor = new ClaimExtractor();
