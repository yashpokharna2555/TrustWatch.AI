/**
 * Agent 4: Severity Scoring Agent
 * 
 * Responsibility:
 * - Assign severity level based on claim type + verification status
 * - Apply rule-based logic (not purely generative)
 * - Explain severity assignment
 * 
 * This agent MUST NOT:
 * - Invent new severity levels
 * - Ignore claim type (compliance ≠ privacy ≠ SLA)
 * - Give high severity to low-impact claims
 * 
 * Severity Rules (MANDATORY):
 * - CRITICAL: Compliance certification (SOC2, ISO) contradicted or removed
 * - HIGH: Privacy policy weakened, encryption downgraded
 * - MEDIUM: SLA decreased, data retention reduced
 * - LOW: Minor claims, insufficient evidence for critical claims
 * 
 * Example:
 * Input: {
 *   claimType: "compliance",
 *   verificationStatus: "CONTRADICTED",
 *   confidence: 0.9,
 *   normalizedClaim: "Company is SOC 2 Type II certified"
 * }
 * Output: {
 *   severity: "CRITICAL",
 *   reason: "SOC 2 Type II certification contradicted with high confidence (0.9). Compliance certifications are critical security claims."
 * }
 */

import {
  SeverityScoringInput,
  SeverityScoringOutput,
  SeverityScoringInputSchema,
  SeverityScoringOutputSchema,
} from './interfaces';
import { logger } from '../../utils/logger';

export class SeverityScoringAgent {
  /**
   * Rule-based severity scoring
   * Uses explicit rules + claim type to determine severity
   */
  async scoreSeverity(input: SeverityScoringInput): Promise<SeverityScoringOutput> {
    // Validate input
    const validatedInput = SeverityScoringInputSchema.parse(input);
    
    logger.info('[SeverityScoringAgent] Scoring severity:', {
      claimType: validatedInput.claimType,
      status: validatedInput.verificationStatus,
      confidence: validatedInput.confidence,
    });
    
    const { claimType, verificationStatus, confidence, normalizedClaim } = validatedInput;
    
    // Rule-based severity assignment
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    let reason: string;
    
    // Detect specific claim patterns
    const isComplianceCert = /SOC\s*2|ISO\s*27001|HIPAA|FedRAMP|PCI\s*DSS/i.test(normalizedClaim);
    const isEncryption = /encrypt|TLS|SSL|AES/i.test(normalizedClaim);
    const isPrivacy = /privacy|data.*sell|personal.*data|GDPR/i.test(normalizedClaim);
    const isUptime = /uptime|availability|SLA|99\./i.test(normalizedClaim);
    
    // CRITICAL: Compliance certification contradicted/removed with high confidence
    if (verificationStatus === 'CONTRADICTED' && isComplianceCert && confidence > 0.7) {
      severity = 'CRITICAL';
      reason = `Compliance certification (${claimType}) contradicted with ${(confidence * 100).toFixed(0)}% confidence. Loss of certification poses significant regulatory and customer trust risk.`;
    }
    // CRITICAL: Privacy policy weakened
    else if (verificationStatus === 'CONTRADICTED' && isPrivacy && confidence > 0.7) {
      severity = 'CRITICAL';
      reason = `Privacy claim contradicted with ${(confidence * 100).toFixed(0)}% confidence. Privacy degradation impacts user trust and may violate regulations.`;
    }
    // HIGH: Encryption downgraded
    else if (verificationStatus === 'CONTRADICTED' && isEncryption && confidence > 0.6) {
      severity = 'HIGH';
      reason = `Encryption claim contradicted. Weakened encryption increases security risk.`;
    }
    // HIGH: Compliance cert insufficient evidence
    else if (verificationStatus === 'INSUFFICIENT_EVIDENCE' && isComplianceCert) {
      severity = 'HIGH';
      reason = `Compliance certification claim lacks supporting evidence. Unverified compliance claims are high-risk for audits.`;
    }
    // MEDIUM: SLA/uptime degraded
    else if (verificationStatus === 'CONTRADICTED' && isUptime) {
      severity = 'MEDIUM';
      reason = `SLA/uptime claim contradicted. Service level degradation impacts reliability expectations.`;
    }
    // MEDIUM: Verified but low confidence
    else if (verificationStatus === 'VERIFIED' && confidence < 0.5) {
      severity = 'MEDIUM';
      reason = `Claim verified but with low confidence (${(confidence * 100).toFixed(0)}%). Evidence quality is weak.`;
    }
    // LOW: Verified with high confidence
    else if (verificationStatus === 'VERIFIED' && confidence >= 0.7) {
      severity = 'LOW';
      reason = `Claim verified with ${(confidence * 100).toFixed(0)}% confidence. No immediate risk.`;
    }
    // LOW: Insufficient evidence for non-critical claims
    else if (verificationStatus === 'INSUFFICIENT_EVIDENCE' && !isComplianceCert) {
      severity = 'LOW';
      reason = `Insufficient evidence for non-critical claim. Low immediate impact but should be verified.`;
    }
    // MEDIUM: Default case
    else {
      severity = 'MEDIUM';
      reason = `Claim status: ${verificationStatus}. Confidence: ${(confidence * 100).toFixed(0)}%. Moderate risk requires attention.`;
    }
    
    const output: SeverityScoringOutput = { severity, reason };
    
    // Validate output
    const validatedOutput = SeverityScoringOutputSchema.parse(output);
    
    logger.info('[SeverityScoringAgent] Severity scored:', {
      severity: validatedOutput.severity,
    });
    
    return validatedOutput;
  }
}

export const severityScoringAgent = new SeverityScoringAgent();
