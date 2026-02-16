/**
 * Verification Pipeline Orchestrator
 * 
 * Coordinates the 4-agent verification pipeline:
 * 1. Claim Analysis Agent → analyze claim requirements
 * 2. Evidence Matching Agent → find relevant evidence
 * 3. Verification Decision Agent → make verification decision
 * 4. Severity Scoring Agent → assign severity
 * 
 * Architecture Principles:
 * - Sequential execution (each step depends on previous)
 * - Fail-fast on validation errors
 * - Store intermediate artifacts for audit trail
 * - Independent retry capability (resume from last successful step)
 * - No hallucination (strict schema validation)
 * 
 * Usage:
 * ```
 * const result = await verificationPipeline.execute({
 *   claimId: "...",
 *   companyId: "...",
 *   rawClaimText: "We are SOC 2 Type II certified",
 *   claimType: "compliance",
 *   sourceUrl: "https://example.com/security",
 *   availableEvidence: [...]
 * });
 * ```
 */

import { Types } from 'mongoose';
import { VerificationArtifact } from '../../models/VerificationArtifact';
import { claimAnalysisAgent } from './claimAnalysisAgent';
import { evidenceMatchingAgent } from './evidenceMatchingAgent';
import { verificationDecisionAgent } from './verificationDecisionAgent';
import { severityScoringAgent } from './severityScoringAgent';
import { VerificationPipelineResult } from './interfaces';
import { logger } from '../../utils/logger';

export interface VerificationPipelineInput {
  claimId: Types.ObjectId;
  companyId: Types.ObjectId;
  rawClaimText: string;
  claimType: string;
  sourceUrl: string;
  availableEvidence: Array<{
    source: 'pdf' | 'webpage';
    evidenceId?: string;
    content: string;
    pageNumbers?: number[];
    pageContent?: { [key: number]: string };
  }>;
}

export class VerificationPipeline {
  private readonly PIPELINE_VERSION = '1.0.0';
  
  /**
   * Execute the full 4-agent verification pipeline
   * Stores intermediate results for audit trail
   */
  async execute(input: VerificationPipelineInput): Promise<VerificationPipelineResult> {
    const startTime = Date.now();
    
    logger.info('[VerificationPipeline] Starting pipeline:', {
      claimId: input.claimId.toString(),
      companyId: input.companyId.toString(),
      claimType: input.claimType,
    });
    
    try {
      // ===================================================================
      // STEP 1: Claim Analysis Agent
      // ===================================================================
      logger.info('[VerificationPipeline] Step 1: Analyzing claim...');
      
      const claimAnalysis = await claimAnalysisAgent.analyze({
        rawClaimText: input.rawClaimText,
        claimType: input.claimType,
        sourceUrl: input.sourceUrl,
      });
      
      logger.info('[VerificationPipeline] Step 1 complete:', {
        requirementsCount: claimAnalysis.verificationRequirements.length,
      });
      
      // ===================================================================
      // STEP 2: Evidence Matching Agent
      // ===================================================================
      logger.info('[VerificationPipeline] Step 2: Matching evidence...');
      
      const evidenceMatching = await evidenceMatchingAgent.matchEvidence({
        normalizedClaim: claimAnalysis.normalizedClaim,
        verificationRequirements: claimAnalysis.verificationRequirements,
        availableEvidence: input.availableEvidence,
      });
      
      logger.info('[VerificationPipeline] Step 2 complete:', {
        matchesFound: evidenceMatching.matches.length,
      });
      
      // ===================================================================
      // STEP 3: Verification Decision Agent
      // ===================================================================
      logger.info('[VerificationPipeline] Step 3: Making verification decision...');
      
      const verificationDecision = await verificationDecisionAgent.decide({
        normalizedClaim: claimAnalysis.normalizedClaim,
        evidenceMatches: evidenceMatching.matches,
      });
      
      logger.info('[VerificationPipeline] Step 3 complete:', {
        status: verificationDecision.status,
        confidence: verificationDecision.confidence,
      });
      
      // ===================================================================
      // STEP 4: Severity Scoring Agent
      // ===================================================================
      logger.info('[VerificationPipeline] Step 4: Scoring severity...');
      
      const severityScore = await severityScoringAgent.scoreSeverity({
        claimType: claimAnalysis.claimType,
        verificationStatus: verificationDecision.status,
        confidence: verificationDecision.confidence,
        normalizedClaim: claimAnalysis.normalizedClaim,
      });
      
      logger.info('[VerificationPipeline] Step 4 complete:', {
        severity: severityScore.severity,
      });
      
      // ===================================================================
      // PERSIST ARTIFACTS (Audit Trail)
      // ===================================================================
      logger.info('[VerificationPipeline] Persisting verification artifacts...');
      
      await VerificationArtifact.create({
        claimId: input.claimId,
        companyId: input.companyId,
        claimAnalysis: {
          claimType: claimAnalysis.claimType,
          verificationRequirements: claimAnalysis.verificationRequirements,
          normalizedClaim: claimAnalysis.normalizedClaim,
          analyzedAt: new Date(),
        },
        evidenceMatches: {
          matches: evidenceMatching.matches.map(m => ({
            source: m.source,
            evidenceId: m.evidenceId ? new Types.ObjectId(m.evidenceId) : undefined,
            page: m.page,
            textSnippet: m.textSnippet,
            relevanceScore: m.relevanceScore,
          })),
          matchedAt: new Date(),
        },
        verificationDecision: {
          status: verificationDecision.status,
          confidence: verificationDecision.confidence,
          reasoning: verificationDecision.reasoning,
          decidedAt: new Date(),
        },
        severityScore: {
          severity: severityScore.severity,
          reason: severityScore.reason,
          scoredAt: new Date(),
        },
        pipelineVersion: this.PIPELINE_VERSION,
        completedAt: new Date(),
      });
      
      const duration = Date.now() - startTime;
      logger.info('[VerificationPipeline] Pipeline complete:', {
        duration: `${duration}ms`,
        status: verificationDecision.status,
        severity: severityScore.severity,
      });
      
      return {
        claimAnalysis,
        evidenceMatching,
        verificationDecision,
        severityScore,
        pipelineVersion: this.PIPELINE_VERSION,
      };
      
    } catch (error: any) {
      logger.error('[VerificationPipeline] Pipeline failed:', error);
      
      // Store failure artifact
      await VerificationArtifact.create({
        claimId: input.claimId,
        companyId: input.companyId,
        claimAnalysis: {
          claimType: input.claimType,
          verificationRequirements: [],
          normalizedClaim: input.rawClaimText,
          analyzedAt: new Date(),
        },
        evidenceMatches: {
          matches: [],
          matchedAt: new Date(),
        },
        verificationDecision: {
          status: 'INSUFFICIENT_EVIDENCE',
          confidence: 0,
          reasoning: 'Pipeline failed',
          decidedAt: new Date(),
        },
        severityScore: {
          severity: 'MEDIUM',
          reason: 'Pipeline error',
          scoredAt: new Date(),
        },
        pipelineVersion: this.PIPELINE_VERSION,
        failedAt: new Date(),
        error: error.message,
      });
      
      throw new Error(`Verification pipeline failed: ${error.message}`);
    }
  }
}

export const verificationPipeline = new VerificationPipeline();
