// path: apps/web/src/app/api/analytics/event/route.ts
// purpose: POST /api/analytics/event. Records a funnel event from the browser (pricing opened, checkout started, download clicked).
import { z } from 'zod';
import { EVENT_NAMES, parseUa, visitorHash } from '@/lib/analytics';
import { db } from '@/lib/db';
import { allow, clientIp } from '@/lib/http';

export const runtime = 'nodejs';

const body = z.object({
  name: z.enum(EVENT_NAMES),
  sid: z.string().min(8).max(64).optional(),
  path: z.string().max(300).optional(),
  plan: z.enum(['weekly', 'yearly']).optional(),
  os: z.enum(['windows', 'macos', 'linux']).optional(),
});

export async function POST(req: Request) {
  const hash = visitorHash(req);
  if (!hash) return new Response(null, { status: 204 });
  if (!allow(`event:${clientIp(req)}`, 60, 60_000)) return new Response(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parseUa(req.headers.get('user-agent') ?? '').device === 'bot') return new Response(null, { status: 204 });
  const d = parsed.data;
  await db.analyticsEvent.create({ data: { name: d.name, visitorHash: hash, sessionId: d.sid, path: d.path, plan: d.plan, os: d.os } });
  return new Response(null, { status: 204 });
}
