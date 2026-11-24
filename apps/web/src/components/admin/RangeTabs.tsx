// path: apps/web/src/components/admin/RangeTabs.tsx
// purpose: 7 / 30 / 90 day switch for dashboard pages (uses the ?range= query parameter).
import Link from 'next/link';
import type { Range } from '@/lib/admin-data';

export function RangeTabs({ current, base }: { current: Range; base: string }) {
  return (
    <div className="inline-flex rounded-xl bg-white p-1 text-sm shadow-sm ring-1 ring-slate-200">
      {(['7d', '30d', '90d'] as const).map((r) => (
        <Link key={r} href={`${base}?range=${r}`} className={`rounded-lg px-3.5 py-1.5 font-medium ${r === current ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
        </Link>
      ))}
    </div>
  );
}
