import { Schema, model, InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    address:  { type: String, required: true, unique: true, lowercase: true, index: true },
    username: { type: String, trim: true, maxlength: 32 },
    avatar:   { type: String },
  },
  { timestamps: true }
);

// Use InferSchemaType directly — no need to re-declare fields in a separate
// interface. If the schema changes, the type updates automatically.
export type IUser = InferSchemaType<typeof UserSchema>;

export const User = model<IUser>('User', UserSchema);