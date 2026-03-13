import mongoose, { Document, Schema } from 'mongoose';

export interface IIndexerState extends Document {
  name:      string;
  lastBlock: number;
  updatedAt: Date;
}

const IndexerStateSchema = new Schema<IIndexerState>(
  {
    name:      { type: String, required: true, unique: true, index: true },
    lastBlock: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const IndexerState = mongoose.model<IIndexerState>('IndexerState', IndexerStateSchema);