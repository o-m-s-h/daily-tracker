import { api } from './api';
import type { AnalyticsFilters, AnalyticsResult } from '../types/analytics';

export function getAnalytics(filters: AnalyticsFilters, signal?: AbortSignal) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to, includeArchived: String(filters.includeArchived) });
  if (filters.activityId) query.set('activityId', filters.activityId);
  return api<AnalyticsResult>(`/analytics?${query}`, { signal });
}
