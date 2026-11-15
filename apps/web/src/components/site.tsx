'use client';
// path: apps/web/src/components/site.tsx
// purpose: Landing-page sections: navigation, hero with a live pattern demo, "tick what's true", features, steps, final call to action and footer.
import { useState } from 'react';
import { PatternPad, PATTERN_MIN } from '@ghostdesk/shared';
import { cn } from '@/lib/cn';
import { DownloadButtons } from './downloads';
import { usePricing } from './pricing';

const Ghost = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path d="M12 2C7.6 2 5 5.3 5 9.5V21l2.5-2 2.3 2 2.2-2 2.2 2 2.3-2 2.5 2V9.5C19 5.3 16.4 2 12 2z" fill="currentColor" />
    <circle cx="9.5" cy="10" r="1.4" fill="#fff" /><circle cx="14.5" cy="10" r="1.4" fill="#fff" />
  </svg>
);

const cta = 'inline-flex h-12 items-center rounded-full bg-ink px-7 font-semibold text-white hover:bg-ink/90';

export function Nav() {
  const { open } = usePricing();
  return (
    <nav className="flex items-center gap-6 py-5" aria-label="Main">
      <a href="/" className="mr-auto flex items-center gap-2 text-xl font-bold"><Ghost className="size-7 text-violet" />GhostDesk</a>
      <a href="#features" className="hidden text-mute sm:block">Features</a>
      <a href="#download" className="hidden text-mute sm:block">Download</a>
      <button onClick={open} className="text-mute">Pricing</button>
    </nav>
  );
}

export function Hero() {
  const { open } = usePricing();
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState('Connect at least six dots.');
  return (
    <section className="grid items-center gap-10 pb-24 pt-8 md:grid-cols-[1.15fr_.85fr]">
      <div>
        <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
          Your laptop has a private side.
          <span className="block text-violet">Nobody needs to know.</span>
        </h1>
        <p className="mb-7 mt-5 max-w-[34em] text-xl text-mute">
          GhostDesk is an encrypted vault on your own computer for documents, photos and videos. Unlock it with a pattern and a passphrase. Lock it and everything is sealed again.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={open} className={cta}>Get GhostDesk</button>
          <a href="#agree" className="inline-flex h-12 items-center rounded-full border border-ink/20 bg-white/60 px-7 font-semibold">Is this for me?</a>
        </div>
      </div>
      <div className="rounded-[30px] border border-white bg-white/70 p-6 text-center shadow-[0_30px_60px_-30px_rgba(108,77,240,.4)] backdrop-blur-xl">
        <b className="block text-lg">Try it now</b>
        <p className="text-mute">Draw any path across the grid.</p>
        <div className="my-5 flex justify-center">
          <PatternPad accent="#6c4df0" idle="#cfc7f5" size={280}
            onComplete={(s) => { if (s.length >= PATTERN_MIN) { setDone(true); setHint('That’s the first half. Add a passphrase and the vault is yours alone.'); } else setHint(`Connect at least ${PATTERN_MIN} dots.`); }} />
        </div>
        <p className="text-mute" aria-live="polite">{hint}</p>
        {done && <button onClick={open} className={cn(cta, 'mt-4')}>Get GhostDesk</button>}
      </div>
    </section>
  );
}

const STATEMENTS = [
  'My passport and ID scans are sitting in Downloads.',
  'Other people borrow my laptop now and then.',
  'My bank statements live next to my holiday photos.',
  'I’d hate for anyone to open my files while I’m making coffee.',
];

