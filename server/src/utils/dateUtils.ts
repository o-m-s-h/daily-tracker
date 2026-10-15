export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2100-12-31';
}

export function todayIn(timeZone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const DAY_MS = 86_400_000;
export const dayNumber = (date: string) => Date.parse(`${date}T12:00:00Z`) / DAY_MS;
export const daysBetween = (from: string, to: string) => Math.round(dayNumber(to) - dayNumber(from));
export function addDays(date: string, count: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}
export function datesBetween(from: string, to: string): string[] {
  return Array.from({ length: Math.max(0, daysBetween(from, to) + 1) }, (_, i) => addDays(from, i));
}
export function monthBounds(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number);
  return { from: `${month}-01`, to: new Date(Date.UTC(year, number, 0, 12)).toISOString().slice(0, 10) };
}
export function previousMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 2, 1, 12)).toISOString().slice(0, 7);
}

export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
  catch { return false; }
}
