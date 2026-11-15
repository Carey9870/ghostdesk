// path: apps/desktop/src/features/vault/viewer/PdfView.tsx
// purpose: Renders a decrypted PDF page by page with pdf.js, entirely in memory (works on every platform webview).
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfView({ data }: { data: ArrayBuffer }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
    (async () => {
      const pdf = await task.promise;
      const el = host.current;
      if (!el) return;
      el.replaceChildren();
      const width = Math.min(el.clientWidth || 800, 1000);
      const dpr = window.devicePixelRatio || 1;
      for (let n = 1; n <= pdf.numPages && !cancelled; n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: (width / base.width) * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = `${vp.width / dpr}px`;
        canvas.style.height = `${vp.height / dpr}px`;
        canvas.className = 'mx-auto mb-4 rounded bg-white shadow-lg';
        el.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      }
    })().catch(() => { if (!cancelled) setError('This PDF couldn’t be displayed. Export it to open it in another app.'); });
    return () => { cancelled = true; void task.destroy(); };
  }, [data]);

  return (
    <>
      <div ref={host} className="w-full" />
      {error && <p role="alert" className="text-center text-mute">{error}</p>}
    </>
  );
}
