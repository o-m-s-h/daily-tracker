import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CalendarDays, Check, CircleCheck, LayoutGrid, LogOut, Plus, RefreshCw, Sparkles, Sun, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Activity, ActivityInput } from '../types/activity';
import { recordKey } from '../types/record';
import { activityService } from '../services/activityService';
import { recordService } from '../services/recordService';
import { dateLabel, monthDays, todayIn } from '../lib/dates';
import { progress } from '../lib/calculations';
import { ActivityDialog } from '../components/tracker/ActivityDialog';
import { MonthlyGrid } from '../components/tracker/MonthlyGrid';
import { MonthNavigation } from '../components/tracker/MonthNavigation';
import { TodayActivities } from '../components/dashboard/TodayActivities';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

type View = 'tracker' | 'today' | 'archive';
export function Tracker() {
  const { user, logout } = useAuth();
  const [today, setToday] = useState(() => todayIn(user!.timeZone));
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<View>('tracker');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [records, setRecords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [dialog, setDialog] = useState<{ activity: Activity | null } | null>(null);
  const requestId = useRef(0);
  const mutationLock = useRef(false);
  const dataKey = `${month}:${today}`;

  useEffect(() => {
    const update = () => setToday(todayIn(user!.timeZone));
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, [user]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      const months = [...new Set([month, today.slice(0, 7)])];
      const [activityData, ...recordData] = await Promise.all([activityService.list(), ...months.map(value => recordService.list(value))] as const);
      if (id !== requestId.current) return;
      setActivities(activityData.activities);
      setRecords(new Set(recordData.flatMap(data => data.records.map(record => recordKey(record.activityId, record.date)))));
      setLoadedKey(`${month}:${today}`);
    } catch (error) { if (id === requestId.current) { setError((error as Error).message); setLoadedKey(''); } }
    finally { if (id === requestId.current) setLoading(false); }
  }, [month, today]);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  const ready = !loading && loadedKey === dataKey;
  const days = useMemo(() => monthDays(month), [month]);
  const active = activities.filter(activity => !activity.archivedAt);
  const todayActivities = active.filter(activity => activity.startDate <= today);
  const visible = activities.filter(activity => view === 'archive' ? !!activity.archivedAt : !activity.archivedAt);
  const monthStats = progress(active, days, today, records);
  const todayStats = progress(todayActivities, [today], today, records);
  const blocked = busy || !ready;

  async function toggle(activity: Activity, date: string) {
    if (mutationLock.current || blocked) return;
    mutationLock.current = true; setBusy(true); setError(''); setNotice('');
    const key = recordKey(activity._id, date);
    setPending(key);
    const completed = !records.has(key);
    try {
      await recordService.save(activity._id, date, completed);
      setRecords(previous => { const next = new Set(previous); if (completed) next.add(key); else next.delete(key); return next; });
      setNotice(completed ? `${activity.name} checked off. Saved.` : 'Checkmark removed. Saved.');
    } catch (error) { setError(`${(error as Error).message} Refresh to confirm the latest saved state.`); }
    finally { mutationLock.current = false; setBusy(false); setPending(''); }
  }
  async function saveActivity(input: ActivityInput) {
    if (mutationLock.current) throw new Error('Please wait for the current save.');
    mutationLock.current = true; setBusy(true);
    try {
      if (dialog?.activity) await activityService.update(dialog.activity._id, input);
      else await activityService.create(input);
      setNotice(dialog?.activity ? 'Activity updated.' : 'Your new activity is ready.');
      await load();
    } finally { mutationLock.current = false; setBusy(false); }
  }
  async function manage(activity: Activity, action: 'archive' | 'delete') {
    if (mutationLock.current || blocked) return;
    if (action === 'delete' && !window.confirm(`Permanently delete “${activity.name}” and all its checkmarks? This cannot be undone.`)) return;
    mutationLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'delete') await activityService.delete(activity._id);
      else await activityService.archive(activity._id, !activity.archivedAt);
      setNotice(action === 'delete' ? 'Activity and its history deleted.' : activity.archivedAt ? 'Activity restored.' : 'Activity archived. Your history is preserved.');
      await load();
    } catch (error) { setError((error as Error).message); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  async function signOut() {
    if (mutationLock.current) return;
    setBusy(true);
    try { await logout(); } catch (error) { setError((error as Error).message); setBusy(false); }
  }
  const openCreate = () => setDialog({ activity: null });
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark"><Check /></span>daymark<span className="brand-dot">.</span></a><span className="sidebar-label">YOUR WORKSPACE</span>
      <nav aria-label="Main navigation">{([{ key: 'today', label: 'Today', icon: Sun }, { key: 'tracker', label: 'Monthly tracker', icon: LayoutGrid }, { key: 'archive', label: 'Archived', icon: Archive }] as const).map(({ key, label, icon: Icon }) => <button key={key} className={`nav-item ${view === key ? 'selected' : ''}`} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}><Icon size={19} />{label}{key === 'tracker' && <span className="nav-count">{active.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="encouragement"><Sparkles size={20} /><strong>Little by little.</strong><p>You don’t need a perfect day to make a little progress.</p></div><div className="profile"><span className="avatar">{user!.name.slice(0, 1).toUpperCase()}</span><div><strong>{user!.name}</strong><small>Personal workspace</small></div><button className="icon-button" aria-label="Sign out" title="Sign out" disabled={busy} onClick={() => void signOut()}><LogOut size={17} /></button></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><span>My workspace <span className="breadcrumb">/</span> <strong>{view === 'tracker' ? 'Monthly tracker' : view === 'today' ? 'Today' : 'Archived activities'}</strong></span><span className="topbar-date"><CalendarDays size={15} />{dateLabel(today, { month: 'short', day: 'numeric', year: 'numeric' })}</span></header>
      <div className="page-content"><section className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> A LITTLE PROGRESS, EVERY DAY</div><h1>{view === 'archive' ? 'Room for what’s next.' : view === 'today' ? `Make today count, ${user!.name.split(' ')[0]}.` : 'Your daily rhythm.'}</h1><p>{view === 'archive' ? 'Past routines, preserved. Restore an activity whenever you’re ready.' : 'Small actions add up. Keep showing up for what matters to you.'}</p></div><button className="button primary" disabled={busy} onClick={openCreate}><Plus size={18} /> New activity</button></section>
        <div className="stats-grid"><ProgressCard label="Today’s progress" value={ready ? `${todayStats.percent}%` : '—'} detail={ready ? `${todayStats.done} of ${todayStats.total} activities complete` : 'Loading your progress'} icon={<CircleCheck size={19} />} accent="purple-stat" /><ProgressCard label="Active activities" value={ready ? String(active.length).padStart(2, '0') : '—'} detail="Good habits in the making" icon={<Target size={19} />} /><ProgressCard label="Month completion" value={ready ? `${monthStats.percent}%` : '—'} detail={dateLabel(`${month}-01`, { month: 'long', year: 'numeric' }) + ' · through today'} icon={<TrendingUp size={19} />} /><ProgressCard label="Monthly check-ins" value={ready ? String(monthStats.done).padStart(2, '0') : '—'} detail="Every small effort counts" icon={<Check size={19} />} /></div>
        <div className="feedback-row"><span role="status" aria-live="polite">{busy ? 'Saving your changes…' : notice || 'Your progress, one checkmark at a time.'}</span><button className="text-button" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={13} /> Refresh</button></div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {view !== 'today' && <section className="panel tracker-panel"><div className="panel-heading tracker-heading"><div><h2>{view === 'archive' ? 'Activity archive' : 'Monthly tracker'}</h2><p>{view === 'archive' ? 'Checkmarks stay visible. Restore an activity to edit its days.' : 'A big picture of your small, everyday wins.'}</p></div><MonthNavigation month={month} currentMonth={today.slice(0, 7)} disabled={busy || loading} onChange={setMonth} /></div>
          {!ready ? loading || loadedKey !== '' ? <LoadingSkeleton /> : <div className="quiet-empty">Your tracker couldn’t load. Use Refresh to try again.</div> : visible.length ? <MonthlyGrid activities={visible} days={days} today={today} records={records} busy={blocked} pending={pending} onToggle={(activity, date) => void toggle(activity, date)} onEdit={activity => setDialog({ activity })} onArchive={activity => void manage(activity, 'archive')} onDelete={activity => void manage(activity, 'delete')} /> : <EmptyState archived={view === 'archive'} onCreate={openCreate} />}
          <div className="grid-footer"><span><i className="legend-square checked" /> Completed <i className="legend-square" /> Not yet <span className="legend-today" /> Today</span><small>{view === 'archive' ? 'Historical totals include eligible days through today.' : 'Future days and days before an activity starts are excluded.'}</small></div>
        </section>}
        {view !== 'archive' && <div className={`bottom-grid ${view === 'today' ? 'today-view' : ''}`}>{ready ? <TodayActivities activities={todayActivities} today={today} records={records} busy={blocked} pending={pending} onToggle={(activity, date) => void toggle(activity, date)} /> : <section className="panel"><LoadingSkeleton /></section>}<aside className="reflection-card"><span className="reflection-icon"><Sparkles size={23} /></span><span className="eyebrow">A GENTLE REMINDER</span><h2>Progress is a practice.<br />Not a perfect score.</h2><p>Missed a day? That’s okay. The next small step is always there for you.</p><div className="decorative-path" aria-hidden="true"><span /><span /><span /><span /><span /><Check size={19} /></div></aside></div>}
        <footer className="page-footer"><span>Made for your everyday.</span><span>Calendar time zone: {user!.timeZone}</span></footer>
      </div>
    </main>{dialog && <ActivityDialog activity={dialog.activity} today={today} onClose={() => setDialog(null)} onSave={saveActivity} />}
  </div>;
}
