import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICrawlTarget extends Document {
  companyId: Types.ObjectId;
  url: string;
  type: 'seed' | 'discovered';
  lastHash?: string;
  lastCrawledAt?: Date;
  createdAt: Date;
}

const CrawlTargetSchema = new Schema<ICrawlTarget>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['seed', 'discovered'],
    required: true,
  },
  lastHash: {
    type: String,
  },
  lastCrawledAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CrawlTargetSchema.index({ companyId: 1, url: 1 }, { unique: true });

export const CrawlTarget = mongoose.model<ICrawlTarget>('CrawlTarget', CrawlTargetSchema);
