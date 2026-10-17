import mongoose from 'mongoose';
import { z } from 'zod';
import { Activity } from '../models/Activity.js';
import { DailyRecord } from '../models/DailyRecord.js';
import { asyncHandler, HttpError } from '../middleware/errorMiddleware.js';
import { calendarDate, objectId } from '../middleware/validateRequest.js';
import { todayIn } from '../utils/dateUtils.js';

export const listRecords = asyncHandler(async (req, res) => {
  const month = z.string().regex(/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/, 'Enter a valid month (YYYY-MM)').parse(req.query.month);
  const records = await DailyRecord.find({ userId: req.session.userId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).select('activityId date').lean();
  res.json({ records });
});
export const saveRecord = asyncHandler(async (req, res) => {
  const { activityId, date, completed } = z.object({ activityId: objectId, date: calendarDate, completed: z.boolean() }).parse(req.body);
  const today = todayIn(res.locals.user.timeZone);
  if (date < today) throw new HttpError(400, 'Past days are read-only. Only today’s checkmarks can be changed.');
  if (date > today) throw new HttpError(400, 'Future dates cannot be checked off.');
  // Touch the parent in the transaction to serialize checkbox saves with archive/delete.
  await mongoose.connection.transaction(async session => {
    const activity = await Activity.findOneAndUpdate(
      { _id: activityId, userId: req.session.userId, archivedAt: null },
      { $inc: { revision: 1 } }, { new: true, session },
    );
    if (!activity) throw new HttpError(409, 'This activity is archived or no longer exists. Refresh your tracker.');
    if (date < activity.startDate) throw new HttpError(400, 'This date is before the activity started.');
    const filter = { userId: req.session.userId, activityId, date };
    if (completed) await DailyRecord.updateOne(filter, { $setOnInsert: filter }, { upsert: true, session });
    else await DailyRecord.deleteOne(filter, { session });
  });
  res.json({ activityId, date, completed });
});
