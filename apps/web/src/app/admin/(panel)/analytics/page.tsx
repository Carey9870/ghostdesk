// path: apps/web/src/app/admin/(panel)/analytics/page.tsx
// purpose: Detailed analytics: busiest hours, cities, browsers, systems, campaigns and a live table of recent visits (page, source, place, device, time on page). No IP addresses are stored.
import { RangeTabs } from '@/components/admin/RangeTabs';
import { BarChart, HBarList, Panel, StatCard, table, td, th } from '@/components/admin/widgets';
import { analyticsDetail, overview, parseRange } from '@/lib/admin-data';
import { dateTime, duration } from '@/lib/format';

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const [a, o] = await Promise.all([analyticsDetail(range), overview(range)]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-slate-500">First-party and cookieless. Raw IP addresses are never stored, only an approximate place and a hash that changes daily.</p></div>
        <RangeTabs current={range} base="/admin/analytics" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value={String(o.visitors)} color="indigo" />
        <StatCard label="Sessions" value={String(a.sessions)} hint="Tabs or visits" color="sky" />
        <StatCard label="Bounce rate" value={`${a.bounceRate.toFixed(0)}%`} hint="Sessions with one page" color="amber" />
        <StatCard label="Avg time on page" value={o.avgMs ? duration(o.avgMs) : '—'} color="emerald" />
      </div>

      <Panel title="Busiest hours (Nairobi time)" color="sky"><BarChart data={a.hours} color="sky" /></Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Cities" color="rose"><HBarList items={a.cities} color="rose" /></Panel>
        <Panel title="Browsers" color="indigo"><HBarList items={a.browsers} color="indigo" /></Panel>
        <Panel title="Operating systems" color="violet"><HBarList items={a.systems} color="violet" /></Panel>
      </div>

      <Panel title="Campaigns (utm_campaign)" color="amber"><HBarList items={a.campaigns} color="amber" empty="Add ?utm_campaign=name to links you share to see results here." /></Panel>

      <Panel title="Recent visits" color="emerald">
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>Time</th><th className={th}>Page</th><th className={th}>From</th><th className={th}>Place</th><th className={th}>Device</th><th className={th}>On page</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {a.recent.length === 0 && <tr><td className={td} colSpan={6}>No visits recorded yet.</td></tr>}
              {a.recent.map((v) => (
                <tr key={v.id}>
                  <td className={td}>{dateTime(v.createdAt)}</td><td className={`${td} font-mono text-xs`}>{v.path}</td>
                  <td className={td}>{v.referrerHost ?? 'Direct'}{v.utmCampaign ? ` · ${v.utmCampaign}` : ''}</td>
                  <td className={td}>{[v.city, v.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className={td}>{v.device} · {v.browser} · {v.os}</td>
                  <td className={td}>{v.durationMs ? duration(v.durationMs) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
