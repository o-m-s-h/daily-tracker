import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { colors, type Activity, type ActivityColor, type ActivityInput } from '../../types/activity';

export function ActivityDialog({ activity, today, onClose, onSave }: { activity: Activity | null; today: string; onClose: () => void; onSave: (input: ActivityInput) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [color, setColor] = useState<ActivityColor>(activity?.color ?? 'violet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await onSave({ name: String(data.get('name')).trim(), description: String(data.get('description')).trim(), startDate: activity?.startDate ?? String(data.get('startDate')), color });
      onClose();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="activity-dialog" aria-labelledby="activity-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">MAKE IT A HABIT</span><h2 id="activity-dialog-title">{activity ? 'Edit activity' : 'A new beginning'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button></div>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <label>Activity name<input autoFocus name="name" required maxLength={80} defaultValue={activity?.name} placeholder="e.g. Read for 20 minutes" /></label>
      <label>A little more detail <span className="optional">(optional)</span><textarea name="description" maxLength={240} rows={3} defaultValue={activity?.description} placeholder="What does showing up look like?" /></label>
      <label>Start date<input type="date" name="startDate" min="1900-01-01" max={today} defaultValue={activity?.startDate ?? today} required disabled={!!activity} /></label>
      <p className="field-hint">{activity ? 'The start date is fixed to keep your history consistent.' : 'Only today can be checked off. An earlier start date includes past days in your totals, but those days remain read-only.'}</p>
      <span className="field-label" id="color-label">Activity color</span><div className="color-options" role="group" aria-labelledby="color-label">{colors.map(value => <button key={value} type="button" className={`color-option ${value}`} aria-label={value} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value && <Check size={18} />}</button>)}</div>
    </fieldset>{error && <div className="error-banner" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : activity ? 'Save changes' : 'Create activity'}</button></div></form>
  </dialog>;
}
