// path: apps/web/src/app/admin/(panel)/payments/page.tsx
// purpose: Payments list with totals (all time and last 30 days).
import Link from 'next/link';
import { Panel, StatCard, table, td, th } from '@/components/admin/widgets';
import { paymentsList } from '@/lib/admin-data';
import { dateTime, money } from '@/lib/format';

export default async function Payments() {
  const p = await paymentsList();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue, all time" value={money(p.allCents)} hint={`${p.allCount} payments`} color="violet" />
        <StatCard label="Revenue, last 30 days" value={money(p.last30Cents)} hint={`${p.last30Count} payments`} color="emerald" />
      </div>
      <Panel title="Latest 150 payments" color="amber">
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>When</th><th className={th}>Customer</th><th className={th}>Plan</th><th className={th}>Amount</th><th className={th}>Reference</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {p.rows.length === 0 && <tr><td className={td} colSpan={5}>No payments yet.</td></tr>}
              {p.rows.map((r) => (
                <tr key={r.id}><td className={td}>{dateTime(r.paidAt)}</td><td className={td}><Link className="text-indigo-600 hover:underline" href={`/admin/customers/${r.license.id}`}>{r.license.email}</Link></td>
                  <td className={td}>{r.license.plan}</td><td className={`${td} font-semibold text-emerald-700`}>{money(r.amount)} {r.currency}</td><td className={`${td} font-mono text-xs`}>{r.reference}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
