// path: apps/desktop/src/features/auth/UnlockFlow.tsx
// purpose: Unlock screen: draw the pattern, then enter the passphrase. A wrong answer never reveals which factor was wrong.
import { useState } from 'react';
import { PATTERN_MIN } from '@ghostdesk/shared';
import { Button } from '@/components/ui/button';
import { IpcError, api } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { AuthShell, Heading, PassphraseEntryForm, PatternStep } from './steps';
import { RecoveryFlow } from './RecoveryFlow';

export function UnlockFlow() {
  const unlocked = useSession((s) => s.unlocked);
  const [pattern, setPattern] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);

  if (recovering) return <RecoveryFlow onCancel={() => setRecovering(false)} />;

  if (!pattern) {
    return (
      <>
        <PatternStep title="Welcome back" hint="Draw your pattern" error={error}
          onComplete={(p) => {
            if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`);
            setError(''); setPattern(p);
          }} />
        <div className="fixed inset-x-0 bottom-6 text-center">
          <Button variant="ghost" size="sm" onClick={() => setRecovering(true)}>Forgot? Use recovery key</Button>
        </div>
      </>
    );
  }

  return (
    <AuthShell>
      <Heading title="Passphrase" hint="Enter your passphrase to finish unlocking." />
      <PassphraseEntryForm
        error={error}
        onSubmit={async (passphrase) => {
          try { await api.unlock(passphrase, pattern); await unlocked(); }
          catch (e) {
            setError(e instanceof IpcError ? e.message : 'Couldn’t unlock. Try again.');
            setPattern(null); // start over: both factors are asked again
          }
        }}
      />
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setPattern(null); setError(''); }}>Start over</Button>
    </AuthShell>
  );
}
