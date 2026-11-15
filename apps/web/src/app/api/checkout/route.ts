// path: apps/web/src/app/api/checkout/route.ts
// purpose: POST /api/checkout. Creates a Paystack subscription transaction server-side and returns the access code for the browser popup.
import { PLAN_IDS } from '@ghostdesk/shared';
import { z } from 'zod';
import { env } from '@/lib/env';
import { allow, clientIp, json } from '@/lib/http';
import { initializeTransaction } from '@/lib/paystack';

export const runtime = 'nodejs';

const body = z.object({ email: z.string().trim().toLowerCase().email().max(254), plan: z.enum(PLAN_IDS) });

export async function POST(req: Request) {
  if (!allow(`checkout:${clientIp(req)}`, 10, 60_000)) return json({ error: 'Too many attempts. Try again in a minute.' }, 429);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Enter a valid email address and choose a plan.' }, 400);
  try {
    const tx = await initializeTransaction({ ...parsed.data, callbackUrl: `${env().NEXT_PUBLIC_SITE_URL}/welcome` });
    return json({ accessCode: tx.access_code, reference: tx.reference });
  } catch (e) {
    console.error('checkout failed', e);
    return json({ error: 'We couldn’t start checkout. Try again in a moment.' }, 502);
  }
}
