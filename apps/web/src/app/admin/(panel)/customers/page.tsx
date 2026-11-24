// path: apps/web/src/app/admin/(panel)/customers/page.tsx
// purpose: Customers (licenses): search by email or key, plan, status, expiry, devices and payments.
import Link from 'next/link';
import { Panel, StatusBadge, table, td, th } from '@/components/admin/widgets';
import { customersList } from '@/lib/admin-data';
import { dateOnly } from '@/lib/format';

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await customersList(q, page);
  const link = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-slate-500">{total} license{total === 1 ? '' : 's'}</p></div>
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search email or key" className="h-10 w-64 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" /><button className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">Search</button></form>
      </div>
      <Panel title="Licenses" color="emerald">
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>Email</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Access until</th><th className={th}>Devices</th><th className={th}>Payments</th><th className={th}>Joined</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td className={td} colSpan={7}>No customers found.</td></tr>}
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-emerald-50/40">
                  <td className={td}><Link className="font-medium text-indigo-600 hover:underline" href={`/admin/customers/${l.id}`}>{l.email}</Link></td>
                  <td className={td}>{l.plan}</td><td className={td}><StatusBadge status={l.status} /></td><td className={td}>{dateOnly(l.accessUntil)}</td>
                  <td className={td}>{l._count.activations}</td><td className={td}>{l._count.payments}</td><td className={td}>{dateOnly(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={link(page - 1)} className="text-indigo-600 hover:underline">Previous</Link> : <span />}
            <span className="text-slate-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={link(page + 1)} className="text-indigo-600 hover:underline">Next</Link> : <span />}
          </div>
        )}
      </Panel>
    </div>
  );
}
