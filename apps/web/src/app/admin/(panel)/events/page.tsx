// path: apps/web/src/app/admin/(panel)/events/page.tsx
// purpose: Log of Paystack webhook events the site has processed (events that failed are released so Paystack retries them).
import { Panel, table, td, th } from '@/components/admin/widgets';
import { webhookLog } from '@/lib/admin-data';
import { dateTime } from '@/lib/format';

export default async function Events() {
  const rows = await webhookLog();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Webhooks</h1><p className="text-sm text-slate-500">Events from Paystack that were processed successfully.</p></div>
      <Panel title="Latest 150 events" color="rose">
        <div className="overflow-x-auto">
          <table className={table}>
            <thead><tr><th className={th}>Received</th><th className={th}>Event</th><th className={th}>Fingerprint</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td className={td} colSpan={3}>No events yet.</td></tr>}
              {rows.map((e) => <tr key={e.id}><td className={td}>{dateTime(e.receivedAt)}</td><td className={`${td} font-medium text-rose-700`}>{e.type}</td><td className={`${td} font-mono text-xs`}>{e.id.slice(0, 16)}…</td></tr>)}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
