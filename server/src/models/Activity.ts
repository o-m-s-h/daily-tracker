import { Schema, model } from 'mongoose';

const activitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 240 },
  color: { type: String, required: true },
  startDate: { type: String, required: true },
  archivedAt: { type: Date, default: null },
  revision: { type: Number, default: 0 },
}, { timestamps: true });
export const Activity = model('Activity', activitySchema);
