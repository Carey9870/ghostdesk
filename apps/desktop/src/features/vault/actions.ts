// path: apps/desktop/src/features/vault/actions.ts
// purpose: File actions shared by the list and the viewer: export to disk, and import from the picker or drag-and-drop with the free-file allowance.
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { activity } from '@/lib/activity';
import { IpcError, api, type VaultFile } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { useVault } from '@/store/vault';
import { usePaywall } from '../license/paywall';

const message = (e: unknown) => (e instanceof IpcError ? e.message : 'Something went wrong. Try again.');

/** Asks where to save, then writes a decrypted copy. Counts as activity while it runs. */
export async function exportFile(file: VaultFile): Promise<void> {
  const dest = await save({ defaultPath: file.name, title: 'Export a decrypted copy' });
  if (!dest) return;
  const release = activity.hold();
  try { await api.exportFile(file.id, dest); toast.success(`Exported “${file.name}”`); }
  catch (e) { toast.error(message(e)); }
  finally { release(); }
}

/** True when adding files is not allowed right now; shows the right prompt. */
function blocked(): boolean {
  const { license } = useSession.getState();
  if (license.state === 'lapsed') { toast.error('Renew your subscription to add files.'); return true; }
  if (license.state === 'none' && license.freeFilesLeft === 0) { usePaywall.getState().show(); return true; }
  return false;
}

/** Import from a file picker and from files dropped on the window. Uploading counts as activity, so it never triggers auto-lock. */
export function useImport() {
  const importPaths = useCallback(async (paths: string[]) => {
    const { activeId, data, load, setProgress } = useVault.getState();
    if (!activeId || paths.length === 0) return;
    if (data.sections.find((s) => s.id === activeId)?.locked) { toast.error('Unlock this folder first.'); return; }
    if (blocked()) return;
    const release = activity.hold();
    try {
      const report = await api.importFiles(activeId, paths, setProgress);
      await load();
      api.status().then((s) => useSession.getState().setLicense(s.license)).catch(() => undefined);
      if (report.imported.length) toast.success(`${report.imported.length} file${report.imported.length > 1 ? 's' : ''} encrypted`);
      if (report.failed.some((f) => f.error.startsWith('Subscribe'))) usePaywall.getState().show();
      for (const f of report.failed.filter((x) => !x.error.startsWith('Subscribe'))) toast.error(`${f.path.split(/[\\/]/).pop() ?? f.path}: ${f.error}`);
    } catch (e) {
      if (e instanceof IpcError && e.code === 'license_required') usePaywall.getState().show();
      else toast.error(message(e));
    } finally { release(); setProgress(null); }
  }, []);

  const pick = useCallback(async () => {
    if (blocked()) return;
    const selected = await openDialog({ multiple: true, directory: false, title: 'Add files to GhostDesk' });
    if (!selected) return;
    await importPaths(Array.isArray(selected) ? selected : [selected]);
  }, [importPaths]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    getCurrentWebview()
      .onDragDropEvent((e) => { if (e.payload.type === 'drop') void importPaths(e.payload.paths); })
      .then((un) => (cancelled ? un() : (off = un)));
    return () => { cancelled = true; off?.(); };
  }, [importPaths]);

  return { pick };
}
