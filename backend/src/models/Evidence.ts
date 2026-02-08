import mongoose, { Schema, Document, Types } from 'mongoose';

export type EvidenceStatus = 'PENDING' | 'READY' | 'FAILED';

export interface IEvidence extends Document {
  companyId: Types.ObjectId;
  claimType: string;
  pdfUrl: string;
  sourceUrl?: string; // The page where the PDF link was found
  contextSnippet?: string; // Text surrounding the PDF link
  status: EvidenceStatus;
  error?: string; // Error message if parsing failed
  extractedFields?: {
    reportType?: string;
    auditor?: string;
    periodStart?: Date;
    periodEnd?: Date;
    scope?: string;
    findings?: string;
    pageNumbers?: number[]; // Pages where claims were found
    pageContent?: { [key: number]: string }; // Content by page number
  };
  createdAt: Date;
  processedAt?: Date;
}

const EvidenceSchema = new Schema<IEvidence>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  claimType: {
    type: String,
    required: true,
  },
  pdfUrl: {
    type: String,
    required: true,
  },
  sourceUrl: {
    type: String,
  },
  contextSnippet: {
    type: String,
  },
  status: {
    type: String,
    enum: ['PENDING', 'READY', 'FAILED'],
    default: 'PENDING',
  },
  error: {
    type: String,
  },
  extractedFields: {
    reportType: String,
    auditor: String,
    periodStart: Date,
    periodEnd: Date,
    scope: String,
    findings: String,
    pageNumbers: [Number],
    pageContent: Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
  },
});

EvidenceSchema.index({ companyId: 1, claimType: 1 });

export const Evidence = mongoose.model<IEvidence>('Evidence', EvidenceSchema);
