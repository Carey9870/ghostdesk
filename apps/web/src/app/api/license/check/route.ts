// path: apps/web/src/app/api/license/check/route.ts
// purpose: POST /api/license/check. The desktop app activates and refreshes a license here; a signed token is returned while the subscription is entitled.
import { LICENSE_KEY_PATTERN } from '@ghostdesk/shared';
import { z } from 'zod';
import { db } from '@/lib/db';
import { allow, clientIp, json } from '@/lib/http';
import { isEntitled, registerDevice, signToken } from '@/lib/license';

export const runtime = 'nodejs';

const body = z.object({ key: z.string().trim().toUpperCase().regex(LICENSE_KEY_PATTERN), deviceId: z.string().uuid() });

export async function POST(req: Request) {
  if (!allow(`license:${clientIp(req)}`, 30, 60_000)) return json({ error: 'Too many attempts. Try again in a minute.' }, 429);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'That license key isn’t valid.' }, 400);

  const license = await db.license.findUnique({ where: { key: parsed.data.key } });
  if (!license) return json({ error: 'That license key isn’t valid.' }, 404);
  if (!(await registerDevice(license.id, parsed.data.deviceId))) {
    return json({ error: 'This license is already used on 3 devices. Remove one by contacting support.' }, 409);
  }
  if (!isEntitled(license)) return json({ status: 'inactive' });

  const { token, exp } = signToken(license);
  return json({ status: 'active', token, plan: license.plan, expiresAt: exp.toISOString() });
}
