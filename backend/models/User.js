import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refCode: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
