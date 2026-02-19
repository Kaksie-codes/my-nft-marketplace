import { Schema, model } from 'mongoose';

export type ActivityType =
  | 'mint'
  | 'sale'
  | 'bid'
  | 'transfer'
  | 'list'
  | 'cancel'
  | 'price_update';

export interface IActivity {
  type: ActivityType;
  collection: string; // ✅ now safe
  tokenId: number;
  from: string;
  to?: string;
  price?: string;
  listingId?: number;
  timestamp: Date;
  blockNumber: number;
  txHash: string;
}

const ActivitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ['mint', 'sale', 'bid', 'transfer', 'list', 'cancel', 'price_update'],
      required: true,
      index: true,
    },
    collection: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: Number, required: true },
    from: { type: String, required: true, lowercase: true, index: true },
    to: { type: String, lowercase: true },
    price: { type: String },
    listingId: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
    blockNumber: { type: Number, required: true },
    txHash: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
ActivitySchema.index({ from: 1, timestamp: -1 });
ActivitySchema.index({ to: 1, timestamp: -1 });

export const Activity = model<IActivity>('Activity', ActivitySchema);
