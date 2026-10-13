import { Schema, model } from 'mongoose';

const recordSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
  date: { type: String, required: true },
}, { timestamps: true });
recordSchema.index({ userId: 1, activityId: 1, date: 1 }, { unique: true });
recordSchema.index({ userId: 1, date: 1 });
export const DailyRecord = model('DailyRecord', recordSchema);
