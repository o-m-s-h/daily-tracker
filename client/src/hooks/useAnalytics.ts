import { useCallback, useEffect, useRef, useState } from 'react';
import { getAnalytics } from '../services/analyticsService';
import type { AnalyticsFilters, AnalyticsResult } from '../types/analytics';

export function useAnalytics(filters: AnalyticsFilters, today: string) {
  const key = JSON.stringify([filters.from, filters.to, filters.activityId, filters.includeArchived, today]);
  const [result, setResult] = useState<{ key: string; data?: AnalyticsResult; error?: string } | null>(null);
  const [version, setVersion] = useState(0);
  const request = useRef(0);
  const refresh = useCallback(() => { setResult(null); setVersion(value => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const id = ++request.current;
    setResult(null);
    void getAnalytics(filters, controller.signal).then(data => {
      if (id === request.current && !controller.signal.aborted) setResult({ key, data });
    }).catch((error: Error) => {
      if (id === request.current && !controller.signal.aborted) setResult({ key, error: error.message });
    });
    return () => { controller.abort(); request.current++; };
  }, [key, version]); // The key contains every filter plus the account's current day.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  const current = result?.key === key ? result : null;
  return { data: current?.data, error: current?.error, loading: !current, refresh };
}
