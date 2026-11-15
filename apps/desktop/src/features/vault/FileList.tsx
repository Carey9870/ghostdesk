// path: apps/desktop/src/features/vault/FileList.tsx
// purpose: File rows for the active section: open in the viewer, export, delete, with an empty state that invites the first upload.
import { Download, Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertAction, AlertCancel, AlertModal } from '@/components/ui/overlay';
import { IpcError, type VaultFile } from '@/lib/ipc';
import { formatBytes, formatDate } from '@/lib/utils';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';
import { UnlockFolderDialog } from '../folders/UnlockFolderDialog';
import { exportFile } from './actions';

export function FileList({ onAdd }: { onAdd: () => void }) {
  const { data, activeId, view, deleteFile } = useVault();
  const canAdd = useSession((s) => s.license.state !== 'lapsed');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const section = data.sections.find((s) => s.id === activeId);
  const [toDelete, setToDelete] = useState<VaultFile | null>(null);
  const files = data.files.filter((f) => f.sectionId === activeId);

  if (section?.locked) {
    return (
      <div className="flex-1 px-7 py-20 text-center leading-8 text-mute">
        <Lock size={40} className="mx-auto mb-3 text-pink" />
        <b className="text-ink">This folder is locked.</b><br />
        Unlock it with its own pattern or password to see what’s inside.
        <div className="mt-5"><Button variant="primary" onClick={() => setUnlockOpen(true)}>Unlock folder</Button></div>
        <UnlockFolderDialog section={unlockOpen ? section : null} onOpenChange={(o) => setUnlockOpen(o)} />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 px-7 py-20 text-center leading-8 text-mute">
        <b className="text-ink">Nothing in here yet.</b><br />
        Start with the file you’d least want a stranger to see.<br />
        Drop it here or choose Add files. It’s encrypted as it enters.
        {canAdd && <div className="mt-5"><Button variant="primary" onClick={onAdd}>Add files</Button></div>}
      </div>
    );
  }

  return (
    <ul className="flex-1">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-4 border-b border-line px-4 py-5 sm:px-7">
          <button onClick={() => view(f.id)} className="min-w-0 flex-1 wrap-break-word text-left text-lg hover:text-cyan">{f.name}</button>
          <span className="hidden text-mute md:block">{formatBytes(f.size)}</span>
          <span className="hidden min-w-32 text-[15px] leading-tight text-mute sm:block">Modified<br />{formatDate(f.addedAt)}</span>
          <span title="Encrypted" className="grid h-11 w-13.5 shrink-0 place-items-center rounded-[10px] bg-pink"><Lock size={22} color="#fff" aria-label="Encrypted" /></span>
          <Button variant="ghost" size="icon" aria-label={`Export ${f.name}`} onClick={() => void exportFile(f)}><Download size={18} /></Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${f.name}`} onClick={() => setToDelete(f)}><Trash2 size={18} /></Button>
        </li>
      ))}
      <AlertModal open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete “${toDelete?.name ?? ''}”?`} description="The encrypted file is permanently deleted from this device.">
        <AlertCancel asChild><Button>Cancel</Button></AlertCancel>
        <AlertAction asChild>
          <Button variant="danger" onClick={() => { const f = toDelete; setToDelete(null); if (f) void deleteFile(f.id).catch((e) => toast.error(e instanceof IpcError ? e.message : 'Couldn’t delete the file.')); }}>Delete</Button>
        </AlertAction>
      </AlertModal>
    </ul>
  );
}
