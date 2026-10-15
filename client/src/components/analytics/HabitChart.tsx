import type { HabitProgress } from '../../types/analytics';
import { percentLabel } from './CompletionChart';

export function HabitChart({ habits }: { habits: HabitProgress[] }) {
  return <section className="panel analytics-chart"><div className="panel-heading"><div><h2>Habit consistency</h2><p>How often you showed up in the selected range.</p></div></div>
    {habits.length ? <div className="habit-bars">{habits.map(habit => <div className={`habit-bar-row ${habit.color}`} key={habit.id}><div className="habit-bar-title"><strong>{habit.name}{habit.archived && <span className="archived-label">Archived</span>}</strong><span>{percentLabel(habit.percentage)}</span></div><div className="habit-track" role="img" aria-label={`${habit.name}: ${habit.completed} of ${habit.eligible} eligible days completed`}><span style={{ width: `${habit.percentage ?? 0}%` }} /></div><div className="habit-bar-detail"><span>{habit.completed} / {habit.eligible} days</span><span>Current: {habit.streaks.current} · Best: {habit.streaks.longest} days</span></div></div>)}</div> : <p className="quiet-empty">No activities match these filters.</p>}
  </section>;
}
