import { Schema, model, InferSchemaType } from 'mongoose';

export type ListingType = 'fixed' | 'auction';
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'ended';

const ListingSchema = new Schema(
  {
    listingId: { type: Number, required: true, unique: true, index: true },
    type: { type: String, enum: ['fixed', 'auction'], required: true },
    collection: { type: String, required: true, lowercase: true, index: true },
    tokenId: { type: Number, required: true },
    seller: { type: String, required: true, lowercase: true, index: true },
    price: { type: String, required: true },
    buyoutPrice: { type: String },
    highestBid: { type: String },
    highestBidder: { type: String, lowercase: true },
    endTime: { type: Date },
    buyer: { type: String, lowercase: true },
    status: {
      type: String,
      enum: ['active', 'sold', 'cancelled', 'ended'],
      default: 'active',
      index: true,
    },
    blockNumber: { type: Number, required: true },
    txHash: { type: String, required: true },
  },
  { timestamps: true }
);

export type IListing = InferSchemaType<typeof ListingSchema>;
export const Listing = model<IListing>('Listing', ListingSchema);