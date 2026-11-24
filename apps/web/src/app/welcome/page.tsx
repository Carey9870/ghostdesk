// path: apps/web/src/app/welcome/page.tsx
// purpose: Page shown after checkout. Verifies the payment with Paystack and reveals the license key (also emailed).
import type { Metadata } from 'next';
import { CopyKey } from '@/components/CopyKey';
import { DownloadButtons } from '@/components/downloads';
import { fulfilReference } from '@/lib/fulfil';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Welcome to GhostDesk', robots: { index: false } };

async function load(reference?: string) {
  if (!reference) return null;
  try { return await fulfilReference(reference); } catch (e) { console.error('welcome fulfil failed', e); return null; }
}

export default async function Welcome({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const q = await searchParams;
  const result = await load(q.reference ?? q.trxref);

  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 text-center">
      {result ? (
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">You’re in.</h1>
          {/* <p className="mt-3 text-mute">Your license key is below, and we’ve emailed a copy to {result.license.email}.</p> */}
          <p className="mt-3 text-mute">Your license key is below, Make sure to <b className="font-bold text-black text-2xl underline">copy</b> it, store it safely, paste the key when asked.</p>
          <CopyKey value={result.license.key} />
          <p className="mb-5 mt-6 text-mute">Download GhostDesk, open it and paste the key when asked. Keep the key private.</p>
          <DownloadButtons />
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">We’re confirming your payment</h1>
          <p className="mt-3 text-mute">If you’ve paid, your license key will arrive by email within a few minutes. Check your spam folder too. If nothing arrives, reply to that email or contact support with your payment reference.</p>
          <a href="/" className="mt-5 inline-block rounded-full border border-ink/20 px-6 py-3 font-semibold">Back to the site</a>
        </div>
      )}
    </main>
  );
}
