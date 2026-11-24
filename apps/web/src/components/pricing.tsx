'use client';
// path: apps/web/src/components/pricing.tsx
// purpose: Pricing dialog (opened from any button or the #pricing hash) with plan choice and Paystack popup checkout. Prices appear only here.
import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PLAN_IDS, PLANS, type PlanId } from '@ghostdesk/shared';
import { cn } from '@/lib/cn';
import { track } from './Analytics';

const Ctx = createContext<{ open: () => void }>({ open: () => undefined });
export const usePricing = () => useContext(Ctx);

const INCLUDED = [
  'Unlimited files in unlimited folders',
  'A lock on any folder: pattern, password or both',
  'Pattern plus passphrase unlock',
  'A decoy vault with its own pattern and passphrase',
  'Encrypted backups you can keep anywhere',
  'Encrypted viewer for photos, videos, PDFs and text',
  'Auto-lock on inactivity and a one-key panic lock',
  'Use on up to 3 of your devices',
];

interface PaystackPopInstance { resumeTransaction: (code: string, cb: { onSuccess?: (tx: { reference?: string }) => void; onCancel?: () => void; onError?: (e: unknown) => void }) => void }
declare global { interface Window { PaystackPop?: new () => PaystackPopInstance } }

function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Paystack failed to load'));
    document.head.appendChild(s);
  });
}

export function PricingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const change = useCallback((o: boolean) => {
    setOpen(o);
    if (!o && location.hash === '#pricing') history.replaceState(null, '', location.pathname + location.search);
  }, []);
  useEffect(() => {
    const sync = () => { if (location.hash === '#pricing') setOpen(true); };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return <Ctx.Provider value={value}>{children}<PricingDialog open={open} onOpenChange={change} /></Ctx.Provider>;
}

const emailSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

function PricingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [plan, setPlan] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) track('pricing_opened'); }, [open]);
  const [paying, setPaying] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ email: string }>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  const perDay = Math.round(PLANS[plan].cents / PLANS[plan].days);
  const saving = Math.round((1 - PLANS.yearly.cents / (PLANS.weekly.cents * 52)) * 10) * 10;

  const pay = handleSubmit(async ({ email }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, plan }) });
      const data = (await res.json()) as { accessCode?: string; reference?: string; error?: string };
      if (!res.ok || !data.accessCode) throw new Error(data.error ?? 'We couldn’t start checkout.');
      track('checkout_started', { plan });
      await loadPaystack();
      setPaying(true); // hide our dialog: while open it blocks clicks inside Paystack's popup
      new window.PaystackPop!().resumeTransaction(data.accessCode, {
        onSuccess: (tx) => { window.location.href = `/welcome?reference=${encodeURIComponent(tx.reference ?? data.reference ?? '')}`; },
        onCancel: () => { setPaying(false); setBusy(false); },
        onError: () => { setPaying(false); setBusy(false); setError('email', { message: 'The payment couldn’t be completed. Try again.' }); },
      });
    } catch (e) {
      setPaying(false);
      setBusy(false);
      setError('email', { message: e instanceof Error ? e.message : 'Something went wrong. Try again.' });
    }
  });

  return (
    <Dialog.Root open={open && !paying} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(440px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 text-ink shadow-2xl">
          <Dialog.Title className="text-2xl font-semibold tracking-tight">Get GhostDesk</Dialog.Title>
          <Dialog.Description className="mt-1 text-mute">Pick a plan. Your license key arrives by email.</Dialog.Description>
          <Dialog.Close className="absolute right-4 top-4 rounded-full p-1.5 text-mute hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>

          <div role="radiogroup" aria-label="Plan" className="mt-5 grid grid-cols-2 gap-3">
            {PLAN_IDS.map((id) => (
              <button key={id} role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}
                className={cn('relative rounded-2xl border px-3 pb-4 pt-5 text-center', plan === id ? 'border-violet ring-2 ring-violet/25' : 'border-ink/15')}>
                {id === 'yearly' && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-violet px-2.5 py-0.5 text-xs text-white">Best value</span>}
                <b className="block text-3xl">${PLANS[id].priceUsd}</b>
                <span className="text-sm text-mute">per {PLANS[id].period}</span>
              </button>
            ))}
          </div>

          <ul className="mt-5 grid gap-2 text-[15px]">
            {INCLUDED.map((t) => <li key={t} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-violet" />{t}</li>)}
          </ul>
          <p className="mt-4 text-sm text-mute">
            That’s about {perDay} cents a day to keep your passport, deeds and statements out of anyone else’s reach.
            {plan === 'yearly' && ` Roughly ${saving}% less than paying weekly.`} Cancel anytime.
          </p>

          <form onSubmit={pay} noValidate className="mt-5">
            <label htmlFor="email" className="text-sm text-mute">Email for your receipt and license key</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email}
              className="mt-1.5 h-12 w-full rounded-xl border border-ink/20 px-3 outline-none focus:border-violet" {...register('email')} />
            {errors.email && <p role="alert" className="mt-1.5 text-sm text-[#c0264f]">{errors.email.message}</p>}
            <button type="submit" disabled={busy} className="mt-4 h-12 w-full rounded-full bg-ink font-semibold text-white disabled:opacity-60">
              {busy ? 'Opening checkout…' : `Pay $${PLANS[plan].priceUsd} with Paystack`}
            </button>
            <p className="mt-3 text-center text-xs text-mute">
              By paying you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
