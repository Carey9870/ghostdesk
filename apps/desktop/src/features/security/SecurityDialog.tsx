// path: apps/desktop/src/features/security/SecurityDialog.tsx
// purpose: One dialog for security tools: recovery key, encrypted backups and (main vault only) the decoy vault.
import { useState } from 'react';
import { Modal } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import { useVault } from '@/store/vault';
import { BackupPanel } from './BackupPanel';
import { DecoyPanel } from './DecoyPanel';
import { RecoveryPanel } from './RecoveryPanel';

type Tab = 'recovery' | 'backup' | 'decoy';

export function SecurityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const role = useVault((s) => s.data.role);
  const [tab, setTab] = useState<Tab>('recovery');
  const tabs: [Tab, string][] = [['recovery', 'Recovery key'], ['backup', 'Backup'], ...(role === 'primary' ? ([['decoy', 'Decoy vault']] as [Tab, string][]) : [])];

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Security">
      <div role="tablist" aria-label="Security tools" className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm', tab === id ? 'border-cyan bg-cyan/10 text-ink' : 'border-edge text-mute hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      <div key={tab}>
        {tab === 'recovery' && <RecoveryPanel onDone={() => onOpenChange(false)} />}
        {tab === 'backup' && <BackupPanel />}
        {tab === 'decoy' && role === 'primary' && <DecoyPanel />}
      </div>
    </Modal>
  );
}
