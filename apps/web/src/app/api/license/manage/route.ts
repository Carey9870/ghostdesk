// path: apps/web/src/app/api/license/manage/route.ts
// purpose: POST /api/license/manage. Returns Paystack's hosted page where the customer updates their card or cancels the subscription.
import { LICENSE_KEY_PATTERN } from '@ghostdesk/shared';
import { z } from 'zod';
import { db } from '@/lib/db';
import { allow, clientIp, json } from '@/lib/http';
import { manageLink } from '@/lib/paystack';

export const runtime = 'nodejs';

const body = z.object({ key: z.string().trim().toUpperCase().regex(LICENSE_KEY_PATTERN) });

export async function POST(req: Request) {
  if (!allow(`manage:${clientIp(req)}`, 10, 60_000)) return json({ error: 'Too many attempts. Try again in a minute.' }, 429);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'That license key isn’t valid.' }, 400);
  const license = await db.license.findUnique({ where: { key: parsed.data.key } });
  if (!license?.subscriptionCode) return json({ error: 'No subscription is linked to this license yet. Try again in a few minutes.' }, 404);
  try {
    return json({ url: (await manageLink(license.subscriptionCode)).link });
  } catch (e) {
    console.error('manage link failed', e);
    return json({ error: 'Couldn’t open subscription management right now.' }, 502);
  }
}
