import { addDays } from './dateUtils.js';
import type { Streaks } from '../types/analytics.js';

export interface StreakDay { date: string; completed: number; eligible: number }

/** Streaks are bounded by the selected range. No eligible work is not a success. */
export function calculateStreaks(days: StreakDay[], today: string): Streaks {
  const ordered = days.filter(day => day.date <= today).slice().sort((a, b) => a.date.localeCompare(b.date));
  const complete = (day: StreakDay) => day.eligible > 0 && day.completed === day.eligible;
  let run = 0;
  let longest = 0;
  let previousDate = '';
  for (const day of ordered) {
    run = complete(day) ? (previousDate && addDays(previousDate, 1) === day.date ? run + 1 : 1) : 0;
    longest = Math.max(longest, run);
    previousDate = day.date;
  }
  let end = ordered.length - 1;
  // Today's work is still in progress; yesterday's streak remains alive until midnight.
  if (end >= 0 && ordered[end].date === today && !complete(ordered[end])) {
    end--;
    if (end >= 0 && ordered[end].date !== addDays(today, -1)) return { current: 0, longest };
  }
  let current = 0;
  for (let i = end; i >= 0; i--) {
    if (!complete(ordered[i]) || (i < end && addDays(ordered[i].date, 1) !== ordered[i + 1].date)) break;
    current++;
  }
  return { current, longest };
}
