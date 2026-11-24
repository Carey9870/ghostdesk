// path: apps/web/src/app/api/analytics/leave/route.ts
// purpose: POST /api/analytics/leave. Stores how long a visitor stayed on a page (sent by the browser when the page is left).
import { z } from 'zod';
import { db } from '@/lib/db';
import { allow, clientIp } from '@/lib/http';

export const runtime = 'nodejs';

const body = z.object({ id: z.string().min(10).max(40), ms: z.number().int().min(0) });

export async function POST(req: Request) {
  if (!allow(`leave:${clientIp(req)}`, 120, 60_000)) return new Response(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 204 });
  const ms = Math.min(parsed.data.ms, 30 * 60_000); // cap at 30 minutes
  await db.pageView.updateMany({ where: { id: parsed.data.id, durationMs: { lt: ms } }, data: { durationMs: ms } });
  return new Response(null, { status: 204 });
}
