// path: apps/web/src/app/api/webhooks/paystack/route.ts
// purpose: POST /api/webhooks/paystack. Verifies the signature on the raw body, de-duplicates events and applies them to license state.
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/paystack';
import { handleEvent } from '@/lib/webhook';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  if (!verifyWebhookSignature(raw, req.headers)) return new Response('Invalid signature', { status: 401 });

  let event: { event: string; data: unknown };
  try { event = JSON.parse(raw.toString('utf8')); } catch { return new Response('Bad request', { status: 400 }); }

  // Claim the event first so concurrent retries are skipped; release the claim if processing fails so Paystack's retry works.
  const id = createHash('sha256').update(raw).digest('hex');
  try {
    await db.webhookEvent.create({ data: { id, type: event.event } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return new Response('OK', { status: 200 });
    throw e;
  }
  try {
    await handleEvent(event);
  } catch (e) {
    console.error('webhook failed', event.event, e);
    await db.webhookEvent.delete({ where: { id } }).catch(() => undefined);
    return new Response('Retry later', { status: 500 });
  }
  return new Response('OK', { status: 200 });
}
