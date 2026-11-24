// path: apps/web/src/app/admin/(panel)/customers/[id]/page.tsx
// purpose: One customer: license key, status, payments and devices, with actions to resend the key, extend or revoke access and reset devices.
import { notFound } from 'next/navigation';
import { Panel, StatusBadge, table, td, th } from '@/components/admin/widgets';
import { customerDetail } from '@/lib/admin-data';
import { dateTime, money } from '@/lib/format';
import { extendAccess, resendEmail, resetDevices, setStatus } from '../../actions';

const MESSAGES: Record<string, string> = {
  'email-sent': 'License email sent.', 'email-failed': 'The email could not be sent. Check the Resend settings.',
  extended: 'Access extended.', status: 'Status updated.', devices: 'Devices reset. The customer can activate on new devices.',
};

const btn = 'h-10 rounded-xl px-4 text-sm font-semibold text-white';

export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, { msg }] = await Promise.all([params, searchParams]);
  const l = await customerDetail(id);
  if (!l) notFound();
  return (
    <div className="space-y-6">
      <div><p className="text-sm text-slate-500">Customer</p><h1 className="break-all text-2xl font-bold">{l.email}</h1></div>
      {msg && MESSAGES[msg] && <p role="status" className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">{MESSAGES[msg]}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="License" color="indigo" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Key</dt><dd className="select-all font-mono font-semibold text-indigo-700">{l.key}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={l.status} /></dd></div>
            <div><dt className="text-slate-500">Plan</dt><dd className="font-medium">{l.plan}</dd></div>
            <div><dt className="text-slate-500">Access until</dt><dd className="font-medium">{dateTime(l.accessUntil)}</dd></div>
            <div><dt className="text-slate-500">Joined</dt><dd>{dateTime(l.createdAt)}</dd></div>
            <div><dt className="text-slate-500">Paystack subscription</dt><dd className="break-all font-mono text-xs">{l.subscriptionCode ?? 'not linked yet'}</dd></div>
          </dl>
        </Panel>

        <Panel title="Actions" color="rose">
          <div className="space-y-3">
            <form action={resendEmail}><input type="hidden" name="id" value={l.id} /><button className={`${btn} w-full bg-sky-600 hover:bg-sky-500`}>Resend license email</button></form>
            <form action={extendAccess} className="flex gap-2"><input type="hidden" name="id" value={l.id} />
              <select name="days" className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-sm"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option></select>
              <button className={`${btn} bg-emerald-600 hover:bg-emerald-500`}>Extend</button></form>
            <form action={setStatus}><input type="hidden" name="id" value={l.id} />
              {l.status === 'DISABLED'
                ? <><input type="hidden" name="status" value="ACTIVE" /><button className={`${btn} w-full bg-emerald-600 hover:bg-emerald-500`}>Restore access</button></>
                : <><input type="hidden" name="status" value="DISABLED" /><button className={`${btn} w-full bg-rose-600 hover:bg-rose-500`}>Revoke access</button></>}
            </form>
            <form action={resetDevices}><input type="hidden" name="id" value={l.id} /><button className={`${btn} w-full bg-amber-600 hover:bg-amber-500`}>Reset devices</button></form>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Payments (${l.payments.length})`} color="violet">
          <table className={table}>
            <thead><tr><th className={th}>When</th><th className={th}>Amount</th><th className={th}>Reference</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {l.payments.length === 0 && <tr><td className={td} colSpan={3}>No payments.</td></tr>}
              {l.payments.map((p) => <tr key={p.id}><td className={td}>{dateTime(p.paidAt)}</td><td className={`${td} font-semibold text-emerald-700`}>{money(p.amount)}</td><td className={`${td} font-mono text-xs`}>{p.reference}</td></tr>)}
            </tbody>
          </table>
        </Panel>
        <Panel title={`Devices (${l.activations.length} of 3)`} color="amber">
          <table className={table}>
            <thead><tr><th className={th}>Device</th><th className={th}>First seen</th><th className={th}>Last seen</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {l.activations.length === 0 && <tr><td className={td} colSpan={3}>Not activated yet.</td></tr>}
              {l.activations.map((a) => <tr key={a.id}><td className={`${td} font-mono text-xs`}>{a.deviceId.slice(0, 8)}…</td><td className={td}>{dateTime(a.firstSeenAt)}</td><td className={td}>{dateTime(a.lastSeenAt)}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
