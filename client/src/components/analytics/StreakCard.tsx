import { Flame, Trophy } from 'lucide-react';
import type { Streaks } from '../../types/analytics';

export function StreakCard({ streaks }: { streaks: Streaks }) {
  return <section className="panel streak-panel"><div className="panel-heading"><div><h2>Keep the rhythm</h2><p>Consecutive days when every eligible activity was completed.</p></div></div><div className="streak-values"><div><Flame size={22} /><strong>{streaks.current}<small> days</small></strong><span>Streak at range end</span></div><div><Trophy size={22} /><strong>{streaks.longest}<small> days</small></strong><span>Longest in range</span></div></div><p className="chart-footnote">Streaks are limited to this date range. An unfinished today keeps yesterday’s streak alive.</p></section>;
}
