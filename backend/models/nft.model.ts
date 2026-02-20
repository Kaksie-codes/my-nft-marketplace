import { Schema, model, InferSchemaType } from 'mongoose';

const NFTSchema = new Schema(
  {
    // tokenId stored as String — on-chain it is uint256 which can exceed
    // JavaScript's safe integer range (2^53-1). Using String prevents
    // silent data corruption for large token IDs.
    tokenId:    { type: String, required: true },
    collection: { type: String, required: true, lowercase: true, index: true },
    owner:      { type: String, required: true, lowercase: true },
    minter:     { type: String, required: true, lowercase: true },
    tokenURI:   { type: String, required: true },
    category:   { type: String, default: '', index: true },
    metadata: {
      name:        String,
      description: String,
      image:       String,
      attributes:  [{ trait_type: String, value: Schema.Types.Mixed }],
    },
    mintedAt:    { type: Date, default: Date.now },
    blockNumber: { type: Number, required: true },
    txHash:      { type: String, required: true },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

// Compound unique index — a tokenId must be unique within a collection
// but the same tokenId number can exist across different collections
NFTSchema.index({ collection: 1, tokenId: 1 }, { unique: true });

export type INFT = InferSchemaType<typeof NFTSchema>;
export const NFT = model<INFT>('NFT', NFTSchema);