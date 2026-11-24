// path: apps/web/src/components/admin/widgets.tsx
// purpose: Dashboard building blocks with a colour per kind of information: stat cards, panels, bar charts, ranked lists, the funnel and status badges.
import type { ReactNode } from 'react';

export type Color = 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

const TINT: Record<Color, string> = {
  indigo: 'border-indigo-200 bg-indigo-50', sky: 'border-sky-200 bg-sky-50', emerald: 'border-emerald-200 bg-emerald-50',
  amber: 'border-amber-200 bg-amber-50', rose: 'border-rose-200 bg-rose-50', violet: 'border-violet-200 bg-violet-50',
};
const TEXT: Record<Color, string> = {
  indigo: 'text-indigo-700', sky: 'text-sky-700', emerald: 'text-emerald-700', amber: 'text-amber-700', rose: 'text-rose-700', violet: 'text-violet-700',
};
const BAR: Record<Color, string> = {
  indigo: 'bg-indigo-500', sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', violet: 'bg-violet-500',
};
const TOP: Record<Color, string> = {
  indigo: 'border-t-indigo-500', sky: 'border-t-sky-500', emerald: 'border-t-emerald-500', amber: 'border-t-amber-500', rose: 'border-t-rose-500', violet: 'border-t-violet-500',
};

export function StatCard({ label, value, hint, color }: { label: string; value: string; hint?: string; color: Color }) {
  return (
    <div className={`rounded-2xl border p-5 ${TINT[color]}`}>
      <p className={`text-sm font-medium ${TEXT[color]}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Panel({ title, color = 'indigo', action, children, className = '' }: { title: string; color?: Color; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 border-t-4 bg-white p-5 shadow-sm ${TOP[color]} ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BarChart({ data, color, format }: { data: { label: string; value: number }[]; color: Color; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-0.75" role="img" aria-label="Bar chart">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 items-end" title={`${d.label}: ${format ? format(d.value) : d.value}`}>
            <div className={`w-full rounded-t ${BAR[color]}`} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400"><span>{data[0]?.label}</span><span>{data.at(-1)?.label}</span></div>
    </div>
  );
}

export function HBarList({ items, color, empty = 'No data yet.', format }: { items: { label: string; value: number }[]; color: Color; empty?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate text-slate-700">{i.label}</span><span className={`font-medium ${TEXT[color]}`}>{format ? format(i.value) : i.value}</span></div>
          <div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${BAR[color]}`} style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number; color: Color }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : 0;
        return (
          <li key={s.label}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">{s.label}</span>
              <span className="text-slate-500"><b className={TEXT[s.color]}>{s.value}</b>{i > 0 && prev > 0 ? ` (${((s.value / prev) * 100).toFixed(0)}% of previous)` : ''}</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${BAR[s.color]}`} style={{ width: `${Math.max(2, (s.value / top) * 100)}%` }} /></div>
          </li>
        );
      })}
    </ol>
  );
}

const BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700', NON_RENEWING: 'bg-amber-100 text-amber-800', ATTENTION: 'bg-orange-100 text-orange-700', DISABLED: 'bg-rose-100 text-rose-700',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>{status.replace('_', ' ')}</span>;
}

export const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
export const td = 'px-3 py-2.5 text-sm text-slate-700';
export const table = 'w-full min-w-[640px] divide-y divide-slate-100';
