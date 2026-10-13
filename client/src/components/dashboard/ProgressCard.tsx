import type { ReactNode } from 'react';

export function ProgressCard({ label, value, detail, icon, accent = '' }: { label: string; value: string; detail: string; icon: ReactNode; accent?: string }) {
  return <div className={`stat-card ${accent}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span></div>;
}
