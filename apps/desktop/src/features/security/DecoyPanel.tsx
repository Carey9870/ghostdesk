// path: apps/desktop/src/features/security/DecoyPanel.tsx
// purpose: Sets up or removes the decoy vault: a second vault that opens with its own pattern and passphrase and shows only what you put in it.
import { useState } from 'react';
import { toast } from 'sonner';
import { PATTERN_MIN, PatternPad } from '@ghostdesk/shared';
import { Button } from '@/components/ui/button';
import { IpcError, api } from '@/lib/ipc';
import { useVault } from '@/store/vault';
import { ErrorLine, Heading, PassphraseSetupForm } from '../auth/steps';
import { Reauth } from './Reauth';

type Step = 'home' | 'auth' | 'pattern' | 'confirm' | 'passphrase' | 'done' | 'remove';

function Pad({ title, hint, error, onComplete }: { title: string; hint: string; error: string; onComplete: (p: number[]) => void }) {
  return (
    <div className="text-center">
      <Heading title={title} hint={hint} />
      <div className="my-5 flex justify-center"><PatternPad size={240} onComplete={onComplete} /></div>
      <ErrorLine>{error}</ErrorLine>
    </div>
  );
}

export function DecoyPanel() {
  const hasDecoy = useVault((s) => s.data.hasDecoy);
  const [step, setStep] = useState<Step>('home');
  const [main, setMain] = useState<{ passphrase: string; pattern: number[] } | null>(null);
  const [decoyPattern, setDecoyPattern] = useState<number[]>([]);
  const [error, setError] = useState('');
  const reset = () => { setStep('home'); setMain(null); setDecoyPattern([]); setError(''); };

  if (step === 'auth') {
    return <Reauth description="Confirm it’s you. Draw your main pattern." submitLabel="Continue"
      onSubmit={async (passphrase, pattern) => { await api.verifyCredentials(passphrase, pattern); setMain({ passphrase, pattern }); setStep('pattern'); }} />;
  }
  if (step === 'pattern') {
    return <Pad title="Decoy pattern" hint="Pick a pattern different from your main one." error={error}
      onComplete={(p) => { if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`); setError(''); setDecoyPattern(p); setStep('confirm'); }} />;
  }
  if (step === 'confirm') {
    return <Pad title="Draw it again" hint="Confirm the decoy pattern" error={error}
      onComplete={(p) => { if (p.join() !== decoyPattern.join()) { setError('The patterns didn’t match. Start again.'); setStep('pattern'); return; } setError(''); setStep('passphrase'); }} />;
  }
  if (step === 'passphrase' && main) {
    return (
      <div>
        <Heading title="Decoy passphrase" hint="It must differ from your main passphrase." />
        <PassphraseSetupForm submitLabel="Create decoy vault" onSubmit={async (decoyPassphrase) => {
          try { useVault.setState({ data: await api.createDecoy(main.passphrase, main.pattern, decoyPassphrase, decoyPattern) }); setStep('done'); }
          catch (e) { throw new Error(e instanceof IpcError ? e.message : 'Couldn’t create the decoy vault.'); }
        }} />
        <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>Cancel</Button>
      </div>
    );
  }
  if (step === 'done') {
    return (
      <div className="space-y-4 text-center">
        <Heading title="Decoy vault ready" />
        <p className="text-sm text-mute">Lock GhostDesk, then unlock with the decoy pattern and passphrase. Add files that look believable, such as ordinary documents and photos. Nothing in that vault points to your main one.</p>
        <Button variant="primary" className="w-full" onClick={reset}>Done</Button>
      </div>
    );
  }
  if (step === 'remove') {
    return <Reauth description="Confirm it’s you. Draw your main pattern." submitLabel="Remove decoy vault"
      onSubmit={async (passphrase, pattern) => { useVault.setState({ data: await api.removeDecoy(passphrase, pattern) }); toast.success('Decoy vault removed'); reset(); }} />;
  }

  return (
    <div className="space-y-4 text-sm text-mute">
      <p>A decoy vault is a second vault with its own pattern and passphrase. If someone makes you unlock GhostDesk, give them the decoy details and they see only what you chose to put there.</p>
      <p>On disk, a decoy can’t be told apart from an empty slot, and unlocking takes the same time for either vault. The decoy can’t see or change your main vault.</p>
      {hasDecoy ? (
        <>
          <p className="text-ink">Your decoy vault is set up.</p>
          <Button variant="danger" className="w-full" onClick={() => setStep('remove')}>Remove decoy vault</Button>
        </>
      ) : (
        <Button variant="primary" className="w-full" onClick={() => setStep('auth')}>Set up a decoy vault</Button>
      )}
    </div>
  );
}
