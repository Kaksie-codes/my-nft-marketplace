import { Schema, model, InferSchemaType } from 'mongoose';

const CollectionSchema = new Schema(
  {
    address:      { type: String, required: true, unique: true, lowercase: true, index: true },
    creator:      { type: String, required: true, lowercase: true, index: true },
    name:         { type: String, required: true },
    symbol:       { type: String, required: true },
    // maxSupply and maxPerWallet come from the contract as uint256 — stored
    // as Number here since collection supplies are realistically never large
    // enough to overflow (max ~10000 for most NFT projects). If you ever
    // need to support extremely large supplies, switch these to String too.
    maxSupply:    { type: Number, required: true },
    maxPerWallet: { type: Number, required: true },
    // mintPrice not emitted by CollectionCreated event — defaults to '0'.
    // The collectionIndexer can update this when a MintPriceUpdated event fires.
    mintPrice:    { type: String, default: '0' },
    // category removed — collections don't have categories in the contract.
    // Categories exist on individual NFTs only (stored in tokenCategory mapping).
    blockNumber:  { type: Number, required: true },
    txHash:       { type: String, required: true },
  },
  { timestamps: true }
);

// Use InferSchemaType — no need for a manual interface that duplicates fields
export type ICollection = InferSchemaType<typeof CollectionSchema>;
export const Collection = model<ICollection>('Collection', CollectionSchema);