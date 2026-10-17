import { Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Activity } from '../../types/activity';
import { recordKey } from '../../types/record';
import { dateLabel } from '../../lib/dates';
import { progress } from '../../lib/calculations';
import { DayCheckbox } from './DayCheckbox';

interface Props {
  activities: Activity[]; days: string[]; today: string; records: Set<string>; busy: boolean; pending: string;
  onToggle: (activity: Activity, date: string) => void;
  onEdit: (activity: Activity) => void; onArchive: (activity: Activity) => void; onDelete: (activity: Activity) => void;
}
export function MonthlyGrid({ activities, days, today, records, busy, pending, onToggle, onEdit, onArchive, onDelete }: Props) {
  return <div className="grid-scroll" role="region" aria-label="Monthly activity tracker, scroll horizontally to see all dates" tabIndex={0}><table className="monthly-grid">
    <caption className="sr-only">Daily completions for {dateLabel(days[0], { month: 'long', year: 'numeric' })}. Only today can be changed. Past days and archived activities are read-only.</caption>
    <thead><tr><th scope="col" className="activity-column">Your activities <span>{activities.length}</span></th>{days.map(date => <th key={date} scope="col" className={`${date === today ? 'today-column' : ''} ${date > today ? 'future-column' : ''}`}><span className="weekday">{dateLabel(date, { weekday: 'short' }).slice(0, 1)}</span><span className="day-number">{Number(date.slice(-2))}</span></th>)}<th scope="col" className="progress-column">Progress</th><th scope="col" className="actions-column">Manage</th></tr></thead>
    <tbody>{activities.map(activity => {
      const stats = progress([activity], days, today, records);
      return <tr key={activity._id} className={activity.color}><th scope="row" className="activity-column"><div className="activity-name"><span className={`activity-dot ${activity.color}`} /><div><strong title={activity.name}>{activity.name}</strong><small title={activity.description}>{activity.archivedAt ? 'Archived · history preserved' : activity.description || 'A little progress, every day'}</small></div></div></th>
        {days.map(date => <td key={date} className={date === today ? 'today-column' : ''}>{date < activity.startDate ? <span className="not-started" title="Before activity start date">·</span> : <DayCheckbox checked={records.has(recordKey(activity._id, date))} disabled={busy || date !== today || !!activity.archivedAt} pending={pending === recordKey(activity._id, date)} label={`${activity.name}, ${dateLabel(date, { month: 'long', day: 'numeric', year: 'numeric' })}${date > today ? ' (future date)' : date < today ? ' (past day, read-only)' : activity.archivedAt ? ' (archived, read-only)' : ''}`} onChange={() => onToggle(activity, date)} />}</td>)}
        <td className="progress-column"><strong>{stats.total ? `${stats.percent}%` : '—'}</strong><small>{stats.done}/{stats.total} days</small></td><td><div className="row-actions"><button className="icon-button" disabled={busy} aria-label={`Edit ${activity.name}`} title="Edit activity" onClick={() => onEdit(activity)}><Pencil size={14} /></button><button className="icon-button" disabled={busy} aria-label={`${activity.archivedAt ? 'Restore' : 'Archive'} ${activity.name}`} title={activity.archivedAt ? 'Restore activity' : 'Archive activity'} onClick={() => onArchive(activity)}>{activity.archivedAt ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button><button className="icon-button danger-icon" disabled={busy} aria-label={`Delete ${activity.name}`} title="Delete activity" onClick={() => onDelete(activity)}><Trash2 size={14} /></button></div></td></tr>;
    })}</tbody>
  </table></div>;
}
