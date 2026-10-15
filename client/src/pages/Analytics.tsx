import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Check, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsFilters, AnalyticsResult } from '../types/analytics';
import { addDays, dateLabel, monthDays, shiftMonth } from '../lib/dates';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { CompletionChart, percentLabel } from '../components/analytics/CompletionChart';
import { CompletionDonut } from '../components/analytics/CompletionDonut';
import { HabitChart } from '../components/analytics/HabitChart';
import { ContributionHeatmap } from '../components/analytics/ContributionHeatmap';
import { StreakCard } from '../components/analytics/StreakCard';
import { MonthComparison } from '../components/analytics/MonthComparison';

export function Analytics({ today }: { today: string }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({ from: `${today.slice(0, 7)}-01`, to: today, includeArchived: false }));
  const [draft, setDraft] = useState(filters);
  const [validation, setValidation] = useState('');
  const [options, setOptions] = useState<AnalyticsResult['activityOptions']>([]);
  const { data, error, loading, refresh } = useAnalytics(filters, today);
  useEffect(() => { if (data) setOptions(data.activityOptions); }, [data]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) { setValidation('Choose a start date on or before the end date.'); return; }
    const days = (Date.parse(`${draft.to}T12:00:00Z`) - Date.parse(`${draft.from}T12:00:00Z`)) / 86_400_000;
    if (days > 365) { setValidation('Choose at most 366 days at a time.'); return; }
    setValidation(''); setFilters({ ...draft }); refresh();
  }
  function preset(kind: 'month' | 'previous' | 'quarter' | 'year') {
    const month = today.slice(0, 7);
    const previous = shiftMonth(month, -1);
    const range = kind === 'previous' ? { from: `${previous}-01`, to: monthDays(previous).at(-1)! } : { from: kind === 'month' ? `${month}-01` : kind === 'year' ? `${today.slice(0, 4)}-01-01` : addDays(today, -89), to: today };
    const next = { ...draft, ...range };
    setDraft(next); setFilters(next); setValidation(''); refresh();
  }
  return <div className="analytics-page"><section className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> THE BIGGER PICTURE</div><h1>Small steps. Visible progress.</h1><p>Explore the patterns behind your everyday effort.</p></div><button className="button secondary" disabled={loading} onClick={refresh}><RefreshCw size={16} /> Refresh insights</button></section>
    <form className="panel analytics-filters" onSubmit={apply}><div className="filter-fields"><label>From<input type="date" required min="1900-01-01" max="2100-12-31" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label><label>To<input type="date" required min="1900-01-01" max="2100-12-31" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label><label className="activity-filter">Activity<select value={draft.activityId ?? ''} onChange={event => setDraft({ ...draft, activityId: event.target.value || undefined })}><option value="">All activities</option>{options.filter(option => draft.includeArchived || !option.archived).map(option => <option key={option.id} value={option.id}>{option.name}{option.archived ? ' (archived)' : ''}</option>)}</select></label><button className="button primary" type="submit">Apply filters</button></div><div className="filter-bottom"><div className="range-presets">{([{ key: 'month', label: 'This month' }, { key: 'previous', label: 'Last month' }, { key: 'quarter', label: 'Last 90 days' }, { key: 'year', label: 'Year to date' }] as const).map(item => <button type="button" key={item.key} onClick={() => preset(item.key)}>{item.label}</button>)}</div><label className="archive-filter"><input type="checkbox" checked={draft.includeArchived} onChange={event => setDraft({ ...draft, includeArchived: event.target.checked, activityId: undefined })} />Include archived activities</label></div>{validation && <p className="filter-error" role="alert">{validation}</p>}</form>
    {error && <div className="error-banner" role="alert">{error} <button className="text-button" onClick={refresh}>Try again</button></div>}
    {loading && <section className="panel analytics-loading"><LoadingSkeleton /></section>}
    {data && <><div className="analytics-context"><span>{dateLabel(data.filters.from, { month: 'short', day: 'numeric', year: 'numeric' })} – {dateLabel(data.filters.to, { month: 'short', day: 'numeric', year: 'numeric' })} · {data.habits.length} {data.habits.length === 1 ? 'activity' : 'activities'}</span><span>Snapshot at {new Intl.DateTimeFormat('en-US', { timeZone: data.timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(data.generatedAt))}</span></div>
      <div className="stats-grid"><ProgressCard label="Range completion" value={percentLabel(data.summary.percentage)} detail={`${data.summary.completed} of ${data.summary.eligible} eligible activity-days`} icon={<Target size={19} />} accent="purple-stat" /><ProgressCard label="Month completion" value={percentLabel(data.comparison.current.percentage)} detail={dateLabel(data.comparison.current.from, { month: 'long', year: 'numeric' }) + (data.comparison.mode === 'elapsed-days' ? ' · to date' : ' · full month')} icon={<TrendingUp size={19} />} /><ProgressCard label="Completed check-ins" value={String(data.summary.completed)} detail="Saved completions in your date range" icon={<Check size={19} />} /><ProgressCard label="Perfect days" value={String(data.daily.filter(day => day.eligible > 0 && day.completed === day.eligible).length)} detail="Every eligible activity completed" icon={<CalendarDays size={19} />} /></div>
      {!data.summary.eligible && <div className="analytics-empty" role="status">No eligible activity-days in this range. Try different dates, choose another activity, or add an activity in the tracker.</div>}
      <div className="analytics-two-col"><CompletionChart daily={data.daily} /><CompletionDonut summary={data.summary} /></div><ContributionHeatmap daily={data.daily} /><div className="analytics-two-col"><HabitChart habits={data.habits} /><div className="analytics-stack"><MonthComparison comparison={data.comparison} /><StreakCard streaks={data.streaks} /></div></div>
      <details className="panel analytics-data"><summary>Explore the daily numbers</summary><div className="data-table-scroll" tabIndex={0} role="region" aria-label="Daily analytics data"><table><caption className="sr-only">Daily values used by the charts for the selected filters</caption><thead><tr><th scope="col">Date</th><th scope="col">Completed</th><th scope="col">Eligible</th><th scope="col">Unchecked</th><th scope="col">Completion</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.date}><th scope="row">{day.date}{day.future ? ' (future)' : ''}</th><td>{day.completed}</td><td>{day.eligible}</td><td>{day.remaining}</td><td>{percentLabel(day.percentage)}</td></tr>)}</tbody></table></div></details>
      <p className="analytics-method">Percentages count eligible activity-days, not averages of daily percentages. Dates before an activity starts and future dates are excluded. {data.filters.includeArchived ? 'Archived activities are included across their full date history; archiving is not a pause schedule.' : 'Archived activities are excluded.'} A dash means there is no eligible data.</p>
    </>}
  </div>;
}
