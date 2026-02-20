import { Schema, model, InferSchemaType } from 'mongoose';

const BidSchema = new Schema(
  {
    listingId: { type: Number, required: true, index: true },
    bidder: { type: String, required: true, lowercase: true },
    amount: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    blockNumber: { type: Number, required: true },
    txHash: { type: String, required: true },
  },
  { timestamps: true }
);

type BidSchemaType = InferSchemaType<typeof BidSchema>;

export interface IBid extends BidSchemaType {
  listingId: number;
  bidder: string;
  amount: string;
  timestamp: Date;
  blockNumber: number;
  txHash: string;
}

export const Bid = model<IBid>('Bid', BidSchema);