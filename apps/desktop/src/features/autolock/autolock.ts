// path: apps/desktop/src/features/autolock/autolock.ts
// purpose: Inactivity auto-lock logic. Nothing is shown while the user is active; after the idle time a confirmation dialog starts a short countdown.
import { useEffect } from 'react';
import { create } from 'zustand';
import { activity } from '@/lib/activity';

export const AUTOLOCK_DIALOG_SECONDS = 30;

interface AutoLockState {
  open: boolean;
  deadline: number;
  show: () => void;
  /** Cancel: keeps the vault unlocked and restarts the inactivity clock. */
  cancel: () => void;
  close: () => void;
}

export const useAutoLock = create<AutoLockState>((set) => ({
  open: false,
  deadline: 0,
  show: () => set({ open: true, deadline: Date.now() + AUTOLOCK_DIALOG_SECONDS * 1000 }),
  cancel: () => { activity.touch(); set({ open: false }); },
  close: () => set({ open: false }),
}));

/** Opens the dialog once the user has been idle for `minutes`. Uploads, exports and video playback hold the clock (see activity.ts). */
export function useInactivityWatcher(minutes: number, enabled: boolean): void {
  const open = useAutoLock((s) => s.open);
  const show = useAutoLock((s) => s.show);
  useEffect(() => {
    if (!enabled || open) return;
    const check = () => { if (activity.idleMs() >= minutes * 60_000) show(); };
    const id = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', check); };
  }, [enabled, open, minutes, show]);
}
