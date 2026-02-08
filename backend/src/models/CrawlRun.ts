import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICrawlRun extends Document {
  companyId?: Types.ObjectId;
  startedAt: Date;
  finishedAt?: Date;
  pagesCrawled: number;
  claimsExtracted: number;
  eventsCreated: number;
  errors: string[];
  status: 'running' | 'completed' | 'failed';
}

const CrawlRunSchema = new Schema<ICrawlRun>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  startedAt: {
    type: Date,
    required: true,
  },
  finishedAt: {
    type: Date,
  },
  pagesCrawled: {
    type: Number,
    default: 0,
  },
  claimsExtracted: {
    type: Number,
    default: 0,
  },
  eventsCreated: {
    type: Number,
    default: 0,
  },
  errors: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
});

CrawlRunSchema.index({ companyId: 1, startedAt: -1 });

export const CrawlRun = mongoose.model<ICrawlRun>('CrawlRun', CrawlRunSchema);
