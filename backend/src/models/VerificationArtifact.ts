/**
 * VerificationArtifact Model
 * 
 * Stores intermediate results from the multi-agent verification pipeline.
 * This provides:
 * - Audit trail (who decided what and why)
 * - Debuggability (which step failed)
 * - Explainability (evidence citations preserved)
 * - Retry capability (resume from last successful step)
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export type VerificationStatus = 'VERIFIED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';
export type AgentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IVerificationArtifact extends Document {
  claimId: Types.ObjectId;
  companyId: Types.ObjectId;
  
  // Step 1: Claim Analysis Agent Output
  claimAnalysis: {
    claimType: string;
    verificationRequirements: string[];
    normalizedClaim: string;
    analyzedAt: Date;
  };
  
  // Step 2: Evidence Matching Agent Output
  evidenceMatches: {
    matches: Array<{
      source: 'pdf' | 'webpage';
      evidenceId?: Types.ObjectId; // If from Evidence collection
      page?: number;
      textSnippet: string;
      relevanceScore: number;
    }>;
    matchedAt: Date;
  };
  
  // Step 3: Verification Decision Agent Output
  verificationDecision: {
    status: VerificationStatus;
    confidence: number;
    reasoning: string;
    decidedAt: Date;
  };
  
  // Step 4: Severity Scoring Agent Output
  severityScore: {
    severity: AgentSeverity;
    reason: string;
    scoredAt: Date;
  };
  
  // Pipeline metadata
  pipelineVersion: string;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  
  createdAt: Date;
}

const VerificationArtifactSchema = new Schema<IVerificationArtifact>({
  claimId: {
    type: Schema.Types.ObjectId,
    ref: 'Claim',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  
  // Step 1 output
  claimAnalysis: {
    claimType: { type: String, required: true },
    verificationRequirements: [String],
    normalizedClaim: { type: String, required: true },
    analyzedAt: { type: Date, required: true },
  },
  
  // Step 2 output
  evidenceMatches: {
    matches: [{
      source: { type: String, enum: ['pdf', 'webpage'], required: true },
      evidenceId: Schema.Types.ObjectId,
      page: Number,
      textSnippet: { type: String, required: true },
      relevanceScore: { type: Number, min: 0, max: 1, required: true },
    }],
    matchedAt: { type: Date, required: true },
  },
  
  // Step 3 output
  verificationDecision: {
    status: {
      type: String,
      enum: ['VERIFIED', 'CONTRADICTED', 'INSUFFICIENT_EVIDENCE'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    reasoning: { type: String, required: true },
    decidedAt: { type: Date, required: true },
  },
  
  // Step 4 output
  severityScore: {
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    reason: { type: String, required: true },
    scoredAt: { type: Date, required: true },
  },
  
  // Pipeline metadata
  pipelineVersion: {
    type: String,
    default: '1.0.0',
  },
  completedAt: Date,
  failedAt: Date,
  error: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

VerificationArtifactSchema.index({ claimId: 1, createdAt: -1 });
VerificationArtifactSchema.index({ companyId: 1, completedAt: -1 });

export const VerificationArtifact = mongoose.model<IVerificationArtifact>(
  'VerificationArtifact',
  VerificationArtifactSchema
);
