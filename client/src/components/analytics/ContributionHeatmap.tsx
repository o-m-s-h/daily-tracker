import { useMemo, useState } from 'react';
import type { DailyProgress } from '../../types/analytics';
import { dateLabel } from '../../lib/dates';

export function ContributionHeatmap({ daily }: { daily: DailyProgress[] }) {
  const [inspected, setInspected] = useState<string | null>(null);
  const cells = useMemo(() => {
    const offset = daily.length ? new Date(`${daily[0].date}T12:00:00Z`).getUTCDay() : 0;
    const values: (DailyProgress | null)[] = [...Array<null>(offset).fill(null), ...daily];
    while (values.length % 7) values.push(null);
    return values;
  }, [daily]);
  const weekCount = cells.length / 7;
  const selected = daily.find(day => day.date === inspected);
  const description = (day: DailyProgress) => `${dateLabel(day.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}: ${day.future ? 'Future date' : day.eligible ? `${day.completed}/${day.eligible} complete (${day.percentage}%)` : 'No eligible activities'}`;
  return <section className="panel heatmap-panel"><div className="panel-heading"><div><h2>Your consistency, day by day</h2><p>Each square is a day. Darker shades mean a higher completion rate.</p></div></div><div className="heatmap-scroll" tabIndex={0} role="region" aria-label="Activity heatmap. Scroll horizontally for longer ranges."><div className="heatmap-labels"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div><div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${weekCount}, 14px)` }}>{Array.from({ length: weekCount }, (_, week) => {
    const day = cells.slice(week * 7, week * 7 + 7).find(value => value !== null);
    const prior = week ? cells.slice((week - 1) * 7, week * 7).find(value => value !== null) : null;
    return <span key={week}>{day && (!prior || prior.date.slice(0, 7) !== day.date.slice(0, 7)) ? dateLabel(day.date, { month: 'short' }) : ''}</span>;
  })}</div><div className="heatmap-cells" style={{ gridTemplateColumns: `repeat(${weekCount}, 14px)` }}>{cells.map((day, index) => {
    if (!day) return <span key={`pad-${index}`} className="heatmap-padding" aria-hidden="true" />;
    const level = day.percentage === null ? 'none' : day.percentage === 0 ? '0' : String(Math.min(4, Math.ceil(day.percentage / 25)));
    return <button key={day.date} type="button" className={`heatmap-cell heat-${level} ${day.future ? 'heat-future' : ''}`} title={description(day)} aria-label={description(day)} aria-pressed={inspected === day.date} onMouseEnter={() => setInspected(day.date)} onFocus={() => setInspected(day.date)} onClick={() => setInspected(day.date)} />;
  })}</div></div></div><div className="heatmap-footer"><span role="status">{selected ? description(selected) : 'Hover, focus, or tap a square to see its totals.'}</span><span className="heatmap-key">Less {[0, 1, 2, 3, 4].map(level => <i key={level} className={`heatmap-cell heat-${level}`} />)} More <i className="heatmap-cell heat-none" /> No eligible work</span></div></section>;
}
