// path: apps/desktop/src/components/PasswordField.tsx
// purpose: Text input with a show/hide (eye) toggle, compatible with react-hook-form's register().
import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  /** Lets a parent keep two fields (passphrase + confirm) in the same visible/hidden state. */
  visible?: boolean;
  onVisibleChange?: (v: boolean) => void;
}

export const PasswordField = forwardRef<HTMLInputElement, Props>(({ label, error, visible, onVisibleChange, className, ...rest }, ref) => {
  const [own, setOwn] = useState(false);
  const shown = visible ?? own;
  const id = useId();
  const toggle = () => (onVisibleChange ? onVisibleChange(!shown) : setOwn(!shown));
  return (
    <div className="text-left">
      <label htmlFor={id} className="mb-1.5 block text-sm text-mute">{label}</label>
      <div className="relative">
        <input
          id={id} ref={ref} type={shown ? 'text' : 'password'} autoComplete="off" spellCheck={false}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className={cn('h-11 w-full rounded-[10px] border border-edge bg-field pl-3 pr-11 text-ink outline-none focus:border-cyan', error && 'border-pink', className)}
          {...rest}
        />
        <button
          type="button" onClick={toggle} aria-label={shown ? 'Hide passphrase' : 'Show passphrase'} aria-pressed={shown}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-mute hover:text-ink"
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-pink">{error}</p>}
    </div>
  );
});
PasswordField.displayName = 'PasswordField';
