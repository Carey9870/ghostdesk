// path: apps/desktop/src/features/vault/Sidebar.tsx
// purpose: Folders sidebar with per-folder locks. A fixed column on large screens; an off-canvas drawer opened by the hamburger button on smaller screens.
import { openUrl } from '@tauri-apps/plugin-opener';
import { CreditCard, Folder, Lock, LockOpen, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PLANS, type PlanId } from '@ghostdesk/shared';
import { Button } from '@/components/ui/button';
import { AlertAction, AlertCancel, AlertModal } from '@/components/ui/overlay';
import { IpcError, api, type Section } from '@/lib/ipc';
import { cn } from '@/lib/utils';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';
import { FolderLockDialog } from '../folders/FolderLockDialog';
import { UnlockFolderDialog } from '../folders/UnlockFolderDialog';
import { usePaywall } from '../license/paywall';
import { SecurityDialog } from '../security/SecurityDialog';

interface Props { open: boolean; onClose: () => void; desktop: boolean }

const fail = (e: unknown) => toast.error(e instanceof IpcError ? e.message : 'Something went wrong. Try again.');

export function Sidebar({ open, onClose, desktop }: Props) {
  const { data, activeId, select, createSection, renameSection, deleteSection } = useVault();
  const license = useSession((s) => s.license);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Section | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [lockForId, setLockForId] = useState<string | null>(null);
  const [unlockForId, setUnlockForId] = useState<string | null>(null);
  const lapsed = license.state === 'lapsed';
  const free = license.state === 'none';
  const plan = license.plan && license.plan in PLANS ? PLANS[license.plan as PlanId] : null;
  const byId = (id: string | null) => data.sections.find((s) => s.id === id) ?? null;

  const commit = async (value: string) => {
    const id = editing;
    setEditing(null);
    if (!value.trim() || !id) return;
    try { await (id === 'new' ? createSection(value) : renameSection(id, value)); } catch (e) { fail(e); }
  };

  const manage = async () => {
    try { await openUrl(await api.manageSubscriptionUrl()); } catch (e) { fail(e); }
  };

  const relock = async (id: string) => {
    try { useVault.setState({ data: await api.relockSection(id) }); } catch (e) { fail(e); }
  };

  const editor = (initial: string) => (
    <input
      autoFocus defaultValue={initial} maxLength={28} placeholder="Name your folder" aria-label="Folder name"
      className="h-10 w-full rounded-[10px] border border-cyan bg-field px-3 text-ink outline-none"
      onKeyDown={(e) => { if (e.key === 'Enter') void commit(e.currentTarget.value); if (e.key === 'Escape') setEditing(null); }}
      onBlur={() => setEditing(null)}
    />
  );

  return (
    <>
      {!desktop && open && <div className="fixed inset-0 z-30 bg-black/60" onClick={onClose} aria-hidden="true" />}
      <aside
        id="sidebar" aria-label="Folders" inert={!desktop && !open}
        className={cn(
          'z-40 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-line bg-panel p-4',
          desktop ? 'sticky top-0 h-dvh shrink-0' : 'fixed inset-y-0 left-0 transition-transform duration-200',
          !desktop && (open ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        <div className="flex items-center justify-between px-2 pb-3">
          <span className="text-lg text-mute">Folders</span>
          {!desktop && <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close folders menu"><X size={18} /></Button>}
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto">
          {data.sections.map((s) =>
            editing === s.id ? <div key={s.id}>{editor(s.name)}</div> : (
              <div key={s.id} className={cn('group flex items-center rounded-[10px] pr-1', s.id === activeId ? 'bg-cyan/10' : 'hover:bg-white/5')}>
                <button className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2.5 text-left" aria-current={s.id === activeId ? 'page' : undefined}
                  onClick={() => { select(s.id); if (s.locked) setUnlockForId(s.id); else onClose(); }}>
                  {s.locked ? <Lock size={22} className="shrink-0 text-pink" /> : <Folder size={22} className="shrink-0 fill-cyan text-cyan" />}
                  <span className="truncate">{s.name}</span>
                  {!s.locked && <span className="ml-auto text-xs text-mute">{s.fileCount}</span>}
                </button>
                <span className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  {s.lock && !s.locked && (
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Lock ${s.name} now`} onClick={() => void relock(s.id)}><LockOpen size={15} /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Lock settings for ${s.name}`} onClick={() => setLockForId(s.id)}><Lock size={15} /></Button>
                  {!s.locked && <Button variant="ghost" size="icon" className="size-8" aria-label={`Rename ${s.name}`} onClick={() => setEditing(s.id)}><Pencil size={15} /></Button>}
                  {!s.locked && data.sections.length > 1 && (
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}><Trash2 size={15} /></Button>
                  )}
                </span>
              </div>
            ),
          )}
          {editing === 'new' ? editor('') : (
            <button onClick={() => setEditing('new')}
              className="mt-1 flex items-center gap-2 rounded-[10px] border border-dashed border-edge px-3 py-2.5 text-left text-mute hover:border-cyan hover:text-ink">
              <Plus size={16} />New folder
            </button>
          )}
        </nav>

        <div className="mt-auto flex flex-col items-start gap-2 rounded-xl border border-line p-3.5 text-sm">
          <b>{lapsed ? 'Subscription ended' : free ? 'Free plan' : 'Subscription active'}</b>
          <span className="text-mute">
            {lapsed ? 'Read-only: view and export'
              : free ? (license.freeFilesLeft > 0 ? `${license.freeFilesLeft} free file left` : 'Free file used')
              : plan ? `$${plan.priceUsd} a ${plan.period}` : 'GhostDesk'}
          </span>
          {free && <Button size="sm" variant="primary" onClick={() => usePaywall.getState().show()}>Get GhostDesk</Button>}
          <Button size="sm" onClick={() => setSecurityOpen(true)}><ShieldCheck size={15} />Security</Button>
          {license.state === 'active' && <Button size="sm" variant="ghost" className="px-0" onClick={() => void manage()}><CreditCard size={15} />Manage subscription</Button>}
        </div>
      </aside>

      <SecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
      <FolderLockDialog section={byId(lockForId)} onOpenChange={(o) => !o && setLockForId(null)} />
      <UnlockFolderDialog section={byId(unlockForId)?.locked ? byId(unlockForId) : null} onOpenChange={(o) => !o && setUnlockForId(null)} />
      <AlertModal open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete “${toDelete?.name ?? ''}”?`}
        description={`This permanently deletes the folder and its ${toDelete?.fileCount ?? 0} encrypted file${toDelete?.fileCount === 1 ? '' : 's'}.`}>
        <AlertCancel asChild><Button>Cancel</Button></AlertCancel>
        <AlertAction asChild>
          <Button variant="danger" onClick={() => { const s = toDelete; setToDelete(null); if (s) void deleteSection(s.id).catch(fail); }}>Delete</Button>
        </AlertAction>
      </AlertModal>
    </>
  );
}
