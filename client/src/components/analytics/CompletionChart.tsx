import { useId } from 'react';
import type { DailyProgress } from '../../types/analytics';
import { dateLabel } from '../../lib/dates';

export const percentLabel = (value: number | null) => value === null ? '—' : `${value}%`;
export function CompletionChart({ daily }: { daily: DailyProgress[] }) {
  const titleId = useId();
  const x = (index: number) => 46 + (daily.length > 1 ? index / (daily.length - 1) : 0.5) * 640;
  const y = (value: number) => 192 - value * 1.6;
  let connected = false;
  const path = daily.map((day, index) => {
    if (day.percentage === null) { connected = false; return ''; }
    const point = `${connected ? 'L' : 'M'}${x(index)},${y(day.percentage)}`;
    connected = true;
    return point;
  }).join(' ');
  const ticks = [...new Set([0, Math.floor((daily.length - 1) / 4), Math.floor((daily.length - 1) / 2), Math.floor((daily.length - 1) * 3 / 4), daily.length - 1])];
  return <section className="panel analytics-chart"><div className="panel-heading"><div><h2>Daily progress</h2><p>Completed activities as a share of eligible activities each day.</p></div><span className="chart-key"><i /> Completion</span></div>
    <div className="line-chart-wrap"><svg viewBox="0 0 720 230" role="img" aria-labelledby={titleId}><title id={titleId}>Daily completion percentage. Full values are available in the daily data table below.</title>
      {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1="46" x2="686" y1={y(value)} y2={y(value)} className="chart-gridline" /><text x="35" y={y(value) + 4} textAnchor="end" className="chart-axis">{value}%</text></g>)}
      {ticks.map(index => daily[index] && <text key={index} x={x(index)} y="218" textAnchor="middle" className="chart-axis">{dateLabel(daily[index].date, { month: 'short', day: 'numeric' })}</text>)}
      <path d={path} fill="none" stroke="#8170da" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {daily.map((day, index) => day.percentage !== null && <circle key={day.date} cx={x(index)} cy={y(day.percentage)} r={daily.length > 60 ? 2 : 3.5} fill="#8170da" stroke="white" strokeWidth="1"><title>{day.date}: {day.completed}/{day.eligible} complete ({day.percentage}%)</title></circle>)}
      {!daily.some(day => day.eligible) && <text x="366" y="110" textAnchor="middle" className="chart-empty-label">No eligible activity-days in this range</text>}
    </svg></div>
    <p className="chart-footnote">Gaps mean no eligible activities. Future days are not scored.</p>
  </section>;
}
