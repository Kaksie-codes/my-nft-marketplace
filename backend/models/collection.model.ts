import { Schema, model, Document } from 'mongoose';

export interface ICollection extends Document {
  address: string;      // deployed contract address
  creator: string;      // wallet address of creator
  name: string;
  symbol: string;
  maxSupply: number;
  maxPerWallet: number;
  mintPrice: string;    // in wei (string to avoid BigInt issues)
  category: string;
  createdAt: Date;
  blockNumber: number;
  txHash: string;
}

const CollectionSchema = new Schema<ICollection>(
  {
    address: { type: String, required: true, unique: true, lowercase: true, index: true },
    creator: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    maxSupply: { type: Number, required: true },
    maxPerWallet: { type: Number, required: true },
    mintPrice: { type: String, required: true },
    category: { type: String, default: '' },
    blockNumber: { type: Number, required: true },
    txHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const Collection = model<ICollection>('Collection', CollectionSchema);