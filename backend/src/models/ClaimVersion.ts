import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClaimVersion extends Document {
  claimId: Types.ObjectId;
  companyId: Types.ObjectId;
  snippet: string;
  sourceUrl: string;
  contentHash: string;
  seenAt: Date;
  polarity: 'positive' | 'negative' | 'neutral';
  extractedMeta?: any;
}

const ClaimVersionSchema = new Schema<IClaimVersion>({
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
  snippet: {
    type: String,
    required: true,
  },
  sourceUrl: {
    type: String,
    required: true,
  },
  contentHash: {
    type: String,
    required: true,
  },
  seenAt: {
    type: Date,
    required: true,
  },
  polarity: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
  },
  extractedMeta: {
    type: Schema.Types.Mixed,
  },
});

ClaimVersionSchema.index({ claimId: 1, seenAt: -1 });
ClaimVersionSchema.index({ companyId: 1, seenAt: -1 });

export const ClaimVersion = mongoose.model<IClaimVersion>('ClaimVersion', ClaimVersionSchema);
