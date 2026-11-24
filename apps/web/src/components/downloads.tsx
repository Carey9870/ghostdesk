'use client';
// path: apps/web/src/components/downloads.tsx
// purpose: Download buttons for Windows, macOS and Linux. Highlights the visitor's own system and links the others.
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { track } from './Analytics';

type Os = 'windows' | 'macos' | 'linux';
const NAMES: Record<Os, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };
const ORDER: Os[] = ['windows', 'macos', 'linux'];

function detect(): Os | 'mobile' {
  const ua = navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  return 'linux';
}

export function DownloadButtons({ className }: { className?: string }) {
  const [os, setOs] = useState<Os | 'mobile' | null>(null);
  useEffect(() => setOs(detect()), []);
  const mine = os && os !== 'mobile' ? os : null;
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {os === 'mobile' && <p className="text-mute">GhostDesk runs on computers. Open this page on your laptop or desktop to download it.</p>}
      <a
        href={`/download/${mine ?? 'windows'}`}
        onClick={() => track('download_clicked', { os: mine ?? 'windows' })}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 font-semibold text-white hover:bg-ink/90"
      >
        <Download size={18} />Download for {NAMES[mine ?? 'windows']}
      </a>
      <p className="text-sm text-mute">
        Also available for{' '}
        {ORDER.filter((o) => o !== (mine ?? 'windows')).map((o, i) => (
          <span key={o}>{i > 0 && ' and '}<a href={`/download/${o}`} className="underline" onClick={() => track('download_clicked', { os: o })}>{NAMES[o]}</a></span>
        ))}
      </p>
    </div>
  );
}
