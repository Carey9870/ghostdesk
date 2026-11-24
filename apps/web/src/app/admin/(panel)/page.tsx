// path: apps/web/src/app/admin/(panel)/page.tsx
// purpose: Admin overview: visitors, revenue, licenses, daily charts, the visit-to-paid funnel, top pages, sources and countries.
import Link from 'next/link';
import { RangeTabs } from '@/components/admin/RangeTabs';
import { BarChart, Funnel, HBarList, Panel, StatCard, StatusBadge, table, td, th } from '@/components/admin/widgets';
import { overview, parseRange } from '@/lib/admin-data';
import { dateTime, duration, money, percent } from '@/lib/format';

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const d = await overview(range);
  const f = d.funnel;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Overview</h1><p className="text-sm text-slate-500">Dates and times shown in the admin time zone. Visitors are counted per day.</p></div>
        <RangeTabs current={range} base="/admin" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value={String(d.visitors)} hint={`${d.views} page views`} color="indigo" />
        <StatCard label="Revenue" value={money(d.revenueCents)} hint={`${d.payments} payment${d.payments === 1 ? '' : 's'}`} color="violet" />
        <StatCard label="Active licenses" value={String(d.activeLicenses)} hint={`${d.newLicenses} new in this period`} color="emerald" />
        <StatCard label="Visitor to paid" value={percent(f[3].value, f[0].value)} hint={`Avg time on page ${d.avgMs ? duration(d.avgMs) : '—'}`} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Visitors per day" color="indigo"><BarChart data={d.visitorSeries} color="indigo" /></Panel>
        <Panel title="Revenue per day" color="violet"><BarChart data={d.revenueSeries} color="violet" format={money} /></Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Funnel" color="emerald" className="lg:col-span-2">
          <Funnel steps={[
            { label: f[0].label, value: f[0].value, color: 'indigo' }, { label: f[1].label, value: f[1].value, color: 'sky' }, { label: f[2].label, value: f[2].value, color: 'amber' },
            { label: f[3].label, value: f[3].value, color: 'emerald' }, { label: f[4].label, value: f[4].value, color: 'violet' }, { label: f[5].label, value: f[5].value, color: 'rose' },
          ]} />
        </Panel>
        <Panel title="Devices" color="sky"><HBarList items={d.devices} color="sky" /></Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top pages" color="indigo"><HBarList items={d.topPages} color="indigo" /></Panel>
        <Panel title="Where visitors come from" color="amber"><HBarList items={d.sources} color="amber" /></Panel>
        <Panel title="Countries" color="rose"><HBarList items={d.countries} color="rose" /></Panel>
      </div>

      <Panel title="Latest payments" color="violet" action={<Link href="/admin/payments" className="text-sm font-medium text-violet-700 hover:underline">All payments</Link>}>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>When</th><th className={th}>Customer</th><th className={th}>Plan</th><th className={th}>Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.recent.length === 0 && <tr><td className={td} colSpan={4}>No payments yet.</td></tr>}
              {d.recent.map((p) => (
                <tr key={p.id}><td className={td}>{dateTime(p.paidAt)}</td><td className={td}><Link className="text-indigo-600 hover:underline" href={`/admin/customers/${p.license.id}`}>{p.license.email}</Link></td>
                  <td className={td}><StatusBadge status="ACTIVE" /> {p.license.plan}</td><td className={`${td} font-semibold text-emerald-700`}>{money(p.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
