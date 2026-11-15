// path: apps/desktop/src/features/vault/viewer/Viewer.tsx
// purpose: Full-screen encrypted viewer. Decrypts into memory only and previews images, video, audio, PDFs and text without writing to disk.
import { Download, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { activity } from '@/lib/activity';
import { IpcError, api, type VaultFile } from '@/lib/ipc';
import { useVault } from '@/store/vault';
import { exportFile } from '../actions';

const PdfView = lazy(() => import('./PdfView').then((m) => ({ default: m.PdfView })));
const TEXT_LIMIT = 2 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|csv|json|log|xml|yml|yaml|ini|rtf)$/i;

type Kind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none';
const kindOf = (f: VaultFile): Kind =>
  f.mime.startsWith('image/') ? 'image' : f.mime.startsWith('video/') ? 'video' : f.mime.startsWith('audio/') ? 'audio'
  : f.mime === 'application/pdf' ? 'pdf' : f.mime.startsWith('text/') || TEXT_EXT.test(f.name) ? 'text' : 'none';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; url?: string; text?: string; bytes?: ArrayBuffer };

export function Viewer() {
  const { viewingId, data, view } = useVault();
  const file = data.files.find((f) => f.id === viewingId);
  return file ? <Open key={file.id} file={file} onClose={() => view(null)} /> : null;
}

function Open({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const kind = kindOf(file);
  const [state, setState] = useState<State>({ status: 'loading' });
  const playing = useRef<(() => void) | null>(null);

  useEffect(() => {
    let dead = false;
    let url: string | undefined;
    const release = activity.hold(); // decrypting counts as activity
    api.readFile(file.id)
      .then((buf) => {
        if (dead) return;
        if (kind === 'image' || kind === 'video' || kind === 'audio') { url = URL.createObjectURL(new Blob([buf], { type: file.mime })); setState({ status: 'ready', url }); }
        else if (kind === 'pdf') setState({ status: 'ready', bytes: buf });
        else if (kind === 'text') setState({ status: 'ready', text: new TextDecoder().decode(buf.slice(0, TEXT_LIMIT)) });
        else setState({ status: 'ready' });
      })
      .catch((e) => !dead && setState({ status: 'error', message: e instanceof IpcError ? e.message : 'Couldn’t open this file.' }))
      .finally(release);
    return () => { dead = true; if (url) URL.revokeObjectURL(url); playing.current?.(); };
  }, [file.id, file.mime, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Playing media keeps the vault awake; pausing hands control back to the inactivity timer. */
  const mediaEvents = {
    onPlay: () => { playing.current ??= activity.hold(); },
    onPause: () => { playing.current?.(); playing.current = null; },
    onEnded: () => { playing.current?.(); playing.current = null; },
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Viewing ${file.name}`} className="fixed inset-0 z-40 flex flex-col bg-[#060a12f2] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <b className="min-w-0 flex-1 break-words">{file.name}</b>
        <Button onClick={() => void exportFile(file)}><Download size={17} />Export</Button>
        <Button onClick={onClose}><X size={17} />Close</Button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-4">
        {state.status === 'loading' && <p className="text-mute">Decrypting…</p>}
        {state.status === 'error' && <p role="alert" className="max-w-md text-center text-pink">{state.message}</p>}
        {state.status === 'ready' && (
          <>
            {kind === 'image' && <img src={state.url} alt={file.name} className="max-h-full max-w-full rounded-lg object-contain" />}
            {kind === 'video' && <video src={state.url} controls className="max-h-full max-w-full rounded-lg" {...mediaEvents} />}
            {kind === 'audio' && <audio src={state.url} controls {...mediaEvents} />}
            {kind === 'pdf' && state.bytes && <div className="h-full w-full self-start"><Suspense fallback={<p className="text-mute">Loading viewer…</p>}><PdfView data={state.bytes} /></Suspense></div>}
            {kind === 'text' && <pre className="w-full max-w-3xl self-start whitespace-pre-wrap break-words text-[#cfd8ea]">{state.text}</pre>}
            {kind === 'none' && <p className="max-w-md text-center leading-7 text-mute">There’s no preview for this type of file. Use Export to save a decrypted copy.</p>}
          </>
        )}
      </div>
    </div>
  );
}
