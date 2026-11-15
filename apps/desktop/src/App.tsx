// path: apps/desktop/src/App.tsx
// purpose: Root component: boots the session, listens for the Rust-side panic lock and renders the screen for the current phase.
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/store/session';
import { AuthShell, Heading } from '@/features/auth/steps';
import { SetupFlow } from '@/features/auth/SetupFlow';
import { UnlockFlow } from '@/features/auth/UnlockFlow';
import { VaultScreen } from '@/features/vault/VaultScreen';

export default function App() {
  const phase = useSession((s) => s.phase);
  const init = useSession((s) => s.init);
  const [fatal, setFatal] = useState('');

  useEffect(() => {
    init().catch(() => setFatal('GhostDesk couldn’t start. Close it and open it again.'));
    const off = listen('vault://locked', () => void useSession.getState().lock(true));
    return () => { void off.then((un) => un()); };
  }, [init]);

  return (
    <>
      {fatal && (
        <AuthShell>
          <Heading title="Something went wrong" hint={fatal} />
          <Button className="mt-5" onClick={() => location.reload()}>Try again</Button>
        </AuthShell>
      )}
      {!fatal && phase === 'loading' && <div className="grid min-h-dvh place-items-center text-mute">Loading…</div>}
      {!fatal && phase === 'setup' && <SetupFlow />}
      {!fatal && phase === 'locked' && <UnlockFlow />}
      {!fatal && phase === 'unlocked' && <VaultScreen />}
      <Toaster theme="dark" position="bottom-center" richColors closeButton />
    </>
  );
}
