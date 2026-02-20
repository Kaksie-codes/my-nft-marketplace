import { Schema, model, InferSchemaType } from 'mongoose';

export type ActivityType =
  | 'mint'
  | 'sale'
  | 'bid'
  | 'transfer'
  | 'list'
  | 'cancel'
  | 'price_update';

const ActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['mint', 'sale', 'bid', 'transfer', 'list', 'cancel', 'price_update'],
      required: true,
      index: true,
    },
    collection:  { type: String, required: true, lowercase: true, index: true },
    // tokenId and listingId stored as String — both are uint256 on-chain
    tokenId:     { type: String, required: true },
    from:        { type: String, required: true, lowercase: true, index: true },
    to:          { type: String, lowercase: true },
    price:       { type: String },
    listingId:   { type: String },
    timestamp:   { type: Date, default: Date.now, index: true },
    blockNumber: { type: Number, required: true },
    txHash:      { type: String, required: true },
  },
  { timestamps: true }
);

// Per-user activity feeds (e.g. "show all activity where I am sender or receiver")
ActivitySchema.index({ from: 1, timestamp: -1 });
ActivitySchema.index({ to: 1, timestamp: -1 });

// Per-NFT activity feed (e.g. "show full history of this specific token")
ActivitySchema.index({ collection: 1, tokenId: 1, timestamp: -1 });

// Use InferSchemaType directly — no need for a manual interface
export type IActivity = InferSchemaType<typeof ActivitySchema>;
export const Activity = model<IActivity>('Activity', ActivitySchema);