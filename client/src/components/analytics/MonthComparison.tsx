import type { AnalyticsResult } from '../../types/analytics';
import { dateLabel } from '../../lib/dates';
import { percentLabel } from './CompletionChart';

export function MonthComparison({ comparison }: { comparison: AnalyticsResult['comparison'] }) {
  const delta = comparison.deltaPercentagePoints;
  return <section className="panel month-comparison"><div className="panel-heading"><div><h2>Month over month</h2><p>{comparison.mode === 'elapsed-days' ? 'Matching elapsed days, capped to each month’s length.' : 'Full calendar months, using the same activity filter.'}</p></div></div><div className="comparison-body">{[comparison.previous, comparison.current].map((month, index) => <div className={`comparison-row ${index ? 'comparison-current' : ''}`} key={month.month}><div><strong>{dateLabel(month.from, { month: 'long', year: 'numeric' })}</strong><small>{dateLabel(month.from, { month: 'short', day: 'numeric' })} – {dateLabel(month.to, { month: 'short', day: 'numeric' })} · {month.completed}/{month.eligible} complete</small></div><b>{percentLabel(month.percentage)}</b></div>)}<div className={`comparison-delta ${delta !== null && delta < 0 ? 'decreased' : ''}`}>{delta === null ? 'Not enough eligible data to compare.' : `${delta > 0 ? '+' : ''}${delta} percentage points versus previous month`}</div></div><p className="chart-footnote">The comparison month is the month containing your selected end date.</p></section>;
}
