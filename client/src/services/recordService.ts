import { api } from './api';
import type { DailyRecord } from '../types/record';

export const recordService = {
  list: (month: string, signal?: AbortSignal) => api<{ records: DailyRecord[] }>(`/records?month=${encodeURIComponent(month)}`, { signal }),
  save: (activityId: string, date: string, completed: boolean) => api<DailyRecord & { completed: boolean }>('/records', { method: 'PUT', body: JSON.stringify({ activityId, date, completed }) }),
};
