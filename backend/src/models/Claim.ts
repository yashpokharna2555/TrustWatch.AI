import mongoose, { Schema, Document, Types } from 'mongoose';

export type ClaimStatus = 'ACTIVE' | 'REMOVED' | 'DISPUTED';

export interface IClaim extends Document {
  companyId: Types.ObjectId;
  claimType: string;
  normalizedKey: string;
  currentStatus: ClaimStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  currentSnippet: string;
  currentSourceUrl: string;
  confidence: number;
}

const ClaimSchema = new Schema<IClaim>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  claimType: {
    type: String,
    required: true,
  },
  normalizedKey: {
    type: String,
    required: true,
  },
  currentStatus: {
    type: String,
    enum: ['ACTIVE', 'REMOVED', 'DISPUTED'],
    default: 'ACTIVE',
  },
  firstSeenAt: {
    type: Date,
    required: true,
  },
  lastSeenAt: {
    type: Date,
    required: true,
  },
  currentSnippet: {
    type: String,
    required: true,
  },
  currentSourceUrl: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
});

ClaimSchema.index({ companyId: 1, claimType: 1, normalizedKey: 1 }, { unique: true });

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);
