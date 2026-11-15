// path: apps/desktop/src/features/vault/Toolbar.tsx
// purpose: Top bar of the vault: hamburger (below the large breakpoint), section title, auto-lock setting, Add files and Lock now.
import { Lock, Menu, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IpcError, api } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';

const OPTIONS = [1, 2, 5, 15, 30];

interface Props {
  onMenu: () => void;
  menuOpen: boolean;
  showMenu: boolean;
  onAdd: () => void;
  autoLock: number;
  onAutoLock: (minutes: number) => void;
}

export function Toolbar({ onMenu, menuOpen, showMenu, onAdd, autoLock, onAutoLock }: Props) {
  const { data, activeId, progress } = useVault();
  const lock = useSession((s) => s.lock);
  const canAdd = useSession((s) => s.license.state !== 'lapsed');
  const section = data.sections.find((s) => s.id === activeId);
  const count = data.files.filter((f) => f.sectionId === activeId).length;

  const change = async (minutes: number) => {
    try { const s = await api.setAutoLockMinutes(minutes); onAutoLock(s.autoLockMinutes); toast.success(`Auto-lock set to ${s.autoLockMinutes} min of inactivity`); }
    catch (e) { toast.error(e instanceof IpcError ? e.message : 'Couldn’t save the setting.'); }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        {showMenu && (
          <Button variant="default" size="icon" onClick={onMenu} aria-label="Open sections menu" aria-expanded={menuOpen} aria-controls="sidebar">
            <Menu size={20} />
          </Button>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{section?.name ?? 'Vault'}</h2>
          <span className="text-sm text-mute">{section?.locked ? 'Locked' : `${count} file${count === 1 ? '' : 's'}`}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <label htmlFor="autolock" className="text-sm text-mute">Auto-lock after</label>
        <select id="autolock" value={autoLock} onChange={(e) => void change(Number(e.target.value))}
          className="h-10 rounded-[10px] border border-edge bg-field px-3 text-sm text-ink">
          {OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        {canAdd && <Button variant="primary" onClick={onAdd} disabled={!!progress || !!section?.locked}><Plus size={18} />Add files</Button>}
        <Button variant="danger" onClick={() => void lock()}><Lock size={17} />Lock now</Button>
      </div>
    </header>
  );
}
