import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * Demo adapter for local testing without hitting real websites
 * This allows Firecrawl to work with localhost demo pages
 */
export class DemoAdapter {
  private demoPages: Map<string, string> = new Map();

  constructor() {
    // Initialize demo content
    this.setupDemoPages();
  }

  private setupDemoPages() {
    // Demo Site v1 - Baseline (support both http and https)
    const v1Content = `
# Acme Corp Security & Compliance

## Our Commitment to Security

At Acme Corp, security and compliance are at the core of everything we do.

## Compliance Certifications

We are SOC 2 Type II compliant. Our controls have been independently audited and verified by a third-party auditor. Our latest SOC 2 Type II report is available upon request.

We are also ISO 27001 certified, demonstrating our commitment to information security management.

## Privacy & Data Protection

We do not sell customer data to third parties. Your data is yours, and we respect your privacy.

We are GDPR compliant and provide full data subject rights to our European customers.

## Service Level Agreement

We guarantee 99.99% uptime for our platform. Our infrastructure is designed for high availability and reliability.

We respond to critical support tickets within 2 hours during business hours.

## Data Security

All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.

We retain customer data for 90 days after account termination, unless required by law.

## Incident Response

We have a dedicated security team available 24/7 to respond to security incidents.

For security concerns, contact: security@acmecorp.com
    `;

    const v2Content = `
# Acme Corp Security & Compliance

## Our Commitment to Security

At Acme Corp, security and compliance are at the core of everything we do.

## Compliance Certifications

We are ISO 27001 certified, demonstrating our commitment to information security management.

## Privacy & Data Protection

We may share data with trusted partners to improve our services and provide you with relevant offers.

We are GDPR compliant and provide full data subject rights to our European customers.

## Service Level Agreement

We strive for 99.9% uptime for our platform. Our infrastructure is designed for high availability and reliability.

We respond to critical support tickets within 2 hours during business hours.

## Data Security

All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.

We retain customer data for 90 days after account termination, unless required by law.

## Incident Response

We have a dedicated security team available 24/7 to respond to security incidents.

For security concerns, contact: security@acmecorp.com
    `;
    
    // Add both HTTP and HTTPS versions
    this.demoPages.set('http://localhost:3000/demo-sites/acme/security-v1', v1Content);
    this.demoPages.set('https://localhost:3000/demo-sites/acme/security-v1', v1Content);
    this.demoPages.set('http://localhost:3000/demo-sites/acme/security-v2', v2Content);
    this.demoPages.set('https://localhost:3000/demo-sites/acme/security-v2', v2Content);

    logger.info('Demo pages initialized', {
      count: this.demoPages.size,
    });
  }

  async fetchDemoContent(url: string): Promise<string> {
    logger.info(`Demo adapter: Fetching ${url}`);

    const content = this.demoPages.get(url);
    
    if (!content) {
      throw new Error(`Demo page not found: ${url}`);
    }

    logger.info(`Demo adapter: Returned content for ${url} (${content.length} chars)`);
    return content;
  }

  getDemoUrls(): string[] {
    return Array.from(this.demoPages.keys());
  }
}

export const demoAdapter = new DemoAdapter();
