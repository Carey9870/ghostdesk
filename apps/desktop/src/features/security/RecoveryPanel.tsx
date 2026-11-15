// path: apps/desktop/src/features/security/RecoveryPanel.tsx
// purpose: Renews the recovery key of the vault that is open. The old key is retired permanently once the new one is saved.
import { useState } from 'react';
import { api } from '@/lib/ipc';
import { RecoveryKeyReveal } from '../auth/steps';
import { Reauth } from './Reauth';

export function RecoveryPanel({ onDone }: { onDone: () => void }) {
  const [newKey, setNewKey] = useState('');
  if (newKey) return <RecoveryKeyReveal recoveryKey={newKey} doneLabel="Retire the old key" onDone={onDone} />;
  return (
    <>
      <p className="mb-4 text-sm text-mute">
        Never show your recovery key to anyone. Renewing creates a new key and permanently retires the old one, so a leaked key becomes useless.
      </p>
      <Reauth description="First, confirm it’s you. Draw your pattern." submitLabel="Renew key" onSubmit={async (p, pat) => setNewKey(await api.renewRecoveryKey(p, pat))} />
    </>
  );
}
