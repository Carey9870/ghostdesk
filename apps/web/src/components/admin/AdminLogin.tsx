'use client';
// path: apps/web/src/components/admin/AdminLogin.tsx
// purpose: Admin sign-in form: email and password, then the 6-digit code from the authenticator app (or a backup code). On the very first run it creates the admin account.
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

type Step = 'credentials' | 'totp' | 'backup';

const field = 'mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const button = 'mt-5 h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60';

export function AdminLogin({ firstRun }: { firstRun: boolean }) {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<string | null>) => {
    setBusy(true); setError('');
    try { const problem = await task(); if (problem) setError(problem); }
    catch { setError('Something went wrong. Try again.'); }
    finally { setBusy(false); }
  };

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (firstRun) {
        if (password.length < 12) return 'Use at least 12 characters.';
        if (password !== confirm) return 'The passwords don’t match.';
        const { error: err } = await authClient.signUp.email({ email, password, name: 'Admin' });
        if (err) return 'Couldn’t create the account. Check that this email is listed in ADMIN_EMAILS.';
        window.location.href = '/r/c/vadmin/setup';
        return null;
      }
      const { data, error: err } = await authClient.signIn.email({ email, password });
      if (err || !data) return 'Invalid email or password.';
      if ('twoFactorRedirect' in data && data.twoFactorRedirect) { setStep('totp'); return null; }
      window.location.href = '/admin'; // an account without two-factor is sent to set-up by the server
      return null;
    });
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const clean = code.replace(/\s/g, '');
      const { error: err } = step === 'totp'
        ? await authClient.twoFactor.verifyTotp({ code: clean, trustDevice: false })
        : await authClient.twoFactor.verifyBackupCode({ code: clean });
      if (err) return step === 'totp' ? 'That code isn’t right or has expired.' : 'That backup code isn’t valid.';
      window.location.href = '/admin';
      return null;
    });
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-br from-indigo-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true"><path d="M12 2C7.6 2 5 5.3 5 9.5V21l2.5-2 2.3 2 2.2-2 2.2 2 2.3-2 2.5 2V9.5C19 5.3 16.4 2 12 2z" fill="currentColor" /></svg>
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{step === 'credentials' ? (firstRun ? 'Create the admin account' : 'Admin sign-in') : 'Two-factor check'}</h1>
            <p className="text-sm text-slate-500">GhostDesk control room</p>
          </div>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={submitCredentials} noValidate>
            <label className="text-sm text-slate-600" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="mt-4 block text-sm text-slate-600" htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete={firstRun ? 'new-password' : 'current-password'} required className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            {firstRun && (
              <>
                <label className="mt-4 block text-sm text-slate-600" htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" autoComplete="new-password" required className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <p className="mt-2 text-xs text-slate-500">At least 12 characters. Next you’ll link an authenticator app.</p>
              </>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
            <button className={button} disabled={busy}>{busy ? 'Please wait…' : firstRun ? 'Create account' : 'Continue'}</button>
          </form>
        ) : (
          <form onSubmit={submitCode} noValidate>
            <p className="text-sm text-slate-600">{step === 'totp' ? 'Open your authenticator app and enter the 6-digit code for GhostDesk Admin.' : 'Enter one of your saved backup codes. Each works once.'}</p>
            <input aria-label="Code" inputMode={step === 'totp' ? 'numeric' : 'text'} autoComplete="one-time-code" autoFocus required className={`${field} text-center text-2xl tracking-[0.3em]`}
              value={code} onChange={(e) => setCode(e.target.value)} maxLength={step === 'totp' ? 6 : 24} />
            {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
            <button className={button} disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="mt-3 w-full text-sm text-indigo-600 hover:underline" onClick={() => { setStep(step === 'totp' ? 'backup' : 'totp'); setCode(''); setError(''); }}>
              {step === 'totp' ? 'Use a backup code instead' : 'Use the authenticator app instead'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
