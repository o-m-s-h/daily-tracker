import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  timeZone: { type: String, required: true },
}, { timestamps: true });
export const User = model('User', userSchema);
