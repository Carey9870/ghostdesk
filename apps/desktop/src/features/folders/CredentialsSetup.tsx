// path: apps/desktop/src/features/folders/CredentialsSetup.tsx
// purpose: Creates a folder lock: choose pattern, password or both, then set (and confirm) each one. Passwords follow the same rules as the account passphrase.
import { useState } from 'react';
import { PATTERN_MIN, PatternPad } from '@ghostdesk/shared';
import { Button } from '@/components/ui/button';
import { IpcError, type LockInput } from '@/lib/ipc';
import { ErrorLine, Heading, PassphraseSetupForm } from '../auth/steps';

type Step = 'choose' | 'pattern' | 'confirm' | 'password';

export function CredentialsSetup({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (input: LockInput) => Promise<void> }) {
  const [step, setStep] = useState<Step>('choose');
  const [usePattern, setUsePattern] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [error, setError] = useState('');

  const finishPatternOnly = async (p: number[]) => {
    try { await onSubmit({ pattern: p }); }
    catch (e) { setError(e instanceof IpcError ? e.message : 'Something went wrong. Try again.'); setStep('choose'); }
  };

  if (step === 'choose') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-mute">Choose how this folder is locked. You can use a pattern, a password, or both together.</p>
        <label className="flex items-center gap-3"><input type="checkbox" className="size-4 accent-cyan" checked={usePattern} onChange={(e) => setUsePattern(e.target.checked)} />Pattern</label>
        <label className="flex items-center gap-3"><input type="checkbox" className="size-4 accent-cyan" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />Password</label>
        <ErrorLine>{error}</ErrorLine>
        <Button variant="primary" className="w-full" disabled={!usePattern && !usePassword} onClick={() => { setError(''); setStep(usePattern ? 'pattern' : 'password'); }}>Next</Button>
      </div>
    );
  }
  if (step === 'pattern' || step === 'confirm') {
    return (
      <div className="text-center">
        <Heading title={step === 'pattern' ? 'Draw a pattern' : 'Draw it again'} hint={step === 'pattern' ? `Connect at least ${PATTERN_MIN} dots` : 'Confirm the pattern'} />
        <div className="my-5 flex justify-center">
          <PatternPad size={240} onComplete={(p) => {
            if (step === 'pattern') {
              if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`);
              setError(''); setPattern(p); setStep('confirm'); return;
            }
            if (p.join() !== pattern.join()) { setError('The patterns didn’t match. Start again.'); setStep('pattern'); return; }
            setError('');
            if (usePassword) setStep('password'); else void finishPatternOnly(p);
          }} />
        </div>
        <ErrorLine>{error}</ErrorLine>
      </div>
    );
  }
  return (
    <div>
      <Heading title="Choose a password" hint="Same rules as your account passphrase." />
      <PassphraseSetupForm label="Password" submitLabel={submitLabel}
        onSubmit={(passphrase) => onSubmit({ passphrase, pattern: usePattern ? pattern : undefined })} />
    </div>
  );
}
