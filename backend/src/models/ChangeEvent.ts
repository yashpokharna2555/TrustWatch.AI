import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventType = 'ADDED' | 'REMOVED' | 'WEAKENED' | 'REVERSED' | 'NUMBER_CHANGED';
export type Severity = 'Critical' | 'Medium' | 'Info';

export interface IChangeEvent extends Document {
  companyId: Types.ObjectId;
  claimType: string;
  normalizedKey: string;
  eventType: EventType;
  severity: Severity;
  oldSnippet?: string;
  newSnippet?: string;
  sourceUrl: string;
  detectedAt: Date;
  acknowledged: boolean;
  emailedAt?: Date;
}

const ChangeEventSchema = new Schema<IChangeEvent>({
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
  eventType: {
    type: String,
    enum: ['ADDED', 'REMOVED', 'WEAKENED', 'REVERSED', 'NUMBER_CHANGED'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['Critical', 'Medium', 'Info'],
    required: true,
  },
  oldSnippet: {
    type: String,
  },
  newSnippet: {
    type: String,
  },
  sourceUrl: {
    type: String,
    required: true,
  },
  detectedAt: {
    type: Date,
    default: Date.now,
  },
  acknowledged: {
    type: Boolean,
    default: false,
  },
  emailedAt: {
    type: Date,
  },
});

ChangeEventSchema.index({ companyId: 1, detectedAt: -1 });
ChangeEventSchema.index({ severity: 1, detectedAt: -1 });

export const ChangeEvent = mongoose.model<IChangeEvent>('ChangeEvent', ChangeEventSchema);
