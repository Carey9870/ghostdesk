// path: apps/desktop/src/features/license/LicenseKeyForm.tsx
// purpose: Form that activates a license key with the license server and reports the resulting license state.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LICENSE_KEY_PATTERN } from '@ghostdesk/shared';
import { Button } from '@/components/ui/button';
import { IpcError, api, type LicenseInfo } from '@/lib/ipc';

const schema = z.object({ key: z.string().transform((v) => v.trim().toUpperCase()).refine((v) => LICENSE_KEY_PATTERN.test(v), 'Enter the key from your email. It looks like GD-XXXX-XXXX-XXXX-XXXX.') });

export function LicenseKeyForm({ onActivated }: { onActivated: (license: LicenseInfo) => void }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<{ key: string }>({ resolver: zodResolver(schema), defaultValues: { key: '' } });
  return (
    <form noValidate className="space-y-3 text-left" onSubmit={handleSubmit(async ({ key }) => {
      try { onActivated(await api.activateLicense(key)); }
      catch (e) { setError('key', { message: e instanceof IpcError ? e.message : 'Couldn’t activate the key.' }); }
    })}>
      <label htmlFor="license-key" className="block text-sm text-mute">License key</label>
      <input id="license-key" placeholder="GD-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} aria-invalid={!!errors.key}
        className="h-11 w-full rounded-[10px] border border-edge bg-field px-3 font-mono uppercase text-ink outline-none focus:border-cyan" {...register('key')} />
      {errors.key && <p role="alert" className="text-sm text-pink">{errors.key.message}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Checking…' : 'Activate'}</Button>
    </form>
  );
}
