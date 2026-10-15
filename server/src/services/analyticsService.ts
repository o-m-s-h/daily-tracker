import mongoose from 'mongoose';
import { Activity } from '../models/Activity.js';
import { DailyRecord } from '../models/DailyRecord.js';
import { HttpError } from '../middleware/errorMiddleware.js';
import { calculateAnalytics, comparisonWindows } from '../utils/analyticsUtils.js';
import type { AnalyticsFilters } from '../types/analytics.js';

export async function getAnalytics(userId: string, filters: AnalyticsFilters, today: string, timeZone: string) {
  // A snapshot prevents a concurrent checkbox save or deletion from mixing two states.
  return mongoose.connection.transaction(async session => {
    const activities = await Activity.find({ userId }).select('name color startDate archivedAt').sort({ createdAt: 1, _id: 1 }).session(session).lean();
    const available = activities.filter(activity => filters.includeArchived || !activity.archivedAt);
    const selected = available.filter(activity => !filters.activityId || String(activity._id) === filters.activityId);
    if (filters.activityId && !selected.length) throw new HttpError(404, 'This activity is unavailable for the selected filters.');
    const windows = comparisonWindows(filters.to.slice(0, 7), today);
    const from = [filters.from, windows.current.from, windows.previous.from].sort()[0];
    const lastRequested = [filters.to, windows.current.to, windows.previous.to].sort().at(-1)!;
    const to = lastRequested < today ? lastRequested : today;
    const records = selected.length && from <= to ? await DailyRecord.find({
      userId, activityId: { $in: selected.map(activity => activity._id) }, date: { $gte: from, $lte: to },
    }).select('activityId date').session(session).lean() : [];
    return calculateAnalytics(
      activities.map(activity => ({ id: String(activity._id), name: activity.name, color: activity.color, startDate: activity.startDate, archived: !!activity.archivedAt })),
      records.map(record => ({ activityId: String(record.activityId), date: record.date })),
      filters, today, timeZone,
    );
  }, { readConcern: { level: 'snapshot' } });
}
