import type { ReactNode } from 'react';

export function ProgressCard({ label, value, detail, icon, accent = '' }: { label: string; value: string; detail: string; icon: ReactNode; accent?: string }) {
  const percent = value.endsWith('%') ? Math.min(100, Math.max(0, Number.parseFloat(value))) : null;
  return <div className={`stat-card ${accent}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span>{percent !== null && <div className="stat-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>}</div>;
}
