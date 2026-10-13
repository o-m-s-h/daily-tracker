import { api } from './api';
import type { Activity, ActivityInput } from '../types/activity';

export const activityService = {
  list: (signal?: AbortSignal) => api<{ activities: Activity[] }>('/activities', { signal }),
  create: (input: ActivityInput) => api<{ activity: Activity }>('/activities', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: ActivityInput) => api<{ activity: Activity }>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  archive: (id: string, archived: boolean) => api<{ activity: Activity }>(`/activities/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) }),
  delete: (id: string) => api<void>(`/activities/${id}`, { method: 'DELETE', body: '{}' }),
};
