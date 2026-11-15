// path: apps/desktop/src/features/vault/Footer.tsx
// purpose: Sticky footer with the encryption note and a highly visible Panic lock control.
import { Lock, TriangleAlert } from 'lucide-react';
import { useSession } from '@/store/session';

export function Footer() {
  const lock = useSession((s) => s.lock);
  return (
    <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-line bg-bg/90 px-4 py-3 text-sm text-mute backdrop-blur">
      <span className="inline-flex items-center gap-2"><Lock size={15} />Encrypted on this device</span>
      <button
        onClick={() => void lock()}
        className="inline-flex items-center gap-2 rounded-full bg-pink px-4 py-2.5 text-base font-bold text-white shadow-[0_0_0_4px_rgba(240,36,95,.2),0_0_26px_rgba(240,36,95,.45)] hover:brightness-110"
      >
        <TriangleAlert size={18} />Panic lock: Ctrl+Shift+L
      </button>
    </footer>
  );
}
