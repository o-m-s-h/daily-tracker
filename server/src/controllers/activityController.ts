import mongoose from 'mongoose';
import { z } from 'zod';
import { Activity } from '../models/Activity.js';
import { DailyRecord } from '../models/DailyRecord.js';
import { asyncHandler, HttpError } from '../middleware/errorMiddleware.js';
import { activityInput, calendarDate, objectId } from '../middleware/validateRequest.js';
import { todayIn } from '../utils/dateUtils.js';

export const listActivities = asyncHandler(async (req, res) => {
  const activities = await Activity.find({ userId: req.session.userId }).sort({ createdAt: 1 }).lean();
  res.json({ activities });
});
export const createActivity = asyncHandler(async (req, res) => {
  const input = activityInput.extend({ startDate: calendarDate }).parse(req.body);
  if (input.startDate > todayIn(res.locals.user.timeZone)) throw new HttpError(400, 'The start date cannot be in the future.');
  const activity = await Activity.create({ ...input, userId: req.session.userId });
  res.status(201).json({ activity });
});
export const updateActivity = asyncHandler(async (req, res) => {
  const id = objectId.parse(req.params.id);
  const input = activityInput.parse(req.body);
  const activity = await Activity.findOneAndUpdate({ _id: id, userId: req.session.userId }, { $set: input, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!activity) throw new HttpError(404, 'Activity not found.');
  res.json({ activity });
});
export const archiveActivity = asyncHandler(async (req, res) => {
  const id = objectId.parse(req.params.id);
  const { archived } = z.object({ archived: z.boolean() }).parse(req.body);
  const activity = await Activity.findOneAndUpdate({ _id: id, userId: req.session.userId }, { $set: { archivedAt: archived ? new Date() : null }, $inc: { revision: 1 } }, { new: true });
  if (!activity) throw new HttpError(404, 'Activity not found.');
  res.json({ activity });
});
export const deleteActivity = asyncHandler(async (req, res) => {
  const id = objectId.parse(req.params.id);
  await mongoose.connection.transaction(async session => {
    const activity = await Activity.findOneAndDelete({ _id: id, userId: req.session.userId }, { session });
    if (!activity) throw new HttpError(404, 'Activity not found.');
    await DailyRecord.deleteMany({ activityId: id, userId: req.session.userId }, { session });
  });
  res.status(204).end();
});
