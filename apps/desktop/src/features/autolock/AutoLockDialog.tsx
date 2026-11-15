// path: apps/desktop/src/features/autolock/AutoLockDialog.tsx
// purpose: Alert dialog shown after inactivity: a live countdown with Cancel (stay unlocked) and Confirm (lock now). Locks when the countdown ends.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertAction, AlertCancel, AlertModal } from '@/components/ui/overlay';
import { useSession } from '@/store/session';
import { useAutoLock } from './autolock';

export function AutoLockDialog() {
  const { open, deadline, cancel } = useAutoLock();
  const lock = useSession((s) => s.lock);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) void lock();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open, deadline, lock]);

  return (
    <AlertModal
      open={open}
      onOpenChange={(o) => { if (!o) cancel(); }}
      title="Still there?"
      description={
        <>
          You've been inactive, so GhostDesk will lock in <strong className="text-ink tabular-nums">{left}s</strong>.
          Cancel keeps your vault open. Confirm locks it now.
        </>
      }
    >
      <AlertCancel asChild><Button onClick={cancel}>Cancel</Button></AlertCancel>
      <AlertAction asChild><Button variant="primary" onClick={() => void lock()}>Confirm</Button></AlertAction>
    </AlertModal>
  );
}
