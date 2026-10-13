import type { Activity } from '../types/activity';
import { recordKey } from '../types/record';

export const percentage = (done: number, total: number) => total ? Math.round(done / total * 100) : 0;
export function progress(activities: Activity[], dates: string[], today: string, records: Set<string>) {
  let done = 0;
  let total = 0;
  for (const activity of activities) {
    for (const date of dates) {
      if (date >= activity.startDate && date <= today) {
        total++;
        if (records.has(recordKey(activity._id, date))) done++;
      }
    }
  }
  return { done, total, percent: percentage(done, total) };
}
