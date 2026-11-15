// path: apps/desktop/src/features/security/Reauth.tsx
// purpose: Re-authentication step (pattern, then passphrase) shown before sensitive changes such as renewing the recovery key or managing the decoy vault.
import { useState } from 'react';
import { PATTERN_MIN, PatternPad } from '@ghostdesk/shared';
import { IpcError } from '@/lib/ipc';
import { ErrorLine, PassphraseEntryForm } from '../auth/steps';

interface Props {
  description: string;
  submitLabel: string;
  /** Throw to show an error and restart; resolve to continue. */
  onSubmit: (passphrase: string, pattern: number[]) => Promise<void>;
}

export function Reauth({ description, submitLabel, onSubmit }: Props) {
  const [pattern, setPattern] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  if (!pattern) {
    return (
      <div className="text-center">
        <p className="mb-4 text-sm text-mute">{description}</p>
        <div className="flex justify-center">
          <PatternPad size={240} onComplete={(p) => (p.length < PATTERN_MIN ? setError(`Connect at least ${PATTERN_MIN} dots.`) : (setError(''), setPattern(p)))} />
        </div>
        <ErrorLine>{error}</ErrorLine>
      </div>
    );
  }
  return (
    <PassphraseEntryForm
      submitLabel={submitLabel}
      error={error}
      onSubmit={async (passphrase) => {
        try { await onSubmit(passphrase, pattern); }
        catch (e) { setError(e instanceof IpcError ? e.message : 'Something went wrong. Try again.'); setPattern(null); }
      }}
    />
  );
}
