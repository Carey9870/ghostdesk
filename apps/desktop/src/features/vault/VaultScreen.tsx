// path: apps/desktop/src/features/vault/VaultScreen.tsx
// purpose: Layout of the unlocked vault: responsive sidebar (drawer below 1024px), toolbar, file list, viewer and the auto-lock dialog.
import { useEffect, useState } from 'react';
import { api } from '@/lib/ipc';
import { useMediaQuery } from '@/lib/utils';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';
import { AutoLockDialog } from '../autolock/AutoLockDialog';
import { PaywallDialog } from '../license/PaywallDialog';
import { useInactivityWatcher } from '../autolock/autolock';
import { useImport } from './actions';
import { FileList } from './FileList';
import { Footer } from './Footer';
import { LapsedBanner } from './LapsedBanner';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { Viewer } from './viewer/Viewer';

function ImportProgressBar() {
  const p = useVault((s) => s.progress);
  if (!p) return null;
  const pct = p.totalBytes ? Math.round((p.doneBytes / p.totalBytes) * 100) : 100;
  return (
    <div role="status" className="border-b border-line px-4 py-3 text-sm text-mute sm:px-7">
      Encrypting “{p.fileName}” ({p.index + 1} of {p.count}) {pct}%
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-cyan transition-[width]" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function VaultScreen() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [drawer, setDrawer] = useState(false);
  const [autoLock, setAutoLock] = useState(5);
  const lock = useSession((s) => s.lock);
  const { pick } = useImport();

  useEffect(() => { api.getSettings().then((s) => setAutoLock(s.autoLockMinutes)).catch(() => undefined); }, []);
  useEffect(() => { if (desktop) setDrawer(false); }, [desktop]);
  useInactivityWatcher(autoLock, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); void lock(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar open={drawer} onClose={() => setDrawer(false)} desktop={desktop} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Toolbar showMenu={!desktop} menuOpen={drawer} onMenu={() => setDrawer(true)} onAdd={() => void pick()} autoLock={autoLock} onAutoLock={setAutoLock} />
        <LapsedBanner />
        <ImportProgressBar />
        <FileList onAdd={() => void pick()} />
        <Footer />
      </main>
      <Viewer />
      <PaywallDialog />
      <AutoLockDialog />
    </div>
  );
}
