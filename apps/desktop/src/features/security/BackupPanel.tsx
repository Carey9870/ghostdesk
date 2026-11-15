// path: apps/desktop/src/features/security/BackupPanel.tsx
// purpose: Encrypted backup export and restore. Backups are protected by their own passphrase and need no server.
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { activity } from '@/lib/activity';
import { IpcError, api, type ImportProgress } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';
import { Heading, PassphraseEntryForm, PassphraseSetupForm } from '../auth/steps';

type Mode = 'home' | 'export' | 'restore';
const FILTERS = [{ name: 'GhostDesk backup', extensions: ['gdbackup'] }];

export function BackupPanel() {
  const [mode, setMode] = useState<Mode>('home');
  const [source, setSource] = useState('');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState('');
  const canRestore = useSession((s) => s.license.state === 'active');

  const exportBackup = async (passphrase: string) => {
    const dest = await save({ defaultPath: `GhostDesk-backup-${new Date().toISOString().slice(0, 10)}.gdbackup`, filters: FILTERS, title: 'Save encrypted backup' });
    if (!dest) return;
    const release = activity.hold();
    try {
      const n = await api.exportBackup(dest, passphrase, setProgress);
      toast.success(`Backup saved with ${n} file${n === 1 ? '' : 's'}`);
      setMode('home');
    } finally { release(); setProgress(null); }
  };

  const pickBackup = async () => {
    const picked = await openDialog({ multiple: false, directory: false, filters: FILTERS, title: 'Choose a GhostDesk backup' });
    if (typeof picked === 'string') { setSource(picked); setError(''); setMode('restore'); }
  };

  const restore = async (passphrase: string) => {
    const release = activity.hold();
    try {
      const report = await api.restoreBackup(source, passphrase, setProgress);
      await useVault.getState().load();
      if (report.imported.length) toast.success(`Restored ${report.imported.length} file${report.imported.length === 1 ? '' : 's'}`);
      for (const f of report.failed) toast.error(`${f.path}: ${f.error}`);
      setMode('home');
    } catch (e) { setError(e instanceof IpcError ? e.message : 'Couldn’t restore the backup.'); }
    finally { release(); setProgress(null); }
  };

  const bar = progress && (
    <p role="status" className="mt-3 text-sm text-mute">Working on “{progress.fileName}” ({progress.index + 1} of {progress.count})…</p>
  );

  if (mode === 'export') {
    return (
      <div>
        <Heading title="Backup passphrase" hint="Choose a passphrase that protects the backup file. It can be different from your vault passphrase." />
        <PassphraseSetupForm submitLabel="Choose where to save" onSubmit={exportBackup} />
        {bar}
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setMode('home')}>Back</Button>
      </div>
    );
  }
  if (mode === 'restore') {
    return (
      <div>
        <Heading title="Restore a backup" hint="Enter the passphrase you chose when you created the backup." />
        <PassphraseEntryForm submitLabel="Restore" error={error} onSubmit={restore} />
        {bar}
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setMode('home')}>Back</Button>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm text-mute">
      <p>A backup is one encrypted file you can keep on a USB drive or any cloud folder. Without its passphrase it is unreadable, and it never touches our servers.</p>
      <p className="text-pink">Anyone who has the backup file and its passphrase can read your files. Keep them apart.</p>
      <Button className="w-full" onClick={() => setMode('export')}><Download size={16} />Export encrypted backup</Button>
      <Button className="w-full" disabled={!canRestore} onClick={() => void pickBackup()}><Upload size={16} />Restore from a backup</Button>
      {!canRestore && <p>Restoring needs an active subscription.</p>}
    </div>
  );
}
