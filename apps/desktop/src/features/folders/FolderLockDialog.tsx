// path: apps/desktop/src/features/folders/FolderLockDialog.tsx
// purpose: Adds, changes or removes a folder's lock. Changing or removing an existing lock first asks for its current pattern/password.
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';
import { api, type LockInput, type Section } from '@/lib/ipc';
import { useVault } from '@/store/vault';
import { CredentialsSetup } from './CredentialsSetup';
import { CredentialsStep } from './CredentialsStep';

type Mode = 'home' | 'current-change' | 'current-remove' | 'new';

const describe = (s: Section) =>
  s.lock ? `Locked with ${s.lock.pattern && s.lock.passphrase ? 'a pattern and a password' : s.lock.pattern ? 'a pattern' : 'a password'}.` : 'This folder has no lock.';

export function FolderLockDialog({ section, onOpenChange }: { section: Section | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={!!section} onOpenChange={onOpenChange} title={`Lock “${section?.name ?? ''}”`}>
      {section && <Inner key={section.id} section={section} close={() => onOpenChange(false)} />}
    </Modal>
  );
}

function Inner({ section, close }: { section: Section; close: () => void }) {
  const [mode, setMode] = useState<Mode>(section.lock ? 'home' : 'new');
  const [current, setCurrent] = useState<LockInput | null>(null);
  const apply = async (setup: LockInput | null, cur: LockInput | null, done: string) => {
    useVault.setState({ data: await api.setSectionLock(section.id, setup, cur) });
    toast.success(done);
    close();
  };

  if (mode === 'home' && section.lock) {
    return (
      <div className="space-y-3 text-sm text-mute">
        <p>{describe(section)} Anyone using your unlocked vault still needs this lock to open the folder.</p>
        <Button className="w-full" onClick={() => setMode('current-change')}>Change lock</Button>
        <Button variant="danger" className="w-full" onClick={() => setMode('current-remove')}>Remove lock</Button>
      </div>
    );
  }
  if (mode === 'current-change' && section.lock) {
    return (
      <CredentialsStep need={section.lock} submitLabel="Continue" description="Confirm the current lock first."
        onSubmit={async (input) => { await api.unlockSection(section.id, input); setCurrent(input); setMode('new'); }} />
    );
  }
  if (mode === 'current-remove' && section.lock) {
    return (
      <CredentialsStep need={section.lock} submitLabel="Remove lock" description="Confirm the current lock to remove it."
        onSubmit={(input) => apply(null, input, 'Folder lock removed')} />
    );
  }
  return <CredentialsSetup submitLabel="Lock folder" onSubmit={(setup) => apply(setup, current, 'Folder locked')} />;
}