export function Agree() {
  const { open } = usePricing();
  const [ticked, setTicked] = useState<boolean[]>(STATEMENTS.map(() => false));
  const n = ticked.filter(Boolean).length;
  return (
    <section id="agree" className="pb-20">
      <h2 className="mb-6 max-w-[16em] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.1] tracking-tight">Be honest. Where are your most important files right now?</h2>
      <p className="mb-4 text-xl text-mute">Tick whatever sounds like you.</p>
      <div className="max-w-2xl">
        {STATEMENTS.map((s, i) => (
          <label key={s} className="flex cursor-pointer items-center gap-3.5 border-t border-ink/15 py-4 text-lg">
            <input type="checkbox" className="size-5 shrink-0 accent-violet" checked={ticked[i]} onChange={(e) => setTicked(ticked.map((t, j) => (j === i ? e.target.checked : t)))} />
            {s}
          </label>
        ))}
      </div>
      {n > 0 && (
        <div className="pt-6" aria-live="polite">
          <p className="mb-4 max-w-[28em] text-2xl font-medium">
            {n === 1 ? 'One is enough. GhostDesk fixes it in under a minute.' : `That’s ${n}. GhostDesk fixes every one of them in under a minute.`}
          </p>
          <button onClick={open} className={cta}>Get GhostDesk</button>
        </div>
      )}
    </section>
  );
}

const FEATURES = [
  ['Pattern plus passphrase', 'Opening your vault takes a pattern you draw and a passphrase only you know. A glance over your shoulder isn’t enough.'],
  ['Folders you name and lock', 'Taxes, Family, Work, Medical. Make as many folders as you like. Give any folder its own pattern, password or both, or leave it open.'],
  ['Encrypted on your device', 'Files are encrypted before they’re saved. They never leave your computer.'],
  ['Locks when you step away', 'After a period of inactivity GhostDesk asks if you’re still there, then locks. One key combination seals everything instantly.'],
  ['A decoy vault', 'Set a second pattern and passphrase that opens a different vault. If anyone makes you unlock GhostDesk, they see only what you chose to put there.'],
  ['Encrypted backups', 'Export your vault as one encrypted file and keep it on a USB drive or any cloud folder. Restore it on any computer with its passphrase.'],
  ['No account', 'No email or sign-up to use the app. A license key unlocks your subscription.'],
  ['A recovery key you control', 'Forget your passphrase and your recovery key gets you back in. If it ever leaks, renew it and the old one stops working.'],
] as const;

export function Features() {
  return (
    <section id="features" className="pb-24">
      <h2 className="mb-7 max-w-[16em] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.1] tracking-tight">Everything stays on your side of the screen.</h2>
      <div className="grid gap-x-12 md:grid-cols-2">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="border-t border-ink/15 pb-7 pt-5">
            <h3 className="mb-1.5 text-xl font-semibold">{title}</h3>
            <p className="max-w-[30em] text-mute">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Steps() {
  const steps = [
    ['Draw a pattern, add a passphrase.', 'Both are needed to open it.'],
    ['Drag your files in.', 'They’re encrypted on your computer.'],
    ['Lock it.', 'Everything is sealed again.'],
  ];
  return (
    <section className="pb-20">
      <h2 className="mb-7 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-tight">Set up in a minute.</h2>
      <ol className="grid gap-7 md:grid-cols-3">
        {steps.map(([a, b], i) => (
          <li key={a} className="border-t-2 border-violet pt-3.5 text-mute">
            <span className="block text-2xl font-bold text-violet">{i + 1}</span>
            <b className="text-ink">{a}</b> {b}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DownloadSection() {
  return (
    <section id="download" className="pb-24 text-center">
      <h2 className="mx-auto mb-3 max-w-[14em] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-tight">Download GhostDesk</h2>
      <p className="mx-auto mb-7 max-w-[30em] text-lg text-mute">Install it on Windows, macOS or Linux. Add your first file free; a license key unlocks unlimited files.</p>
      <DownloadButtons />
    </section>
  );
}

export function FinalCta() {
  const { open } = usePricing();
  return (
    <section className="pb-24 pt-6 text-center">
      <h2 className="mx-auto mb-6 max-w-[14em] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-tight">Your files are either private or they aren’t.</h2>
      <button onClick={open} className={cta}>Get GhostDesk</button>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/15 py-6 text-sm text-mute">
      <span className="mr-auto">© {new Date().getFullYear()} GhostDesk</span>
      <a href="/privacy" className="hover:text-ink">Privacy Policy</a>
      <a href="/terms" className="hover:text-ink">Terms of Service</a>
    </footer>
  );
}
