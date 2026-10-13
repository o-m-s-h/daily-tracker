import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateLabel, shiftMonth } from '../../lib/dates';

export function MonthNavigation({ month, currentMonth, disabled, onChange }: { month: string; currentMonth: string; disabled: boolean; onChange: (value: string) => void }) {
  return <div className="month-navigation"><button className="icon-button" aria-label="Previous month" disabled={disabled || month <= '1900-01'} onClick={() => onChange(shiftMonth(month, -1))}><ChevronLeft size={18} /></button><h3 aria-live="polite">{dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}</h3><button className="icon-button" aria-label="Next month" disabled={disabled || month >= '2100-12'} onClick={() => onChange(shiftMonth(month, 1))}><ChevronRight size={18} /></button><button className="button small secondary" disabled={disabled || month === currentMonth} onClick={() => onChange(currentMonth)}>This month</button></div>;
}
