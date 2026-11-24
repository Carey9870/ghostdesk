'use client';
// path: apps/web/src/components/admin/TwoFactorSetup.tsx
// purpose: Links an authenticator app to the admin account: confirm password, scan the QR code, enter a code to prove it works, then save the backup codes.
import { QRCodeSVG } from 'qrcode.react';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

type Step = 'password' | 'scan' | 'codes';

const field = 'mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const button = 'mt-5 h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60';

export function TwoFactorSetup({ email }: { email: string }) {
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const secret = uri ? new URL(uri).searchParams.get('secret') : null;

  const start = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const { data, error: err } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (err || !data) return setError('That password isn’t right.');
    setUri(data.totpURI); setCodes(data.backupCodes); setStep('scan');
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') });
    setBusy(false);
    if (err) return setError('That code isn’t right. Check the time on your phone and try the next code.');
    setStep('codes');
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-br from-indigo-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-slate-900">Set up two-factor</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {email}. The dashboard opens once an authenticator app is linked.</p>

        {step === 'password' && (
          <form onSubmit={start}>
            <label className="mt-5 block text-sm text-slate-600" htmlFor="pw">Confirm your password</label>
            <input id="pw" type="password" autoComplete="current-password" required className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
            <button className={button} disabled={busy}>{busy ? 'Please wait…' : 'Continue'}</button>
          </form>
        )}

        {step === 'scan' && (
          <form onSubmit={verify}>
            <p className="mt-5 text-sm text-slate-600">1. Open an authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator) and scan this code.</p>
            <div className="my-4 flex justify-center rounded-2xl bg-slate-50 p-4"><QRCodeSVG value={uri} size={192} bgColor="#ffffff" fgColor="#1e1b4b" marginSize={2} /></div>
            {secret && <p className="break-all rounded-lg bg-slate-100 p-2 text-center font-mono text-xs text-slate-600">Can’t scan? Enter this key: {secret}</p>}
            <p className="mt-4 text-sm text-slate-600">2. Enter the 6-digit code the app shows.</p>
            <input aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} className={`${field} text-center text-2xl tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
            <button className={button} disabled={busy}>{busy ? 'Checking…' : 'Turn on two-factor'}</button>
          </form>
        )}

        {step === 'codes' && (
          <div>
            <p className="mt-5 text-sm text-slate-600">Two-factor is on. Save these backup codes somewhere safe. Each one works once if you lose your phone, and they won’t be shown again.</p>
            <ul className="my-4 grid grid-cols-2 gap-2 rounded-2xl bg-amber-50 p-4 font-mono text-sm text-amber-900">
              {codes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="size-4 accent-indigo-600" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I’ve saved my backup codes
            </label>
            <button className={button} disabled={!saved} onClick={() => { window.location.href = '/admin'; }}>Open the dashboard</button>
          </div>
        )}
      </div>
    </main>
  );
}
