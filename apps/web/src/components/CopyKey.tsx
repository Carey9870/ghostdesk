'use client';
// path: apps/web/src/components/CopyKey.tsx
// purpose: Displays the license key with a copy-to-clipboard button.
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white/70 px-4 py-4">
      <code className="select-all break-all font-mono text-lg font-bold tracking-wider">{value}</code>
      <button
        aria-label="Copy license key"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white"
        onClick={async () => { await navigator.clipboard.writeText(value).catch(() => undefined); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
