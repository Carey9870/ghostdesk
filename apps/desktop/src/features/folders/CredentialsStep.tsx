// path: apps/desktop/src/features/folders/CredentialsStep.tsx
// purpose: Asks for exactly what a folder's lock needs (pattern, password, or both) and hands the answers to the caller.
import { useState } from 'react';
import { PATTERN_MIN, PatternPad } from '@ghostdesk/shared';
import { IpcError, type FolderLock, type LockInput } from '@/lib/ipc';
import { ErrorLine, PassphraseEntryForm } from '../auth/steps';

interface Props {
  need: FolderLock;
  submitLabel: string;
  description?: string;
  /** Throw to show an error and start over. */
  onSubmit: (input: LockInput) => Promise<void>;
}

export function CredentialsStep({ need, submitLabel, description, onSubmit }: Props) {
  const [pattern, setPattern] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  const run = async (input: LockInput) => {
    try { await onSubmit(input); }
    catch (e) { setError(e instanceof IpcError ? e.message : 'Something went wrong. Try again.'); setPattern(null); }
  };

  if (need.pattern && !pattern) {
    return (
      <div className="text-center">
        <p className="mb-4 text-sm text-mute">{description ?? 'Draw this folder’s pattern.'}</p>
        <div className="flex justify-center">
          <PatternPad size={240} onComplete={(p) => {
            if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`);
            setError('');
            if (need.passphrase) setPattern(p); else void run({ pattern: p });
          }} />
        </div>
        <ErrorLine>{error}</ErrorLine>
      </div>
    );
  }
  return (
    <PassphraseEntryForm label="Password" submitLabel={submitLabel} error={error}
      onSubmit={(passphrase) => run({ passphrase, pattern: pattern ?? undefined })} />
  );
}
