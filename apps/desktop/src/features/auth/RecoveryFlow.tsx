// path: apps/desktop/src/features/auth/RecoveryFlow.tsx
// purpose: Recovery with the recovery key: verify it, set a new pattern and passphrase, receive a new recovery key (the old one stops working).
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PATTERN_MIN } from '@ghostdesk/shared';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { IpcError, api } from '@/lib/ipc';
import { useSession } from '@/store/session';
import { AuthShell, ErrorLine, Heading, PassphraseSetupForm, PatternStep, RecoveryKeyReveal } from './steps';

type Step = 'key' | 'pattern' | 'confirm' | 'passphrase' | 'reveal';
const keySchema = z.object({ key: z.string().refine((v) => v.replace(/[^A-Za-z0-9]/g, '').length === 20, 'A recovery key has 20 letters and numbers.') });

export function RecoveryFlow({ onCancel }: { onCancel: () => void }) {
  const unlocked = useSession((s) => s.unlocked);
  const [step, setStep] = useState<Step>('key');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [pattern, setPattern] = useState<number[]>([]);
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, setError: setFormError, formState: { errors, isSubmitting } } = useForm<{ key: string }>({ resolver: zodResolver(keySchema), defaultValues: { key: '' } });

  if (step === 'key') {
    return (
      <AuthShell>
        <Heading title="Use your recovery key" hint="Enter the key you saved when you created this vault." />
        <form noValidate className="mt-5 space-y-4" onSubmit={handleSubmit(async (v) => {
          try { await api.checkRecoveryKey(v.key); setRecoveryKey(v.key); setStep('pattern'); }
          catch (e) { setFormError('key', { message: e instanceof IpcError ? e.message : 'Couldn’t check the key.' }); }
        })}>
          <PasswordField label="Recovery key" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoFocus error={errors.key?.message} {...register('key')} />
          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Checking…' : 'Continue'}</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Back</Button>
        </form>
      </AuthShell>
    );
  }
  if (step === 'pattern') {
    return <PatternStep title="Choose a new pattern" hint={`Connect at least ${PATTERN_MIN} dots`} error={error}
      onComplete={(p) => { if (p.length < PATTERN_MIN) return setError(`Connect at least ${PATTERN_MIN} dots.`); setError(''); setPattern(p); setStep('confirm'); }} />;
  }
  if (step === 'confirm') {
    return <PatternStep title="Draw it again" hint="Confirm your new pattern" error={error}
      onComplete={(p) => { if (p.join() !== pattern.join()) { setError('The patterns didn’t match. Start again.'); setStep('pattern'); return; } setError(''); setStep('passphrase'); }} />;
  }
  if (step === 'passphrase') {
    return (
      <AuthShell>
        <Heading title="Choose a new passphrase" />
        <PassphraseSetupForm submitLabel="Save and open my vault" onSubmit={async (passphrase) => { setNewKey(await api.recover(recoveryKey, passphrase, pattern)); setStep('reveal'); }} />
        <ErrorLine>{error}</ErrorLine>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <RecoveryKeyReveal recoveryKey={newKey} onDone={() => void unlocked()} />
      <p className="mt-3 text-xs text-mute">Your old recovery key no longer works.</p>
    </AuthShell>
  );
}
