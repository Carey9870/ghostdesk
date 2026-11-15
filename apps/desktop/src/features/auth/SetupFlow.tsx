// path: apps/desktop/src/features/auth/SetupFlow.tsx
// purpose: First-run flow that creates the vault: pattern, confirm pattern, passphrase, then the recovery key.
import { useState } from 'react';
import { PATTERN_MIN } from '@ghostdesk/shared';
import { api } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { AuthShell, Heading, PassphraseSetupForm, PatternStep, RecoveryKeyReveal } from './steps';

type Step = 'pattern' | 'confirm' | 'passphrase' | 'recovery';

export function SetupFlow() {
  const vaultCreated = useSession((s) => s.vaultCreated);
  const [step, setStep] = useState<Step>('pattern');
  const [pattern, setPattern] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState('');

  if (step === 'pattern') {
    return (
      <PatternStep title="Create your pattern" hint={`Connect at least ${PATTERN_MIN} dots`} error={error}
        onComplete={(p) => {
          if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`);
          setError(''); setPattern(p); setStep('confirm');
        }} />
    );
  }
  if (step === 'confirm') {
    return (
      <PatternStep title="Draw it again" hint="Confirm your pattern" error={error}
        onComplete={(p) => {
          if (p.join() !== pattern.join()) { setError('The patterns didn’t match. Start again.'); setStep('pattern'); return; }
          setError(''); setStep('passphrase');
        }} />
    );
  }
  if (step === 'passphrase') {
    return (
      <AuthShell>
        <Heading title="Add a passphrase" hint="Your pattern and passphrase work together." />
        <PassphraseSetupForm
          submitLabel="Create my vault"
          onSubmit={async (passphrase) => { setRecovery(await api.createVault(passphrase, pattern)); setStep('recovery'); }}
        />
      </AuthShell>
    );
  }
  return <AuthShell><RecoveryKeyReveal recoveryKey={recovery} onDone={() => void vaultCreated()} /></AuthShell>;
}
