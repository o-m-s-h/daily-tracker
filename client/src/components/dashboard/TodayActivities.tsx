import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import type { Activity } from '../../types/activity';
import { recordKey } from '../../types/record';
import { DayCheckbox } from '../tracker/DayCheckbox';

export function TodayActivities({ activities, today, records, busy, pending, onToggle }: { activities: Activity[]; today: string; records: Set<string>; busy: boolean; pending: string; onToggle: (activity: Activity, date: string) => void }) {
  const done = activities.filter(activity => records.has(recordKey(activity._id, today))).length;
  const complete = activities.length > 0 && done === activities.length;
  const previous = useRef(complete);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (complete && !previous.current) setCelebrate(true);
    if (!complete) setCelebrate(false);
    previous.current = complete;
  }, [complete]);
  useEffect(() => {
    if (!celebrate) return;
    const timer = window.setTimeout(() => setCelebrate(false), 2400);
    return () => window.clearTimeout(timer);
  }, [celebrate]);
  return <section className="panel today-panel"><div className="panel-heading"><div><span className="eyebrow">ONE DAY AT A TIME</span><h2>Today’s focus</h2></div><span className="count-badge">{done} / {activities.length} complete</span></div>
    {activities.length ? <div className="today-list">{activities.map(activity => {
      const checked = records.has(recordKey(activity._id, today));
      return <div key={activity._id} className={`today-item ${activity.color} ${checked ? 'is-complete' : ''}`}><span className={`activity-icon ${activity.color}`}>{checked ? <Check size={20} /> : <ArrowUpRight size={20} />}</span><div><strong>{activity.name}</strong><small>{activity.description || (checked ? 'You showed up. Nice work.' : 'A small step worth taking.')}</small></div><DayCheckbox checked={checked} disabled={busy} pending={pending === recordKey(activity._id, today)} label={`${activity.name}, today`} onChange={() => onToggle(activity, today)} /></div>;
    })}</div> : <p className="quiet-empty">Your next good habit starts here. Add an activity to give today a little direction.</p>}
    {activities.length > 0 && done === activities.length && <div role="status" className={`all-done ${celebrate ? 'milestone' : ''}`}><Check size={16} /> All done for today. Enjoy that feeling.</div>}
  </section>;
}
