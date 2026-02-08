import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  userId: Types.ObjectId;
  domain: string;
  displayName: string;
  categoriesEnabled: string[];
  createdAt: Date;
  lastCrawledAt?: Date;
  riskScore: number;
}

const CompanySchema = new Schema<ICompany>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  domain: {
    type: String,
    required: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  categoriesEnabled: {
    type: [String],
    default: ['security', 'privacy'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastCrawledAt: {
    type: Date,
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

CompanySchema.index({ userId: 1, domain: 1 });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
