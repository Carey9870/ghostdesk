// path: apps/desktop/src/features/auth/steps.tsx
// purpose: Reusable building blocks for the authentication flows: shell, pattern step, passphrase forms and the recovery-key reveal.
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PASSPHRASE_RULES, PatternPad, PATTERN_MIN, checkPassphrase, isPassphraseValid } from '@ghostdesk/shared';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function GhostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('mx-auto size-12 text-cyan', className)}>
      <path d="M12 2C7.6 2 5 5.3 5 9.5V21l2.5-2 2.3 2 2.2-2 2.2 2 2.3-2 2.5 2V9.5C19 5.3 16.4 2 12 2z" fill="currentColor" />
      <circle cx="9.5" cy="10" r="1.4" fill="#070b14" />
      <circle cx="14.5" cy="10" r="1.4" fill="#070b14" />
    </svg>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-5">
      <div className="w-full max-w-85 text-center">
        <GhostMark />
        {children}
      </div>
    </main>
  );
}

export function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      {hint && <p className="mt-1.5 text-mute">{hint}</p>}
    </>
  );
}

export function ErrorLine({ children }: { children?: ReactNode }) {
  return children ? <p role="alert" className="mt-2 text-sm text-pink">{children}</p> : null;
}

export function PatternStep({ title, hint, error, onComplete, busy }: {
  title: string; hint: string; error?: string; busy?: boolean; onComplete: (pattern: number[]) => void;
}) {
  return (
    <AuthShell>
      <Heading title={title} hint={hint} />
      <div className="my-6 flex justify-center">
        <PatternPad
          disabled={busy}
          onComplete={(s) => (s.length < PATTERN_MIN ? onComplete([]) : onComplete(s))}
        />
      </div>
      <ErrorLine>{error}</ErrorLine>
    </AuthShell>
  );
}

export function PassphraseRules({ value }: { value: string }) {
  const result = checkPassphrase(value);
  return (
    <ul className="grid gap-1.5 text-left text-sm" aria-label="Passphrase rules">
      {PASSPHRASE_RULES.map((r) => (
        <li key={r.id} className={cn('flex items-center gap-2', result[r.id] ? 'text-[#5eead4]' : 'text-mute')}>
          {result[r.id] ? <Check size={14} /> : <Circle size={14} />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

const setupSchema = z
  .object({
    passphrase: z.string().refine(isPassphraseValid, { message: 'Meet every rule above.' }),
    confirm: z.string().min(1, 'Confirm your passphrase.'),
  })
  .refine((v) => v.passphrase === v.confirm, { path: ['confirm'], message: 'The passphrases don’t match.' });
type SetupValues = z.infer<typeof setupSchema>;

/** New passphrase with live rules, a confirm field and a shared eye toggle. */
export function PassphraseSetupForm({ onSubmit, submitLabel = 'Continue', label = 'Passphrase' }: { onSubmit: (passphrase: string) => Promise<void>; submitLabel?: string; label?: string }) {
  const [visible, setVisible] = useState(false);
  const { register, handleSubmit, watch, setError, formState: { errors, isValid, isSubmitting } } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema), mode: 'onChange', defaultValues: { passphrase: '', confirm: '' },
  });
  const submit = handleSubmit(async (v) => {
    try { await onSubmit(v.passphrase); } catch (e) { setError('root', { message: e instanceof Error ? e.message : 'Something went wrong.' }); }
  });
  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      <PassphraseRules value={watch('passphrase')} />
      <PasswordField label={label} autoComplete="new-password" visible={visible} onVisibleChange={setVisible} {...register('passphrase')} />
      <PasswordField label={`Confirm ${label.toLowerCase()}`} autoComplete="new-password" visible={visible} onVisibleChange={setVisible} error={errors.confirm?.message} {...register('confirm')} />
      <ErrorLine>{errors.root?.message}</ErrorLine>
      <Button type="submit" variant="primary" className="w-full" disabled={!isValid || isSubmitting}>
        {isSubmitting ? 'Securing your vault…' : submitLabel}
      </Button>
    </form>
  );
}

const entrySchema = z.object({ passphrase: z.string().min(1, 'Enter your passphrase.') });

export function PassphraseEntryForm({ onSubmit, submitLabel = 'Unlock', error, label = 'Passphrase' }: { onSubmit: (passphrase: string) => Promise<void>; submitLabel?: string; error?: string; label?: string }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ passphrase: string }>({ resolver: zodResolver(entrySchema), defaultValues: { passphrase: '' } });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.passphrase))} noValidate className="mt-5 space-y-4">
      <PasswordField label={label} autoComplete="current-password" autoFocus error={error} {...register('passphrase')} />
      <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Unlocking…' : submitLabel}
      </Button>
    </form>
  );
}

/** Shows a freshly issued recovery key once and requires the user to confirm they saved it. */
export function RecoveryKeyReveal({ recoveryKey, onDone, doneLabel = 'Open my vault' }: { recoveryKey: string; onDone: () => void; doneLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(recoveryKey); toast.success('Recovery key copied'); }
    catch { toast.error('Couldn’t copy. Write the key down instead.'); }
  };
  return (
    <div className="text-center">
      <Heading title="Save your recovery key" />
      <p className="mt-2 text-sm text-mute">
        If you forget your pattern or passphrase, this key is the only way back in. We can’t reset it for you.
      </p>
      <p className="my-5 select-all rounded-xl border border-edge bg-field px-3 py-4 font-mono text-[17px] font-bold tracking-wider">{recoveryKey}</p>
      <p className="mb-4 text-sm text-pink">Never show it to anyone. Whoever has it can open your vault. If it ever leaks, renew it from inside the vault.</p>
      <Button variant="default" className="mb-4 w-full" onClick={() => void copy()}><Copy size={16} />Copy key</Button>
      <label className="mb-4 flex items-center justify-center gap-2.5 text-sm">
        <input type="checkbox" className="size-4 accent-cyan" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I’ve saved it somewhere safe
      </label>
      <Button variant="primary" className="w-full" disabled={!saved} onClick={onDone}>{doneLabel}</Button>
    </div>
  );
}
