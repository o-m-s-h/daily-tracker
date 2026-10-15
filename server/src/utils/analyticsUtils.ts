import { datesBetween, monthBounds, previousMonth } from './dateUtils.js';
import { calculateStreaks } from './streakUtils.js';
import type { AnalyticsFilters, AnalyticsResult, CompletionTotals, DailyProgress, MonthProgress } from '../types/analytics.js';

export interface AnalyticsActivity {
  id: string;
  name: string;
  color: string;
  startDate: string;
  archived: boolean;
}
export interface AnalyticsRecord { activityId: string; date: string }

export function totals(completed: number, eligible: number): CompletionTotals {
  return { completed, eligible, remaining: eligible - completed, percentage: eligible ? Math.round(completed / eligible * 1000) / 10 : null };
}

export function comparisonWindows(month: string, today: string) {
  const current = monthBounds(month);
  const previous = monthBounds(previousMonth(month));
  const mode = month === today.slice(0, 7) ? 'elapsed-days' as const : 'full-month' as const;
  if (mode === 'elapsed-days') {
    current.to = today;
    const day = Math.min(Number(today.slice(-2)), Number(previous.to.slice(-2)));
    previous.to = `${previous.from.slice(0, 7)}-${String(day).padStart(2, '0')}`;
  }
  return { current, previous, mode };
}

/** All chart values come from the same eligible activity/date pairs. */
export function calculateAnalytics(
  activities: AnalyticsActivity[], records: AnalyticsRecord[], filters: AnalyticsFilters,
  today: string, timeZone: string, generatedAt = new Date().toISOString(),
): AnalyticsResult {
  const options = activities.filter(activity => filters.includeArchived || !activity.archived);
  const selected = options.filter(activity => !filters.activityId || activity.id === filters.activityId);
  const checked = new Set(records.map(record => `${record.activityId}:${record.date}`));
  const days = datesBetween(filters.from, filters.to);
  const daily = (date: string, scope = selected): DailyProgress => {
    const eligible = date > today ? [] : scope.filter(activity => activity.startDate <= date);
    return { date, future: date > today, ...totals(eligible.filter(activity => checked.has(`${activity.id}:${date}`)).length, eligible.length) };
  };
  const sum = (values: CompletionTotals[]) => totals(
    values.reduce((count, item) => count + item.completed, 0),
    values.reduce((count, item) => count + item.eligible, 0),
  );
  const series = days.map(date => daily(date));
  const windows = comparisonWindows(filters.to.slice(0, 7), today);
  const monthly = (bounds: { from: string; to: string }): MonthProgress => ({
    ...bounds, month: bounds.from.slice(0, 7), ...sum(datesBetween(bounds.from, bounds.to).map(date => daily(date))),
  });
  const current = monthly(windows.current);
  const previous = monthly(windows.previous);
  return {
    filters, today, timeZone, generatedAt,
    activityOptions: activities.map(({ id, name, color, archived }) => ({ id, name, color, archived })),
    summary: sum(series), daily: series, streaks: calculateStreaks(series, today),
    habits: selected.map(activity => {
      const habitDays = days.map(date => daily(date, [activity]));
      return { id: activity.id, name: activity.name, color: activity.color, archived: activity.archived, ...sum(habitDays), streaks: calculateStreaks(habitDays, today) };
    }),
    comparison: {
      current, previous, mode: windows.mode,
      // Round once, after subtracting the exact ratios, to avoid rounding drift.
      deltaPercentagePoints: !current.eligible || !previous.eligible ? null : Math.round((current.completed / current.eligible - previous.completed / previous.eligible) * 1000) / 10,
    },
  };
}
