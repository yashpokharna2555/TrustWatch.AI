/**
 * Verification Agent Interfaces
 * 
 * Strict schemas for agent inputs and outputs.
 * Each agent MUST validate its input and output against these schemas.
 * 
 * Design Principles:
 * - Type safety (TypeScript interfaces)
 * - Runtime validation (zod schemas)
 * - No optional fields that hide errors
 * - Explicit failure modes
 */

import { z } from 'zod';

// ============================================================================
// AGENT 1: Claim Analysis Agent
// ============================================================================

export const ClaimAnalysisInputSchema = z.object({
  rawClaimText: z.string().min(10).max(5000),
  claimType: z.string(), // From extraction (compliance, privacy, sla, etc.)
  sourceUrl: z.string().url(),
});

export const ClaimAnalysisOutputSchema = z.object({
  claimType: z.string(),
  verificationRequirements: z.array(z.string()).min(1),
  normalizedClaim: z.string().min(10),
});

export type ClaimAnalysisInput = z.infer<typeof ClaimAnalysisInputSchema>;
export type ClaimAnalysisOutput = z.infer<typeof ClaimAnalysisOutputSchema>;

// ============================================================================
// AGENT 2: Evidence Matching Agent
// ============================================================================

export const EvidenceMatchingInputSchema = z.object({
  normalizedClaim: z.string(),
  verificationRequirements: z.array(z.string()),
  availableEvidence: z.array(z.object({
    source: z.enum(['pdf', 'webpage']),
    evidenceId: z.string().optional(),
    content: z.string(),
    pageNumbers: z.array(z.number()).optional(),
    pageContent: z.record(z.string()).optional(), // { "1": "text...", "2": "text..." }
  })),
});

export const EvidenceMatchingOutputSchema = z.object({
  matches: z.array(z.object({
    source: z.enum(['pdf', 'webpage']),
    evidenceId: z.string().optional(),
    page: z.number().optional(),
    textSnippet: z.string().max(1000), // Limit snippet size
    relevanceScore: z.number().min(0).max(1),
  })),
});

export type EvidenceMatchingInput = z.infer<typeof EvidenceMatchingInputSchema>;
export type EvidenceMatchingOutput = z.infer<typeof EvidenceMatchingOutputSchema>;

// ============================================================================
// AGENT 3: Verification Decision Agent
// ============================================================================

export const VerificationDecisionInputSchema = z.object({
  normalizedClaim: z.string(),
  evidenceMatches: z.array(z.object({
    source: z.enum(['pdf', 'webpage']),
    page: z.number().optional(),
    textSnippet: z.string(),
    relevanceScore: z.number(),
  })),
});

export const VerificationDecisionOutputSchema = z.object({
  status: z.enum(['VERIFIED', 'CONTRADICTED', 'INSUFFICIENT_EVIDENCE']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(20).max(1000), // Force agent to explain
});

export type VerificationDecisionInput = z.infer<typeof VerificationDecisionInputSchema>;
export type VerificationDecisionOutput = z.infer<typeof VerificationDecisionOutputSchema>;

// ============================================================================
// AGENT 4: Severity Scoring Agent
// ============================================================================

export const SeverityScoringInputSchema = z.object({
  claimType: z.string(),
  verificationStatus: z.enum(['VERIFIED', 'CONTRADICTED', 'INSUFFICIENT_EVIDENCE']),
  confidence: z.number().min(0).max(1),
  normalizedClaim: z.string(),
});

export const SeverityScoringOutputSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason: z.string().min(20).max(500),
});

export type SeverityScoringInput = z.infer<typeof SeverityScoringInputSchema>;
export type SeverityScoringOutput = z.infer<typeof SeverityScoringOutputSchema>;

// ============================================================================
// PIPELINE RESULT
// ============================================================================

export interface VerificationPipelineResult {
  claimAnalysis: ClaimAnalysisOutput;
  evidenceMatching: EvidenceMatchingOutput;
  verificationDecision: VerificationDecisionOutput;
  severityScore: SeverityScoringOutput;
  pipelineVersion: string;
}
