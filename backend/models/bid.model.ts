import { Schema, model, InferSchemaType } from 'mongoose';

const BidSchema = new Schema(
  {
    // listingId stored as String — uint256 on-chain, can exceed JS safe integer range
    listingId:   { type: String, required: true, index: true },
    bidder:      { type: String, required: true, lowercase: true },
    amount:      { type: String, required: true }, // in wei
    timestamp:   { type: Date, default: Date.now },
    blockNumber: { type: Number, required: true },
    txHash:      { type: String, required: true },
  },
  { timestamps: true }
);

// Use InferSchemaType directly — no need to re-declare fields in a separate interface
export type IBid = InferSchemaType<typeof BidSchema>;
export const Bid = model<IBid>('Bid', BidSchema);