import { Check } from 'lucide-react';

export function DayCheckbox({ checked, disabled, pending, label, onChange }: { checked: boolean; disabled: boolean; pending?: boolean; label: string; onChange: () => void }) {
  return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} aria-busy={pending || undefined} disabled={disabled} onClick={onChange} className={`day-checkbox ${checked ? 'checked' : ''} ${pending ? 'pending' : ''}`} title={label}>{checked && <Check size={13} strokeWidth={3} />}</button>;
}
